import { describe, expect, it, vi } from 'vitest';
import {
	applyFrameMovement,
	applyViewportResize,
	createRuntimeLogger,
	createInitialMovementKeys,
	getWorldLayoutSummary,
	handlePointerLockChange,
	handleMouseMoveForLook,
	isMovementKey,
	requestPointerLock,
	setMovementKeyState,
} from './fpsRuntime';

describe('fpsRuntime helpers', () => {
	it('validates movement key codes', () => {
		expect(isMovementKey('KeyW')).toBe(true);
		expect(isMovementKey('KeyA')).toBe(true);
		expect(isMovementKey('KeyS')).toBe(true);
		expect(isMovementKey('KeyD')).toBe(true);
		expect(isMovementKey('Space')).toBe(false);
	});

	it('creates and updates movement key state', () => {
		const keys = createInitialMovementKeys();
		expect(keys).toEqual({
			KeyW: false,
			KeyA: false,
			KeyS: false,
			KeyD: false,
		});

		setMovementKeyState(keys, 'KeyW', true);
		setMovementKeyState(keys, 'KeyD', true);
		expect(keys.KeyW).toBe(true);
		expect(keys.KeyD).toBe(true);

		setMovementKeyState(keys, 'Space', true);
		expect(keys).toEqual({ KeyW: true, KeyA: false, KeyS: false, KeyD: true });
	});

	it('requests pointer lock on the provided element', () => {
		const element = { requestPointerLock: vi.fn() };
		requestPointerLock(element);
		expect(element.requestPointerLock).toHaveBeenCalledTimes(1);
	});

	it('creates a disabled logger by default', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ sink });

		logger.debug('debug.event');
		logger.error('error.event', { reason: 'test' });

		expect(logger.isEnabled).toBe(false);
		expect(sink).not.toHaveBeenCalled();
	});

	it('emits structured entries when logger is enabled', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });

		logger.debug('input.key.changed', { code: 'KeyW', isPressed: true });

		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'input.key.changed',
			context: { code: 'KeyW', isPressed: true },
		});
	});

	it('updates look only while pointer lock is active', () => {
		const rendererElement = { id: 'renderer' };
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const cameraRotation = {
			set: vi.fn<(x: number, y: number, z: number, order?: 'YXZ') => void>(),
		};

		const ignored = handleMouseMoveForLook({
			pointerLockElement: { id: 'other' },
			rendererElement,
			yaw: 1,
			pitch: 0.2,
			movementX: 100,
			movementY: 100,
			cameraRotation,
			logger,
		});
		expect(ignored).toEqual({ yaw: 1, pitch: 0.2, updated: false });
		expect(cameraRotation.set).not.toHaveBeenCalled();

		const updated = handleMouseMoveForLook({
			pointerLockElement: rendererElement,
			rendererElement,
			yaw: 0,
			pitch: 0,
			movementX: 50,
			movementY: -25,
			cameraRotation,
			logger,
		});
		expect(updated.updated).toBe(true);
		expect(updated.yaw).toBeCloseTo(-0.1);
		expect(updated.pitch).toBeCloseTo(0.05);
		expect(cameraRotation.set).toHaveBeenCalledWith(
			updated.pitch,
			updated.yaw,
			0,
			'YXZ',
		);
		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'look.ignored.pointerLockInactive',
			context: undefined,
		});
		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'look.updated',
			context: expect.objectContaining({
				movementX: 50,
				movementY: -25,
			}),
		});
	});

	it('logs pointer lock transitions', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const rendererElement = { id: 'renderer' };

		expect(
			handlePointerLockChange({
				pointerLockElement: rendererElement,
				rendererElement,
				logger,
			}),
		).toEqual({ isLocked: true });

		expect(
			handlePointerLockChange({
				pointerLockElement: null,
				rendererElement,
				logger,
			}),
		).toEqual({ isLocked: false });

		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'pointerLock.acquired',
			context: undefined,
		});
		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'pointerLock.released',
			context: undefined,
		});
	});

	it('applies movement and locks height each frame', () => {
		const keys = createInitialMovementKeys();
		keys.KeyW = true;
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });

		const moved = applyFrameMovement({
			position: { x: 0, y: -100, z: 0 },
			keys,
			yaw: 0,
			dt: 1,
			moveSpeed: 2,
			playerHeight: 1.6,
			logger,
		});

		expect(moved.z).toBeCloseTo(-2);
		expect(moved.y).toBe(1.6);
		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'frame.movementApplied',
			context: expect.objectContaining({ dt: 1 }),
		});
	});

	it('logs an error and uses zero movement for invalid delta time', () => {
		const keys = createInitialMovementKeys();
		keys.KeyW = true;
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });

		const moved = applyFrameMovement({
			position: { x: 10, y: 50, z: 20 },
			keys,
			yaw: 0,
			dt: Number.NaN,
			logger,
		});

		expect(moved).toEqual({ x: 10, y: 1.6, z: 20 });
		expect(sink).toHaveBeenCalledWith({
			level: 'error',
			event: 'frame.invalidDeltaTime',
			context: { dt: Number.NaN },
		});
	});

	it('uses default movement speed and player height when omitted', () => {
		const keys = createInitialMovementKeys();
		keys.KeyW = true;

		const moved = applyFrameMovement({
			position: { x: 0, y: -100, z: 0 },
			keys,
			yaw: 0,
			dt: 1,
		});

		expect(moved.z).toBeCloseTo(-5);
		expect(moved.y).toBe(1.6);
	});

	it('updates camera and renderer on viewport resize', () => {
		const camera = {
			aspect: 1,
			updateProjectionMatrix: vi.fn(),
		};
		const renderer = {
			setSize: vi.fn<(width: number, height: number) => void>(),
		};

		applyViewportResize(camera, renderer, 1920, 1080);

		expect(camera.aspect).toBeCloseTo(1920 / 1080);
		expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
		expect(renderer.setSize).toHaveBeenCalledWith(1920, 1080);
	});

	it('returns world layout summary', () => {
		expect(getWorldLayoutSummary()).toEqual({
			floorCount: 1,
			outerWallCount: 4,
			innerWallCount: 2,
		});
	});
});
