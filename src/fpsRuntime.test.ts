import { describe, expect, it, vi } from 'vitest';
import {
	applyFrameMovement,
	applyViewportResize,
	createInitialJumpState,
	createJumpSoundPlayer,
	createRuntimeLogger,
	createInitialMovementKeys,
	getWorldLayoutSummary,
	handleJumpInput,
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

	it('emits info and warn entries when logger is enabled', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });

		logger.info('info.event', { source: 'test' });
		logger.warn('warn.event', { reason: 'low' });

		expect(sink).toHaveBeenCalledWith({
			level: 'info',
			event: 'info.event',
			context: { source: 'test' },
		});
		expect(sink).toHaveBeenCalledWith({
			level: 'warn',
			event: 'warn.event',
			context: { reason: 'low' },
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

	it('creates a jump state that starts grounded and still allows a valid jump', () => {
		const jumpState = createInitialJumpState();
		expect(jumpState).toEqual({ isGrounded: true, verticalVelocity: 0 });
		expect(handleJumpInput(jumpState, 'Space')).toEqual({
			isGrounded: false,
			verticalVelocity: 5.2,
		});
		expect(handleJumpInput({ isGrounded: false, verticalVelocity: 1 }, 'Space')).toEqual({
			isGrounded: false,
			verticalVelocity: 1,
		});
	});

	it('applies gravity and lands when the player falls back to ground height', () => {
		const jumpState = { isGrounded: false, verticalVelocity: 2.5 };
		const moved = applyFrameMovement({
			position: { x: 0, y: 1.5, z: 0 },
			keys: createInitialMovementKeys(),
			yaw: 0,
			dt: 0.5,
			playerHeight: 1.6,
			jumpState,
			groundY: 1.6,
		});

		expect(moved.y).toBe(1.6);
		expect(jumpState.isGrounded).toBe(true);
		expect(jumpState.verticalVelocity).toBe(0);
	});

	it('keeps airborne players rising until gravity brings them down to the ground', () => {
		const jumpState = { isGrounded: false, verticalVelocity: 5 };
		const moved = applyFrameMovement({
			position: { x: 0, y: 5, z: 0 },
			keys: createInitialMovementKeys(),
			yaw: 0,
			dt: 0.1,
			playerHeight: 1.6,
			jumpState,
			groundY: 1.6,
		});

		expect(moved.y).toBeGreaterThan(1.6);
		expect(jumpState.isGrounded).toBe(false);
		expect(jumpState.verticalVelocity).toBeGreaterThan(0);
	});

	function restoreAudioApiState(
		audioWindow: typeof globalThis & {
			AudioContext?: typeof AudioContext;
			webkitAudioContext?: typeof AudioContext;
		},
		originalAudio: typeof AudioContext | undefined,
		originalWebkit: typeof AudioContext | undefined,
		originalAudioDescriptor?: PropertyDescriptor,
		originalWebkitDescriptor?: PropertyDescriptor,
	): void {
		if (originalAudioDescriptor) {
			Object.defineProperty(audioWindow, 'AudioContext', originalAudioDescriptor);
		} else if (originalAudio) {
			audioWindow.AudioContext = originalAudio;
		}
		if (originalWebkitDescriptor) {
			Object.defineProperty(
				audioWindow,
				'webkitAudioContext',
				originalWebkitDescriptor,
			);
		} else if (originalWebkit) {
			audioWindow.webkitAudioContext = originalWebkit;
		}
	}

	it('creates a no-op audio player when browser audio APIs are unavailable', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const audioWindow = globalThis as typeof globalThis & {
			AudioContext?: typeof AudioContext;
			webkitAudioContext?: typeof AudioContext;
		};
		const originalAudio = audioWindow.AudioContext;
		const originalWebkit = audioWindow.webkitAudioContext;
		const audioContextDescriptor = Object.getOwnPropertyDescriptor(
			audioWindow,
			'AudioContext',
		);
		const webkitDescriptor = Object.getOwnPropertyDescriptor(
			audioWindow,
			'webkitAudioContext',
		);
		if (audioContextDescriptor?.configurable) {
			Reflect.deleteProperty(audioWindow, 'AudioContext');
		}
		if (webkitDescriptor?.configurable) {
			Reflect.deleteProperty(audioWindow, 'webkitAudioContext');
		}

		const player = createJumpSoundPlayer(logger);
		expect(() => player.play()).not.toThrow();
		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'audio.unavailable',
			context: undefined,
		});

		restoreAudioApiState(
			audioWindow,
			originalAudio,
			originalWebkit,
			audioContextDescriptor,
			webkitDescriptor,
		);
	});

	it('plays a synthesized jump tone when the browser audio API is available', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const oscillator = {
			type: 'sine',
			frequency: {
				setValueAtTime: vi.fn(),
				exponentialRampToValueAtTime: vi.fn(),
			},
			connect: vi.fn(),
			start: vi.fn(),
			stop: vi.fn(),
		};
		const gain = {
			gain: {
				setValueAtTime: vi.fn(),
				exponentialRampToValueAtTime: vi.fn(),
			},
			connect: vi.fn(),
		};
		const audioContext = {
			currentTime: 1.5,
			createOscillator: vi.fn(() => oscillator),
			createGain: vi.fn(() => gain),
			destination: {},
		};
		const audioWindow = globalThis as typeof globalThis & {
			AudioContext?: typeof AudioContext;
		};
		const originalAudio = audioWindow.AudioContext;
		audioWindow.AudioContext = class {
			constructor() {
				return audioContext as unknown as AudioContext;
			}
		} as typeof AudioContext;

		const player = createJumpSoundPlayer(logger);
		player.play();

		expect(audioContext.createOscillator).toHaveBeenCalledTimes(1);
		expect(oscillator.start).toHaveBeenCalledWith(1.5);
		expect(oscillator.stop).toHaveBeenCalledWith(1.66);
		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'jump.sound.played',
			context: expect.objectContaining({ frequency: 420 }),
		});

		audioWindow.AudioContext = originalAudio;
	});

	it('logs a warning when jump sound creation fails', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const originalAudio = (globalThis as typeof globalThis & {
			AudioContext?: typeof AudioContext;
		}).AudioContext;
		(globalThis as typeof globalThis & {
			AudioContext?: typeof AudioContext;
		}).AudioContext = class {
			constructor() {
				throw new Error('No audio');
			}
		} as typeof AudioContext;

		const player = createJumpSoundPlayer(logger);
		expect(() => player.play()).not.toThrow();
		expect(sink).toHaveBeenCalledWith({
			level: 'warn',
			event: 'jump.sound.failed',
			context: expect.objectContaining({ error: 'No audio' }),
		});

		(globalThis as typeof globalThis & {
			AudioContext?: typeof AudioContext;
		}).AudioContext = originalAudio;
	});
});
