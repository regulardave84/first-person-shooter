import { describe, expect, it, vi } from 'vitest';
import {
	applyFrameMovement,
	createRuntimeLogger,
	createInitialMovementKeys,
	handleMouseMoveForLook,
	handlePointerLockChange,
	requestPointerLock,
	setMovementKeyState,
} from './fpsRuntime';

describe('Acceptance: Runtime logging for FPS debugging', () => {
	it('Logging is disabled by default', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ sink });
		const keys = createInitialMovementKeys();

		setMovementKeyState(keys, 'KeyW', true, logger);
		applyFrameMovement({
			position: { x: 0, y: 0, z: 0 },
			keys,
			yaw: 0,
			dt: 0.016,
			logger,
		});

		expect(sink).not.toHaveBeenCalled();
	});

	it('Logging can be enabled through configuration', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const keys = createInitialMovementKeys();
		const cameraRotation = {
			set: vi.fn<(x: number, y: number, z: number, order?: 'YXZ') => void>(),
		};
		const rendererElement = { id: 'renderer' };

		setMovementKeyState(keys, 'KeyW', true, logger);
		handleMouseMoveForLook({
			pointerLockElement: rendererElement,
			rendererElement,
			yaw: 0,
			pitch: 0,
			movementX: 5,
			movementY: -5,
			cameraRotation,
			logger,
		});

		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'input.key.changed',
			context: { code: 'KeyW', isPressed: true },
		});
		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'look.updated',
			context: expect.objectContaining({ movementX: 5, movementY: -5 }),
		});
	});

	it('Pointer lock transitions are logged', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const rendererElement = { id: 'renderer' };
		const element = { requestPointerLock: vi.fn() };

		requestPointerLock(element, logger);
		handlePointerLockChange({
			pointerLockElement: rendererElement,
			rendererElement,
			logger,
		});
		handlePointerLockChange({
			pointerLockElement: null,
			rendererElement,
			logger,
		});

		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'pointerLock.requested',
			context: undefined,
		});
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

	it('Frame timing and movement application are logged', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const keys = createInitialMovementKeys();
		keys.KeyW = true;

		applyFrameMovement({
			position: { x: 0, y: 0, z: 0 },
			keys,
			yaw: 0,
			dt: 0.02,
			logger,
		});

		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'frame.movementApplied',
			context: expect.objectContaining({ dt: 0.02 }),
		});
	});

	it('Error-level logging is available for exceptional runtime states', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const keys = createInitialMovementKeys();

		applyFrameMovement({
			position: { x: 1, y: 2, z: 3 },
			keys,
			yaw: 0,
			dt: -1,
			logger,
		});

		expect(sink).toHaveBeenCalledWith({
			level: 'error',
			event: 'frame.invalidDeltaTime',
			context: { dt: -1 },
		});
	});
});
