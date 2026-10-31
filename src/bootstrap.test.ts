import { beforeEach, describe, expect, it, vi } from 'vitest';

type InputEventLike = {
	code?: string;
	movementX?: number;
	movementY?: number;
};

type ListenerMap = Map<string, (event?: InputEventLike) => void>;

const runtimeMocks = vi.hoisted(() => ({
	WORLD_WALLS: [
		{ x: 1, y: 2, z: 3, w: 4, h: 5, d: 6, kind: 'outer' as const },
		{ x: -1, y: 2, z: -3, w: 2, h: 4, d: 6, kind: 'inner' as const },
	],
	createInitialMovementKeys: vi.fn(() => ({
		KeyW: false,
		KeyA: false,
		KeyS: false,
		KeyD: false,
	})),
	createInitialJumpState: vi.fn(() => ({
		isGrounded: true,
		verticalVelocity: 0,
	})),
	handleJumpInput: vi.fn((state, code) => {
		if (code !== 'Space' || !state.isGrounded) {
			return state;
		}
		return { isGrounded: false, verticalVelocity: 5.2 };
	}),
	setMovementKeyState: vi.fn(),
	requestPointerLock: vi.fn(),
	handlePointerLockChange: vi.fn(() => ({ isLocked: true })),
	handleMouseMoveForLook: vi.fn(() => ({ yaw: 0, pitch: 0, updated: false })),
	applyFrameMovement: vi.fn(({ position }) => ({
		x: position.x,
		y: 1.6,
		z: position.z,
	})),
	applyViewportResize: vi.fn(),
	createRuntimeLogger: vi.fn((config?: { enabled?: boolean }) => ({
		isEnabled: config?.enabled ?? false,
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	})),
}));

const threeState = vi.hoisted(() => ({
	scenes: [] as Array<{ add: ReturnType<typeof vi.fn> }>,
	renderers: [] as Array<{
		options: unknown;
		domElement: { addEventListener: ReturnType<typeof vi.fn> };
		setSize: ReturnType<typeof vi.fn>;
		setPixelRatio: ReturnType<typeof vi.fn>;
		render: ReturnType<typeof vi.fn>;
	}>,
	cameras: [] as Array<{
		rotation: { set: ReturnType<typeof vi.fn> };
		position: {
			x: number;
			y: number;
			z: number;
			set: (x: number, y: number, z: number) => void;
		};
		aspect: number;
		updateProjectionMatrix: ReturnType<typeof vi.fn>;
	}>,
	clocks: [] as Array<{ getDelta: ReturnType<typeof vi.fn> }>,
}));

vi.mock('./runtime/fpsRuntime', () => ({
	WORLD_WALLS: runtimeMocks.WORLD_WALLS,
	createInitialMovementKeys: runtimeMocks.createInitialMovementKeys,
	createInitialJumpState: runtimeMocks.createInitialJumpState,
	handleJumpInput: runtimeMocks.handleJumpInput,
	setMovementKeyState: runtimeMocks.setMovementKeyState,
	requestPointerLock: runtimeMocks.requestPointerLock,
	handlePointerLockChange: runtimeMocks.handlePointerLockChange,
	handleMouseMoveForLook: runtimeMocks.handleMouseMoveForLook,
	applyFrameMovement: runtimeMocks.applyFrameMovement,
	applyViewportResize: runtimeMocks.applyViewportResize,
	createRuntimeLogger: runtimeMocks.createRuntimeLogger,
}));

vi.mock('three', () => {
	class Scene {
		add = vi.fn();
		background: unknown;
		constructor() {
			threeState.scenes.push(this);
		}
	}

	class Color {
		constructor(public value: number) {
			void value;
		}
	}

	class PerspectiveCamera {
		aspect: number;
		rotation = { set: vi.fn() };
		position = {
			x: 0,
			y: 0,
			z: 0,
			set: (x: number, y: number, z: number) => {
				this.position.x = x;
				this.position.y = y;
				this.position.z = z;
			},
		};
		updateProjectionMatrix = vi.fn();

		constructor(_fov: number, aspect: number, _near: number, _far: number) {
			void _near;
			void _far;
			this.aspect = aspect;
			threeState.cameras.push(this);
		}
	}

	class WebGLRenderer {
		options: unknown;
		domElement = {
			addEventListener: vi.fn(),
		};
		setSize = vi.fn();
		setPixelRatio = vi.fn();
		render = vi.fn();

		constructor(options: unknown) {
			this.options = options;
			threeState.renderers.push(this);
		}
	}

	class HemisphereLight {
		constructor(_sky: number, _ground: number, _intensity: number) {
			void _sky;
			void _ground;
			void _intensity;
		}
	}

	class DirectionalLight {
		position = { set: vi.fn() };
		constructor(_color: number, _intensity: number) {
			void _color;
			void _intensity;
		}
	}

	class PlaneGeometry {
		constructor(_w: number, _h: number) {
			void _w;
			void _h;
		}
	}

	class BoxGeometry {
		constructor(_w: number, _h: number, _d: number) {
			void _w;
			void _h;
			void _d;
		}
	}

	class MeshStandardMaterial {
		constructor(_options: unknown) {
			void _options;
		}
	}

	class Mesh {
		position = { set: vi.fn() };
		rotation = { x: 0 };
		constructor(_geometry: unknown, _material: unknown) {
			void _geometry;
			void _material;
		}
	}

	class Clock {
		getDelta = vi.fn(() => 0.016);
		constructor() {
			threeState.clocks.push(this);
		}
	}

	return {
		Scene,
		Color,
		PerspectiveCamera,
		WebGLRenderer,
		HemisphereLight,
		DirectionalLight,
		PlaneGeometry,
		BoxGeometry,
		MeshStandardMaterial,
		Mesh,
		Clock,
	};
});

describe('bootstrap runtime wiring', () => {
	let documentListeners: ListenerMap;
	let windowListeners: ListenerMap;

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();

		threeState.scenes.length = 0;
		threeState.renderers.length = 0;
		threeState.cameras.length = 0;
		threeState.clocks.length = 0;

		documentListeners = new Map();
		windowListeners = new Map();

		const documentStub = {
			pointerLockElement: null,
			body: {
				appendChild: vi.fn(),
			},
			addEventListener: vi.fn(
				(type: string, handler: (event?: InputEventLike) => void) => {
					documentListeners.set(type, handler);
				},
			),
		};

		const windowStub = {
			innerWidth: 1920,
			innerHeight: 1080,
			devicePixelRatio: 3,
			location: { search: '?debugLogging=1' },
			addEventListener: vi.fn(
				(type: string, handler: (event?: InputEventLike) => void) => {
					windowListeners.set(type, handler);
				},
			),
		};

		Object.assign(globalThis, {
			document: documentStub,
			window: windowStub,
			requestAnimationFrame: vi.fn(),
		});
	});

	it('enables debug runtime logging from query string and wires sink levels', async () => {
		const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await import('./app/bootstrap');

		expect(runtimeMocks.createRuntimeLogger).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: true, sink: expect.any(Function) }),
		);

		const loggerConfig = runtimeMocks.createRuntimeLogger.mock
			.calls[0]?.[0] as {
			sink: (entry: {
				level: string;
				event: string;
				context?: unknown;
			}) => void;
		};

		loggerConfig.sink({
			level: 'debug',
			event: 'evt.debug',
			context: { a: 1 },
		});
		loggerConfig.sink({
			level: 'error',
			event: 'evt.error',
			context: { b: 2 },
		});

		expect(debugSpy).toHaveBeenCalledWith('[runtime] evt.debug', { a: 1 });
		expect(errorSpy).toHaveBeenCalledWith('[runtime] evt.error', { b: 2 });
	});

	it('initializes renderer and scene primitives with expected values', async () => {
		await import('./app/bootstrap');

		const renderer = threeState.renderers[0];
		expect(renderer.options).toEqual({ antialias: true });
		expect(renderer.setSize).toHaveBeenCalledWith(1920, 1080);
		expect(renderer.setPixelRatio).toHaveBeenCalledWith(2);

		const scene = threeState.scenes[0];
		expect(scene.add).toHaveBeenCalledTimes(5);
	});

	it('registers input handlers and delegates runtime helpers', async () => {
		runtimeMocks.handleMouseMoveForLook
			.mockReturnValueOnce({ yaw: 1, pitch: 2, updated: true })
			.mockReturnValueOnce({ yaw: 3, pitch: 4, updated: true });

		await import('./app/bootstrap');

		documentListeners.get('keydown')?.({ code: 'KeyW' });
		expect(runtimeMocks.setMovementKeyState).toHaveBeenCalledWith(
			expect.any(Object),
			'KeyW',
			true,
			expect.any(Object),
		);

		documentListeners.get('keyup')?.({ code: 'KeyA' });
		expect(runtimeMocks.setMovementKeyState).toHaveBeenCalledWith(
			expect.any(Object),
			'KeyA',
			false,
			expect.any(Object),
		);

		const renderer = threeState.renderers[0];
		const clickHandler = renderer.domElement.addEventListener.mock
			.calls[0]?.[1] as (() => void) | undefined;
		clickHandler?.();
		expect(runtimeMocks.requestPointerLock).toHaveBeenCalledWith(
			renderer.domElement,
			expect.any(Object),
		);

		(
			globalThis.document as { pointerLockElement: unknown }
		).pointerLockElement = renderer.domElement;
		documentListeners.get('pointerlockchange')?.();
		expect(runtimeMocks.handlePointerLockChange).toHaveBeenCalledWith({
			pointerLockElement: renderer.domElement,
			rendererElement: renderer.domElement,
			logger: expect.any(Object),
		});

		documentListeners.get('mousemove')?.({ movementX: 10, movementY: -10 });
		documentListeners.get('mousemove')?.({ movementX: 1, movementY: -1 });

		expect(runtimeMocks.handleMouseMoveForLook).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				yaw: 0,
				pitch: 0,
				movementX: 10,
				movementY: -10,
			}),
		);
		expect(runtimeMocks.handleMouseMoveForLook).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				yaw: 1,
				pitch: 2,
				movementX: 1,
				movementY: -1,
			}),
		);
	});

	it('runs one animation frame, renders, and wires resize handling', async () => {
		runtimeMocks.applyFrameMovement.mockReturnValueOnce({ x: 7, y: 8, z: 9 });

		await import('./app/bootstrap');

		expect(globalThis.requestAnimationFrame).toHaveBeenCalledWith(
			expect.any(Function),
		);
		expect(runtimeMocks.applyFrameMovement).toHaveBeenCalledWith(
			expect.objectContaining({
				dt: 0.016,
				moveSpeed: 5,
				playerHeight: 1.6,
				logger: expect.any(Object),
			}),
		);

		const renderer = threeState.renderers[0];
		const camera = threeState.cameras[0];
		expect(camera.position.x).toBe(7);
		expect(camera.position.y).toBe(8);
		expect(camera.position.z).toBe(9);
		expect(renderer.render).toHaveBeenCalledWith(threeState.scenes[0], camera);

		windowListeners.get('resize')?.();
		expect(runtimeMocks.applyViewportResize).toHaveBeenCalledWith(
			camera,
			renderer,
			1920,
			1080,
		);
	});
});
