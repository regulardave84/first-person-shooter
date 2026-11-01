import { beforeEach, describe, expect, it, vi } from 'vitest';

type InputEventLike = {
	code?: string;
	movementX?: number;
	movementY?: number;
	button?: number;
};

type ListenerMap = Map<string, (event?: InputEventLike) => void>;

type ElementWithId = {
	id: string;
	tagName: string;
	classList: {
		add: (...tokens: string[]) => void;
		remove: (...tokens: string[]) => void;
		contains: (token: string) => boolean;
	};
	appendChild: ReturnType<typeof vi.fn>;
	setAttribute: ReturnType<typeof vi.fn>;
	removeAttribute: ReturnType<typeof vi.fn>;
	getAttribute: ReturnType<typeof vi.fn>;
	children: ElementWithId[];
	clientWidth: number;
	src: string;
	alt: string;
	decoding: 'async' | 'auto' | 'sync';
	onload: ((event: Event) => void) | null;
	onerror: ((event: string | Event) => void) | null;
};

type DocumentStub = {
	pointerLockElement: unknown;
	body: ElementWithId;
	addEventListener: ReturnType<typeof vi.fn>;
	createElement: ReturnType<typeof vi.fn>;
	getElementById: ReturnType<typeof vi.fn>;
	elementsById: Map<string, ElementWithId>;
};

function createDocumentStub(documentListeners: ListenerMap): DocumentStub {
	const elementsById = new Map<string, ElementWithId>();

	const createClassList = () => {
		const values = new Set<string>();
		return {
			add: (...tokens: string[]) => {
				for (const token of tokens) {
					values.add(token);
				}
			},
			remove: (...tokens: string[]) => {
				for (const token of tokens) {
					values.delete(token);
				}
			},
			contains: (token: string) => values.has(token),
		};
	};

	const createElement = vi.fn((tagName: string) => {
		const attributes = new Map<string, string>();
		let currentId = '';
		const element = {
			tagName: tagName.toUpperCase(),
			classList: createClassList(),
			appendChild: vi.fn((child: ElementWithId) => {
				element.children.push(child);
				if (child.id) {
					elementsById.set(child.id, child);
				}
				return child;
			}),
			setAttribute: vi.fn((name: string, value: string) => {
				attributes.set(name, value);
				if (name === 'id') {
					element.id = value;
				}
			}),
			removeAttribute: vi.fn((name: string) => {
				attributes.delete(name);
			}),
			getAttribute: vi.fn((name: string) => attributes.get(name) ?? null),
			children: [] as ElementWithId[],
			clientWidth: 320,
			src: '',
			alt: '',
			decoding: 'auto' as const,
			onload: null,
			onerror: null,
		} as ElementWithId;

		Object.defineProperty(element, 'id', {
			get: () => currentId,
			set: (value: string) => {
				currentId = value;
				if (value) {
					elementsById.set(value, element);
				}
			},
			enumerable: true,
			configurable: true,
		});

		return element;
	});

	const body = createElement('body');

	return {
		pointerLockElement: null,
		body,
		addEventListener: vi.fn(
			(type: string, handler: (event?: InputEventLike) => void) => {
				documentListeners.set(type, handler);
			},
		),
		createElement,
		getElementById: vi.fn((id: string) => elementsById.get(id) ?? null),
		elementsById,
	};
}

const runtimeMocks = vi.hoisted(() => ({
	RUN_SPEED_MULTIPLIER: 2,
	WORLD_WALLS: [
		{ x: 1, y: 2, z: 3, w: 4, h: 5, d: 12, kind: 'outer' as const },
		{ x: -1, y: 2, z: -3, w: 2, h: 4, d: 6, kind: 'inner' as const },
	],
	createInitialMovementKeys: vi.fn(() => ({
		KeyW: false,
		KeyA: false,
		KeyS: false,
		KeyD: false,
	})),
	createInitialRunKeys: vi.fn(() => ({
		ShiftLeft: false,
		ShiftRight: false,
	})),
	isRunActive: vi.fn(
		(keys: { ShiftLeft: boolean; ShiftRight: boolean }) =>
			keys.ShiftLeft || keys.ShiftRight,
	),
	createInitialJumpState: vi.fn(() => ({
		isGrounded: true,
		verticalVelocity: 0,
	})),
	createInitialPrimaryFireState: vi.fn(() => ({
		isPrimaryHeld: false,
		hasQueuedImmediateShot: false,
		secondsUntilNextShot: 0,
		nextProjectileId: 1,
	})),
	createBulletFireSoundPlayer: vi.fn(() => ({
		play: vi.fn(),
	})),
	handleJumpInput: vi.fn((state, code) => {
		if (code !== 'Space' || !state.isGrounded) {
			return state;
		}
		return { isGrounded: false, verticalVelocity: 5.2 };
	}),
	setPrimaryFirePressedState: vi.fn((state) => state),
	playBulletFireSounds: vi.fn(),
	advancePrimaryFireState: vi.fn((params: { state: unknown }) => ({
		state: params.state,
		shotsToSpawn: 0,
	})),
	spawnProjectilesFromLook: vi.fn((params: { state: unknown }) => ({
		state: params.state,
		projectiles: [] as unknown[],
	})),
	stepProjectiles: vi.fn(
		() =>
			({ activeProjectiles: [] as unknown[], impacts: [] as unknown[] }) as {
				activeProjectiles: unknown[];
				impacts: unknown[];
			},
	),
	WORLD_PROJECTILE_COLLIDERS: [],
	PROJECTILE_COLOR: 0xffffff,
	createJumpSoundPlayer: vi.fn(() => ({
		play: vi.fn(),
	})),
	setRunKeyState: vi.fn(
		(
			keys: { ShiftLeft: boolean; ShiftRight: boolean },
			code: string,
			isPressed: boolean,
		) => {
			if (code === 'ShiftLeft' || code === 'ShiftRight') {
				keys[code] = isPressed;
			}
		},
	),
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
	scenes: [] as Array<{
		add: ReturnType<typeof vi.fn>;
		remove: ReturnType<typeof vi.fn>;
		background?: unknown;
	}>,
	meshStandardMaterialOptions: [] as unknown[],
	meshStandardMaterials: [] as Array<{
		color: {
			setHex: ReturnType<typeof vi.fn>;
			getHex: () => number;
		};
		map: unknown;
		needsUpdate: boolean;
	}>,
	meshBasicMaterialOptions: [] as unknown[],
	lineBasicMaterialOptions: [] as unknown[],
	textureLoadCalls: [] as string[],
	loadedTextures: [] as Array<{
		wrapS?: unknown;
		wrapT?: unknown;
		repeat: { set: ReturnType<typeof vi.fn> };
	}>,
	failTextureLoad: false,
	vectors: [] as Array<{ x: number; y: number; z: number }>,
	bufferGeometries: [] as Array<{
		setFromPoints: ReturnType<typeof vi.fn>;
		dispose: ReturnType<typeof vi.fn>;
	}>,
	meshes: [] as Array<{
		rotation: { x: number };
		geometry: unknown;
		material: unknown;
	}>,
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
	RUN_SPEED_MULTIPLIER: runtimeMocks.RUN_SPEED_MULTIPLIER,
	WORLD_WALLS: runtimeMocks.WORLD_WALLS,
	createInitialMovementKeys: runtimeMocks.createInitialMovementKeys,
	createInitialRunKeys: runtimeMocks.createInitialRunKeys,
	isRunActive: runtimeMocks.isRunActive,
	createInitialJumpState: runtimeMocks.createInitialJumpState,
	createInitialPrimaryFireState: runtimeMocks.createInitialPrimaryFireState,
	createBulletFireSoundPlayer: runtimeMocks.createBulletFireSoundPlayer,
	handleJumpInput: runtimeMocks.handleJumpInput,
	setPrimaryFirePressedState: runtimeMocks.setPrimaryFirePressedState,
	playBulletFireSounds: runtimeMocks.playBulletFireSounds,
	advancePrimaryFireState: runtimeMocks.advancePrimaryFireState,
	spawnProjectilesFromLook: runtimeMocks.spawnProjectilesFromLook,
	stepProjectiles: runtimeMocks.stepProjectiles,
	WORLD_PROJECTILE_COLLIDERS: runtimeMocks.WORLD_PROJECTILE_COLLIDERS,
	PROJECTILE_COLOR: runtimeMocks.PROJECTILE_COLOR,
	createJumpSoundPlayer: runtimeMocks.createJumpSoundPlayer,
	setRunKeyState: runtimeMocks.setRunKeyState,
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
		remove = vi.fn();
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
		private colorHex: number;
		color: {
			setHex: ReturnType<typeof vi.fn>;
			getHex: () => number;
		};
		map: unknown = null;
		needsUpdate = false;

		constructor(options: unknown) {
			threeState.meshStandardMaterialOptions.push(options);
			const hexColor =
				typeof options === 'object' &&
				options !== null &&
				'color' in options &&
				typeof (options as { color?: unknown }).color === 'number'
					? ((options as { color: number }).color ?? 0xffffff)
					: 0xffffff;
			this.colorHex = hexColor;
			this.color = {
				setHex: vi.fn((value: number) => {
					this.colorHex = value;
				}),
				getHex: () => this.colorHex,
			};
			threeState.meshStandardMaterials.push(this);
		}
	}

	class MeshBasicMaterial {
		constructor(options: unknown) {
			threeState.meshBasicMaterialOptions.push(options);
		}
	}

	class LineBasicMaterial {
		constructor(options: unknown) {
			threeState.lineBasicMaterialOptions.push(options);
		}
	}

	class Vector3 {
		constructor(
			public x: number,
			public y: number,
			public z: number,
		) {
			threeState.vectors.push({ x, y, z });
		}
	}

	class BufferGeometry {
		setFromPoints = vi.fn(() => this);
		dispose = vi.fn();
		constructor() {
			threeState.bufferGeometries.push(this);
		}
	}

	class Line {
		geometry: BufferGeometry;
		constructor(geometry: BufferGeometry, _material: unknown) {
			this.geometry = geometry;
			void _material;
		}
	}

	class Mesh {
		position = { set: vi.fn() };
		rotation = { x: 0 };
		constructor(
			public geometry: unknown,
			public material: unknown,
		) {
			threeState.meshes.push(this);
		}
	}

	class TextureLoader {
		load = vi.fn(
			(
				url: string,
				onLoad?: (texture: {
					wrapS?: unknown;
					wrapT?: unknown;
					repeat: { set: ReturnType<typeof vi.fn> };
				}) => void,
				_onProgress?: unknown,
				onError?: () => void,
			) => {
				threeState.textureLoadCalls.push(url);
				if (threeState.failTextureLoad) {
					onError?.();
					return undefined;
				}

				const texture = {
					repeat: { set: vi.fn() },
				};
				threeState.loadedTextures.push(texture);
				onLoad?.(texture);
				return texture;
			},
		);
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
		MeshBasicMaterial,
		LineBasicMaterial,
		Vector3,
		BufferGeometry,
		Line,
		Mesh,
		TextureLoader,
		BackSide: 'BackSide',
		ClampToEdgeWrapping: 'ClampToEdgeWrapping',
		RepeatWrapping: 'RepeatWrapping',
		Clock,
	};
});

function expectTextureLoadOrder(expectedFragments: string[]): void {
	expect(threeState.textureLoadCalls).toHaveLength(expectedFragments.length);
	for (const [index, fragment] of expectedFragments.entries()) {
		expect(threeState.textureLoadCalls[index]).toContain(fragment);
	}
}

function getRuntimeWarnMock(): ReturnType<typeof vi.fn> {
	return (
		runtimeMocks.createRuntimeLogger.mock.results[0]?.value as {
			warn: ReturnType<typeof vi.fn>;
		}
	).warn;
}

function expectMaterialTextureSuccess(materialIndex: number): void {
	expect(
		threeState.meshStandardMaterials[materialIndex]?.color.setHex,
	).toHaveBeenCalledWith(0xffffff);
	expect(threeState.meshStandardMaterials[materialIndex]?.needsUpdate).toBe(
		true,
	);
}

function expectMaterialTextureFallback(
	materialIndex: number,
	fallbackColor: number,
): void {
	expect(
		threeState.meshStandardMaterials[materialIndex]?.color.setHex,
	).toHaveBeenCalledWith(fallbackColor);
	expect(threeState.meshStandardMaterials[materialIndex]?.map).toBeNull();
	expect(threeState.meshStandardMaterials[materialIndex]?.needsUpdate).toBe(
		true,
	);
}

function expectFloorAndWallTextureSuccessState(): void {
	expect(threeState.loadedTextures[0]?.repeat.set).toHaveBeenCalledWith(1, 1);
	expect(threeState.loadedTextures[1]?.repeat.set).toHaveBeenCalledWith(8, 8);
	expect(threeState.loadedTextures[2]?.repeat.set).toHaveBeenCalledWith(4, 2);
	expect(threeState.loadedTextures[3]?.repeat.set).toHaveBeenCalledWith(2, 2);
	expectMaterialTextureSuccess(0);
	expectMaterialTextureSuccess(1);
	expectMaterialTextureSuccess(2);
}

function expectFloorAndWallTextureFallbackState(): void {
	expectMaterialTextureFallback(0, 0x334155);
	expectMaterialTextureFallback(1, 0x64748b);
	expectMaterialTextureFallback(2, 0x64748b);

	const warn = getRuntimeWarnMock();
	expect(warn).toHaveBeenCalledWith(
		'floor.texture.load.failed',
		expect.objectContaining({ fallbackColor: 0x334155 }),
	);
	expect(warn).toHaveBeenCalledWith(
		'wall.texture.load.failed',
		expect.objectContaining({ fallbackColor: 0x64748b }),
	);
	expect(warn).toHaveBeenCalledWith(
		'ceiling.skybox.texture.load.failed',
		expect.objectContaining({
			textureUrl: expect.stringContaining('ceiling-sky.png'),
			fallbackColor: 0x0b1020,
		}),
	);
}

describe('bootstrap runtime wiring', () => {
	let documentListeners: ListenerMap;
	let windowListeners: ListenerMap;
	let documentStub: DocumentStub;

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();

		threeState.scenes.length = 0;
		threeState.meshStandardMaterialOptions.length = 0;
		threeState.meshStandardMaterials.length = 0;
		threeState.meshBasicMaterialOptions.length = 0;
		threeState.lineBasicMaterialOptions.length = 0;
		threeState.textureLoadCalls.length = 0;
		threeState.loadedTextures.length = 0;
		threeState.failTextureLoad = false;
		threeState.vectors.length = 0;
		threeState.bufferGeometries.length = 0;
		threeState.meshes.length = 0;
		threeState.renderers.length = 0;
		threeState.cameras.length = 0;
		threeState.clocks.length = 0;

		documentListeners = new Map();
		windowListeners = new Map();
		documentStub = createDocumentStub(documentListeners);

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

	it('disables debug runtime logging when query string is not enabled', async () => {
		(globalThis.window as { location: { search: string } }).location.search =
			'?debugLogging=0';

		await import('./app/bootstrap');

		expect(runtimeMocks.createRuntimeLogger).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: false }),
		);
	});

	it('initializes renderer and scene primitives with expected values', async () => {
		await import('./app/bootstrap');

		const renderer = threeState.renderers[0];
		expect(renderer.options).toEqual({ antialias: true });
		expect(renderer.setSize).toHaveBeenCalledWith(1920, 1080);
		expect(renderer.setPixelRatio).toHaveBeenCalledWith(2);

		const scene = threeState.scenes[0];
		expect(scene.add).toHaveBeenCalledTimes(6);
		const skyboxMesh = threeState.meshes.find(
			(mesh) =>
				typeof mesh === 'object' &&
				mesh !== null &&
				Array.isArray(mesh.material),
		) as ({ name?: string } & { material: unknown[] }) | undefined;
		expect(skyboxMesh?.name).toBe('default-world-ceiling-skybox');
		expect(skyboxMesh?.material).toHaveLength(6);
		expect(threeState.cameras[0].aspect).toBeCloseTo(1920 / 1080);
		expect(threeState.meshStandardMaterialOptions).toEqual([
			{ color: 0x334155 },
			{ color: 0x64748b },
			{ color: 0x64748b },
		]);
		expectTextureLoadOrder([
			'ceiling-sky.png',
			'floor-concrete.png',
			'wall-brick.png',
			'wall-brick.png',
		]);
		expect(threeState.meshBasicMaterialOptions).toHaveLength(6);
		expect(
			threeState.meshBasicMaterialOptions.every(
				(options) =>
					typeof options === 'object' &&
					options !== null &&
					'map' in (options as Record<string, unknown>),
			),
		).toBe(true);
		expectFloorAndWallTextureSuccessState();
		expect(threeState.meshes[0]?.rotation.x).toBeCloseTo(-Math.PI / 2);
		expect(threeState.lineBasicMaterialOptions).toEqual([{ color: 0xffffff }]);
		const weaponHudRoot = documentStub.elementsById.get('weapon-hud');
		expect(weaponHudRoot).toBeDefined();
		expect(weaponHudRoot?.classList.contains('weapon-hud')).toBe(true);
		expect(documentStub.elementsById.get('weapon-hud-image')).toBeDefined();
	});

	it('keeps current floor and wall colors when texture load fails', async () => {
		threeState.failTextureLoad = true;

		await import('./app/bootstrap');

		const scene = threeState.scenes[0];
		expect(scene.add).toHaveBeenCalledTimes(5);
		expectTextureLoadOrder([
			'ceiling-sky.png',
			'floor-concrete.png',
			'wall-brick.png',
			'wall-brick.png',
		]);
		expect(threeState.meshBasicMaterialOptions).toHaveLength(0);
		expectFloorAndWallTextureFallbackState();
		expect((scene.background as { value: number }).value).toBe(0x0b1020);
	});

	it('registers click handler on renderer canvas for pointer lock request', async () => {
		await import('./app/bootstrap');

		const renderer = threeState.renderers[0];
		expect(renderer.domElement.addEventListener.mock.calls[0]?.[0]).toBe(
			'click',
		);
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

	it('delegates shift keydown and keyup to run key state helper', async () => {
		await import('./app/bootstrap');

		documentListeners.get('keydown')?.({ code: 'ShiftLeft' });
		documentListeners.get('keyup')?.({ code: 'ShiftRight' });

		expect(runtimeMocks.setRunKeyState).toHaveBeenCalledWith(
			expect.any(Object),
			'ShiftLeft',
			true,
			expect.any(Object),
		);
		expect(runtimeMocks.setRunKeyState).toHaveBeenCalledWith(
			expect.any(Object),
			'ShiftRight',
			false,
			expect.any(Object),
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
		expect(runtimeMocks.spawnProjectilesFromLook).not.toHaveBeenCalled();
		expect(runtimeMocks.playBulletFireSounds).not.toHaveBeenCalled();
		expect(
			documentStub.elementsById
				.get('weapon-hud')
				?.classList.contains('weapon-hud--recoil'),
		).toBe(false);
		expect(runtimeMocks.stepProjectiles).toHaveBeenCalledWith(
			expect.objectContaining({
				projectiles: [],
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

	it('keeps run-speed multiplier in air when Shift is released after jump takeoff', async () => {
		await import('./app/bootstrap');

		documentListeners.get('keydown')?.({ code: 'ShiftLeft' });
		documentListeners.get('keydown')?.({ code: 'Space' });

		const firstScheduledFrame = (
			globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>
		).mock.calls[0]?.[0] as (() => void) | undefined;
		firstScheduledFrame?.();

		expect(runtimeMocks.applyFrameMovement).toHaveBeenLastCalledWith(
			expect.objectContaining({ moveSpeed: 10 }),
		);

		documentListeners.get('keyup')?.({ code: 'ShiftLeft' });

		const secondScheduledFrame = (
			globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>
		).mock.calls[1]?.[0] as (() => void) | undefined;
		secondScheduledFrame?.();

		expect(runtimeMocks.applyFrameMovement).toHaveBeenLastCalledWith(
			expect.objectContaining({ moveSpeed: 10 }),
		);
	});

	it('handles primary fire input, pointer-lock gating, and projectile frame updates', async () => {
		runtimeMocks.advancePrimaryFireState.mockReturnValueOnce({
			state: {
				isPrimaryHeld: true,
				hasQueuedImmediateShot: false,
				secondsUntilNextShot: 0.5,
				nextProjectileId: 1,
			},
			shotsToSpawn: 1,
		});
		runtimeMocks.spawnProjectilesFromLook.mockReturnValueOnce({
			state: {
				isPrimaryHeld: true,
				hasQueuedImmediateShot: false,
				secondsUntilNextShot: 0.5,
				nextProjectileId: 2,
			},
			projectiles: [
				{
					id: 1,
					head: { x: 0, y: 1.6, z: 0 },
					direction: { x: 0, y: 0, z: -1 },
					speed: 45,
					length: 0.35,
					color: 0xffffff,
				},
			],
		});
		runtimeMocks.stepProjectiles.mockReturnValueOnce({
			activeProjectiles: [
				{
					id: 1,
					head: { x: 0, y: 1.6, z: -0.5 },
					direction: { x: 0, y: 0, z: -1 },
					speed: 45,
					length: 0.35,
					color: 0xffffff,
				},
			],
			impacts: [
				{
					projectileId: 1,
					point: { x: 0, y: 1.6, z: -1 },
					colliderKind: 'wall',
				},
			],
		});

		await import('./app/bootstrap');

		const renderer = threeState.renderers[0];
		(
			globalThis.document as { pointerLockElement: unknown }
		).pointerLockElement = renderer.domElement;

		documentListeners.get('mousedown')?.({ button: 0 });
		expect(runtimeMocks.setPrimaryFirePressedState).toHaveBeenCalledWith(
			expect.any(Object),
			true,
			true,
		);

		documentListeners.get('mouseup')?.({ button: 0 });
		expect(runtimeMocks.setPrimaryFirePressedState).toHaveBeenCalledWith(
			expect.any(Object),
			false,
			true,
		);

		(
			globalThis.document as { pointerLockElement: unknown }
		).pointerLockElement = null;
		documentListeners.get('pointerlockchange')?.();
		expect(runtimeMocks.setPrimaryFirePressedState).toHaveBeenCalledWith(
			expect.any(Object),
			false,
			false,
		);

		expect(runtimeMocks.advancePrimaryFireState).toHaveBeenCalledWith(
			expect.objectContaining({
				dt: 0.016,
				isPointerLockActive: false,
			}),
		);
		expect(runtimeMocks.playBulletFireSounds).toHaveBeenCalledWith(
			expect.any(Object),
			1,
		);
		expect(
			documentStub.elementsById
				.get('weapon-hud')
				?.classList.contains('weapon-hud--recoil'),
		).toBe(true);
		expect(runtimeMocks.spawnProjectilesFromLook).toHaveBeenCalledWith(
			expect.objectContaining({
				count: 1,
				origin: expect.objectContaining({ x: expect.any(Number) }),
			}),
		);
		expect(runtimeMocks.stepProjectiles).toHaveBeenCalledWith(
			expect.objectContaining({
				worldColliders: runtimeMocks.WORLD_PROJECTILE_COLLIDERS,
				entityColliders: [],
			}),
		);
	});

	it('routes Space key through jump flow only and ignores jump on keyup', async () => {
		const jumpSoundPlayer = { play: vi.fn() };
		runtimeMocks.createJumpSoundPlayer.mockReturnValueOnce(jumpSoundPlayer);
		runtimeMocks.handleJumpInput.mockReturnValueOnce({
			isGrounded: false,
			verticalVelocity: 5.2,
		});

		await import('./app/bootstrap');

		documentListeners.get('keydown')?.({ code: 'Space' });
		expect(runtimeMocks.handleJumpInput).toHaveBeenCalledWith(
			expect.any(Object),
			'Space',
		);
		expect(jumpSoundPlayer.play).toHaveBeenCalledTimes(1);
		expect(runtimeMocks.setMovementKeyState).not.toHaveBeenCalledWith(
			expect.any(Object),
			'Space',
			true,
			expect.any(Object),
		);

		documentListeners.get('keyup')?.({ code: 'Space' });
		expect(runtimeMocks.setMovementKeyState).not.toHaveBeenCalledWith(
			expect.any(Object),
			'Space',
			false,
			expect.any(Object),
		);
	});

	it('does not play jump sound when jump input returns the same state', async () => {
		const jumpSoundPlayer = { play: vi.fn() };
		runtimeMocks.createJumpSoundPlayer.mockReturnValueOnce(jumpSoundPlayer);
		runtimeMocks.handleJumpInput.mockImplementation((state) => state);

		await import('./app/bootstrap');

		documentListeners.get('keydown')?.({ code: 'Space' });
		expect(jumpSoundPlayer.play).not.toHaveBeenCalled();
	});

	it('ignores non-left mouse buttons for firing state updates', async () => {
		await import('./app/bootstrap');

		documentListeners.get('mousedown')?.({ button: 1 });
		documentListeners.get('mouseup')?.({ button: 2 });

		expect(runtimeMocks.setPrimaryFirePressedState).not.toHaveBeenCalledWith(
			expect.any(Object),
			true,
			expect.any(Boolean),
		);
		expect(runtimeMocks.setPrimaryFirePressedState).not.toHaveBeenCalledWith(
			expect.any(Object),
			false,
			expect.any(Boolean),
		);
	});

	it('updates existing projectile line geometry and removes impacted visuals', async () => {
		runtimeMocks.advancePrimaryFireState.mockReturnValueOnce({
			state: {
				isPrimaryHeld: true,
				hasQueuedImmediateShot: false,
				secondsUntilNextShot: 0.5,
				nextProjectileId: 2,
			},
			shotsToSpawn: 1,
		});
		runtimeMocks.spawnProjectilesFromLook.mockReturnValueOnce({
			state: {
				isPrimaryHeld: true,
				hasQueuedImmediateShot: false,
				secondsUntilNextShot: 0.5,
				nextProjectileId: 2,
			},
			projectiles: [
				{
					id: 1,
					head: { x: 0, y: 1.6, z: 0 },
					direction: { x: 0, y: 0, z: -1 },
					speed: 45,
					length: 0.35,
					color: 0xffffff,
				},
			],
		});
		runtimeMocks.stepProjectiles
			.mockReturnValueOnce({
				activeProjectiles: [
					{
						id: 1,
						head: { x: 0, y: 1.6, z: -0.3 },
						direction: { x: 0, y: 0, z: -1 },
						speed: 45,
						length: 0.35,
						color: 0xffffff,
					},
				],
				impacts: [],
			})
			.mockReturnValueOnce({
				activeProjectiles: [],
				impacts: [
					{
						projectileId: 1,
						point: { x: 0, y: 1.6, z: -0.6 },
						colliderKind: 'wall',
					},
				],
			});

		await import('./app/bootstrap');

		const animationFn = (
			globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>
		).mock.calls[0]?.[0] as (() => void) | undefined;
		animationFn?.();

		const scene = threeState.scenes[0];
		expect(scene.add).toHaveBeenCalled();
		expect(scene.remove).toHaveBeenCalled();
	});

	it('reuses existing projectile visual and updates points from tail-to-head math', async () => {
		runtimeMocks.advancePrimaryFireState.mockReturnValueOnce({
			state: {
				isPrimaryHeld: true,
				hasQueuedImmediateShot: false,
				secondsUntilNextShot: 0.5,
				nextProjectileId: 2,
			},
			shotsToSpawn: 1,
		});
		runtimeMocks.spawnProjectilesFromLook.mockReturnValueOnce({
			state: {
				isPrimaryHeld: true,
				hasQueuedImmediateShot: false,
				secondsUntilNextShot: 0.5,
				nextProjectileId: 2,
			},
			projectiles: [
				{
					id: 1,
					head: { x: 0, y: 1.6, z: -0.3 },
					direction: { x: 0, y: 0, z: -1 },
					speed: 45,
					length: 0.35,
					color: 0xffffff,
				},
			],
		});
		runtimeMocks.stepProjectiles
			.mockReturnValueOnce({
				activeProjectiles: [
					{
						id: 1,
						head: { x: 0, y: 1.6, z: -0.3 },
						direction: { x: 0, y: 0, z: -1 },
						speed: 45,
						length: 0.35,
						color: 0xffffff,
					},
				],
				impacts: [],
			})
			.mockReturnValueOnce({
				activeProjectiles: [
					{
						id: 1,
						head: { x: 0, y: 1.6, z: -0.6 },
						direction: { x: 0, y: 0, z: -1 },
						speed: 45,
						length: 0.35,
						color: 0xffffff,
					},
				],
				impacts: [],
			});

		await import('./app/bootstrap');

		const animationFn = (
			globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>
		).mock.calls[0]?.[0] as (() => void) | undefined;
		animationFn?.();

		expect(threeState.scenes[0].add).toHaveBeenCalledTimes(7);
		expect(threeState.bufferGeometries[0].setFromPoints).toHaveBeenCalledTimes(
			2,
		);
		expect(threeState.vectors[0]?.z).toBeCloseTo(0.05);
		expect(threeState.vectors[1]?.z).toBeCloseTo(-0.3);
	});
});
