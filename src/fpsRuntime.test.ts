import { describe, expect, it, vi } from 'vitest';
import {
	PROJECTILE_COLOR,
	PROJECTILE_FIRE_RATE,
	WORLD_PROJECTILE_COLLIDERS,
	applyFrameMovement,
	applyViewportResize,
	advancePrimaryFireState,
	createEntityCollider,
	createInitialJumpState,
	createInitialPrimaryFireState,
	createBulletFireSoundPlayer,
	createJumpSoundPlayer,
	createRuntimeLogger,
	createInitialMovementKeys,
	getWorldLayoutSummary,
	handleJumpInput,
	handlePointerLockChange,
	handleMouseMoveForLook,
	isMovementKey,
	requestPointerLock,
	resolveHorizontalMovement,
	playBulletFireSounds,
	setMovementKeyState,
	setPrimaryFirePressedState,
	spawnProjectilesFromLook,
	stepProjectiles,
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

	it('queues one immediate projectile on left click only when pointer lock is active', () => {
		let fireState = createInitialPrimaryFireState();

		fireState = setPrimaryFirePressedState(fireState, true, false);
		const blocked = advancePrimaryFireState({
			state: fireState,
			dt: 0,
			isPointerLockActive: false,
		});
		expect(blocked.shotsToSpawn).toBe(0);

		fireState = setPrimaryFirePressedState(fireState, true, true);
		const allowed = advancePrimaryFireState({
			state: fireState,
			dt: 0,
			isPointerLockActive: true,
		});
		expect(allowed.shotsToSpawn).toBe(1);
	});

	it('fires continuously at 2 shots per second while holding left mouse', () => {
		let fireState = createInitialPrimaryFireState();
		fireState = setPrimaryFirePressedState(fireState, true, true);

		const first = advancePrimaryFireState({
			state: fireState,
			dt: 0,
			isPointerLockActive: true,
			fireRate: PROJECTILE_FIRE_RATE,
		});
		expect(first.shotsToSpawn).toBe(1);

		const noShot = advancePrimaryFireState({
			state: first.state,
			dt: 0.49,
			isPointerLockActive: true,
			fireRate: PROJECTILE_FIRE_RATE,
		});
		expect(noShot.shotsToSpawn).toBe(0);

		const second = advancePrimaryFireState({
			state: noShot.state,
			dt: 0.02,
			isPointerLockActive: true,
			fireRate: PROJECTILE_FIRE_RATE,
		});
		expect(second.shotsToSpawn).toBe(1);
	});

	it('stops firing after left mouse release', () => {
		let fireState = createInitialPrimaryFireState();
		fireState = setPrimaryFirePressedState(fireState, true, true);
		const first = advancePrimaryFireState({
			state: fireState,
			dt: 0,
			isPointerLockActive: true,
		});

		const released = setPrimaryFirePressedState(first.state, false, true);
		const afterRelease = advancePrimaryFireState({
			state: released,
			dt: 2,
			isPointerLockActive: true,
		});

		expect(afterRelease.shotsToSpawn).toBe(0);
	});

	it('spawns visible line projectile metadata from look direction', () => {
		const initial = createInitialPrimaryFireState();
		const spawned = spawnProjectilesFromLook({
			state: initial,
			count: 1,
			origin: { x: 1, y: 1.6, z: 2 },
			yaw: 0,
			pitch: 0,
		});

		expect(spawned.projectiles).toHaveLength(1);
		expect(spawned.projectiles[0]).toEqual(
			expect.objectContaining({
				head: { x: 1, y: 1.6, z: 2 },
				color: PROJECTILE_COLOR,
				direction: expect.objectContaining({ y: 0, z: -1 }),
			}),
		);
		expect(spawned.projectiles[0].direction.x).toBeCloseTo(0);
		expect(spawned.state.nextProjectileId).toBe(2);
	});

	it('removes projectiles when they hit wall floor ceiling or entity colliders', () => {
		const wallProjectile = {
			id: 1,
			head: { x: 0, y: 2, z: -19 },
			direction: { x: 0, y: 0, z: -1 },
			speed: 3,
			length: 0.35,
			color: PROJECTILE_COLOR,
		};
		const floorProjectile = {
			id: 2,
			head: { x: 15, y: 0.6, z: 15 },
			direction: { x: 0, y: -1, z: 0 },
			speed: 2,
			length: 0.35,
			color: PROJECTILE_COLOR,
		};
		const ceilingProjectile = {
			id: 3,
			head: { x: 15, y: 3.6, z: 15 },
			direction: { x: 0, y: 1, z: 0 },
			speed: 2,
			length: 0.35,
			color: PROJECTILE_COLOR,
		};
		const entityProjectile = {
			id: 4,
			head: { x: -2, y: 1.6, z: -2 },
			direction: { x: 1, y: 0, z: 0 },
			speed: 3,
			length: 0.35,
			color: PROJECTILE_COLOR,
		};
		const entityColliders = [
			createEntityCollider({ x: -1, y: 1.6, z: -2, w: 1, h: 1, d: 1 }),
		];

		const stepped = stepProjectiles({
			projectiles: [
				wallProjectile,
				floorProjectile,
				ceilingProjectile,
				entityProjectile,
			],
			dt: 1,
			worldColliders: WORLD_PROJECTILE_COLLIDERS,
			entityColliders,
		});

		expect(stepped.activeProjectiles).toHaveLength(0);
		expect(stepped.impacts.map((impact) => impact.colliderKind).sort()).toEqual(
			['ceiling', 'entity', 'floor', 'wall'],
		);
	});

	it('creates a disabled logger by default', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ sink });

		logger.debug('debug.event');
		logger.error('error.event', { reason: 'test' });

		expect(logger.isEnabled).toBe(false);
		expect(sink).not.toHaveBeenCalled();
	});

	it('creates a safe logger when config is omitted', () => {
		const logger = createRuntimeLogger();
		expect(logger.isEnabled).toBe(false);
		expect(() => {
			logger.debug('evt');
			logger.info('evt');
			logger.warn('evt');
			logger.error('evt');
		}).not.toThrow();
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

	it('requests pointer lock without logger safely', () => {
		const element = { requestPointerLock: vi.fn() };
		expect(() => requestPointerLock(element)).not.toThrow();
		expect(element.requestPointerLock).toHaveBeenCalledTimes(1);
	});

	it('handles look updates without logger safely', () => {
		const rendererElement = { id: 'renderer' };
		const cameraRotation = {
			set: vi.fn<(x: number, y: number, z: number, order?: 'YXZ') => void>(),
		};

		const result = handleMouseMoveForLook({
			pointerLockElement: rendererElement,
			rendererElement,
			yaw: 0,
			pitch: 0,
			movementX: 10,
			movementY: 10,
			cameraRotation,
		});

		expect(result.updated).toBe(true);
		expect(cameraRotation.set).toHaveBeenCalledTimes(1);
	});

	it('clears queued fire and hold when pointer lock is inactive', () => {
		const state = {
			isPrimaryHeld: true,
			hasQueuedImmediateShot: true,
			secondsUntilNextShot: 0.2,
			nextProjectileId: 3,
		};

		const updated = setPrimaryFirePressedState(state, true, false);
		expect(updated.isPrimaryHeld).toBe(false);
		expect(updated.hasQueuedImmediateShot).toBe(false);
	});

	it('does not queue repeated immediate shots while already held', () => {
		const firstPress = setPrimaryFirePressedState(
			createInitialPrimaryFireState(),
			true,
			true,
		);
		const repeated = setPrimaryFirePressedState(firstPress, true, true);

		expect(firstPress.hasQueuedImmediateShot).toBe(true);
		expect(repeated.hasQueuedImmediateShot).toBe(true);
	});

	it('normalizes invalid fire timing values and keeps state stable', () => {
		const state = setPrimaryFirePressedState(
			createInitialPrimaryFireState(),
			true,
			true,
		);

		const stepped = advancePrimaryFireState({
			state,
			dt: Number.NaN,
			isPointerLockActive: true,
		});

		expect(stepped.shotsToSpawn).toBe(1);
		expect(stepped.state.secondsUntilNextShot).toBeGreaterThan(0);
	});

	it('uses default projectile speed and length when options are omitted', () => {
		const spawned = spawnProjectilesFromLook({
			state: createInitialPrimaryFireState(),
			count: 1,
			origin: { x: 0, y: 0, z: 0 },
			yaw: Math.PI / 2,
			pitch: 0,
		});

		expect(spawned.projectiles[0].speed).toBeGreaterThan(0);
		expect(spawned.projectiles[0].length).toBeGreaterThan(0);
		expect(spawned.projectiles[0].direction.x).toBeCloseTo(-1);
		expect(spawned.projectiles[0].direction.z).toBeCloseTo(0);
	});

	it('supports custom fire rate in primary fire advancement', () => {
		let state = setPrimaryFirePressedState(
			createInitialPrimaryFireState(),
			true,
			true,
		);
		const first = advancePrimaryFireState({
			state,
			dt: 0,
			isPointerLockActive: true,
			fireRate: 4,
		});
		state = first.state;

		const second = advancePrimaryFireState({
			state,
			dt: 0.25,
			isPointerLockActive: true,
			fireRate: 4,
		});

		expect(first.shotsToSpawn).toBe(1);
		expect(second.shotsToSpawn).toBe(1);
	});

	it('keeps projectiles active when no colliders are hit', () => {
		const spawned = spawnProjectilesFromLook({
			state: createInitialPrimaryFireState(),
			count: 1,
			origin: { x: 25, y: 2, z: 25 },
			yaw: Math.PI,
			pitch: 0,
			projectileSpeed: 1,
		});

		const stepped = stepProjectiles({
			projectiles: spawned.projectiles,
			dt: 0.1,
			worldColliders: [],
			entityColliders: [],
		});

		expect(stepped.impacts).toHaveLength(0);
		expect(stepped.activeProjectiles).toHaveLength(1);
		expect(stepped.activeProjectiles[0].head.z).toBeGreaterThan(25);
	});

	it('detects impact at collider boundaries and reports in-range impact points', () => {
		const spawned = spawnProjectilesFromLook({
			state: createInitialPrimaryFireState(),
			count: 1,
			origin: { x: 0, y: 2, z: 1 },
			yaw: 0,
			pitch: 0,
			projectileSpeed: 2,
		});
		const wallOnly = WORLD_PROJECTILE_COLLIDERS.filter(
			(collider) => collider.kind === 'wall',
		);

		const stepped = stepProjectiles({
			projectiles: spawned.projectiles,
			dt: 1,
			worldColliders: wallOnly,
			entityColliders: [],
		});

		expect(stepped.impacts).toHaveLength(1);
		expect(stepped.impacts[0].point.z).toBeLessThanOrEqual(1);
		expect(stepped.impacts[0].point.z).toBeGreaterThanOrEqual(-1);
	});

	it('defaults projectile colliders and entity colliders when omitted', () => {
		const spawned = spawnProjectilesFromLook({
			state: createInitialPrimaryFireState(),
			count: 1,
			origin: { x: 0, y: 2, z: -19.5 },
			yaw: 0,
			pitch: 0,
			projectileSpeed: 2,
		});

		const stepped = stepProjectiles({
			projectiles: spawned.projectiles,
			dt: 1,
		});

		expect(stepped.impacts.length).toBeGreaterThan(0);
	});

	it('retains axis movement resolution order when both axes are not blocked', () => {
		const position = { x: 0, y: 1.6, z: 0 };
		const next = resolveHorizontalMovement(
			position,
			{ x: 0.25, y: 1.6, z: 0.25 },
			[],
			0.9,
		);

		expect(next.x).toBeCloseTo(0.25);
		expect(next.z).toBeCloseTo(0.25);
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

	it('handles pointer lock transitions without logger safely', () => {
		const rendererElement = { id: 'renderer' };
		expect(
			handlePointerLockChange({
				pointerLockElement: rendererElement,
				rendererElement,
			}),
		).toEqual({ isLocked: true });
		expect(
			handlePointerLockChange({
				pointerLockElement: null,
				rendererElement,
			}),
		).toEqual({ isLocked: false });
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
		expect(
			handleJumpInput({ isGrounded: false, verticalVelocity: 1 }, 'Space'),
		).toEqual({
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
			Object.defineProperty(
				audioWindow,
				'AudioContext',
				originalAudioDescriptor,
			);
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

	it('creates a no-op audio player when browser audio APIs are unavailable and logger is omitted', () => {
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

		const player = createJumpSoundPlayer();
		expect(() => player.play()).not.toThrow();

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
		const originalAudio = (
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
			}
		).AudioContext;
		(
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
			}
		).AudioContext = class {
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

		(
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
			}
		).AudioContext = originalAudio;
	});

	it('plays a synthesized bullet pew tone when browser audio API is available', () => {
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
			currentTime: 3,
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

		const player = createBulletFireSoundPlayer(logger);
		player.play();

		expect(audioContext.createOscillator).toHaveBeenCalledTimes(1);
		expect(oscillator.start).toHaveBeenCalledWith(3);
		expect(oscillator.stop).toHaveBeenCalledWith(3.1);
		expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
			1,
			3.005,
		);
		expect(sink).toHaveBeenCalledWith({
			level: 'debug',
			event: 'bullet.sound.played',
			context: expect.objectContaining({ frequency: 900 }),
		});

		audioWindow.AudioContext = originalAudio;
	});

	it('creates no-op bullet sound player when browser audio APIs are unavailable', () => {
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

		const player = createBulletFireSoundPlayer(logger);
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

	it('logs a warning when bullet sound creation fails', () => {
		const sink = vi.fn();
		const logger = createRuntimeLogger({ enabled: true, sink });
		const originalAudio = (
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
			}
		).AudioContext;
		(
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
			}
		).AudioContext = class {
			constructor() {
				throw new Error('No audio');
			}
		} as typeof AudioContext;

		const player = createBulletFireSoundPlayer(logger);
		expect(() => player.play()).not.toThrow();
		expect(sink).toHaveBeenCalledWith({
			level: 'warn',
			event: 'bullet.sound.failed',
			context: expect.objectContaining({ error: 'No audio' }),
		});

		(
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
			}
		).AudioContext = originalAudio;
	});

	it('plays exactly one firing sound per emitted bullet', () => {
		const player = { play: vi.fn() };

		playBulletFireSounds(player, 0);
		playBulletFireSounds(player, 1);
		playBulletFireSounds(player, 3);
		playBulletFireSounds(player, Number.NaN);

		expect(player.play).toHaveBeenCalledTimes(4);
	});

	it('stops movement at wall boundaries without passing through them', () => {
		const position = { x: 5, y: 1.6, z: 8 };
		const wall = { x: 9, y: 2, z: 8, w: 2, h: 4, d: 2, kind: 'inner' as const };
		const next = resolveHorizontalMovement(
			position,
			{ ...position, x: 10 },
			[wall],
			0.9,
		);

		expect(next.x).toBeLessThanOrEqual(7.1);
		expect(next.x).toBeGreaterThanOrEqual(5);
		expect(next.z).toBeCloseTo(8);
	});

	it('slides along a wall while keeping the player outside the wall volume', () => {
		const position = { x: 5, y: 1.6, z: 7.5 };
		const wall = { x: 8, y: 2, z: 8, w: 2, h: 4, d: 8, kind: 'inner' as const };
		const next = resolveHorizontalMovement(
			position,
			{ ...position, x: 9.5 },
			[wall],
			0.9,
		);

		expect(next.x).toBeGreaterThanOrEqual(5);
		expect(next.x).toBeLessThanOrEqual(9.5);
		expect(next.z).toBeCloseTo(7.5);
	});
});
