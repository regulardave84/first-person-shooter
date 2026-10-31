import {
	DEFAULT_MOVE_SPEED,
	GRAVITY,
	PLAYER_HEIGHT,
	createJumpState,
	getMovementDelta,
	triggerJump,
	updateLookAngles,
	type JumpState,
	type MovementKeys,
} from '../core/gameLogic';

export type MovementKeyCode = keyof MovementKeys;

const MOVEMENT_KEYS: ReadonlyArray<MovementKeyCode> = [
	'KeyW',
	'KeyA',
	'KeyS',
	'KeyD',
];

export type WallSpec = {
	x: number;
	y: number;
	z: number;
	w: number;
	h: number;
	d: number;
	kind: 'outer' | 'inner';
};

export const WORLD_WALLS: ReadonlyArray<WallSpec> = [
	{ x: 0, y: 2, z: -20, w: 40, h: 4, d: 1, kind: 'outer' },
	{ x: 0, y: 2, z: 20, w: 40, h: 4, d: 1, kind: 'outer' },
	{ x: -20, y: 2, z: 0, w: 1, h: 4, d: 40, kind: 'outer' },
	{ x: 20, y: 2, z: 0, w: 1, h: 4, d: 40, kind: 'outer' },
	{ x: 0, y: 2, z: 0, w: 12, h: 4, d: 1, kind: 'inner' },
	{ x: -8, y: 2, z: 8, w: 1, h: 4, d: 10, kind: 'inner' },
];

export type RuntimeLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type RuntimeLogEntry = {
	level: RuntimeLogLevel;
	event: string;
	context?: Record<string, unknown>;
};

export type RuntimeLogSink = (entry: RuntimeLogEntry) => void;

export type RuntimeLogger = {
	isEnabled: boolean;
	debug: (event: string, context?: Record<string, unknown>) => void;
	info: (event: string, context?: Record<string, unknown>) => void;
	warn: (event: string, context?: Record<string, unknown>) => void;
	error: (event: string, context?: Record<string, unknown>) => void;
};

const NOOP_LOG_SINK: RuntimeLogSink = () => {
	// Intentionally empty. Logging is opt-in.
};

export function createRuntimeLogger(config?: {
	enabled?: boolean;
	sink?: RuntimeLogSink;
}): RuntimeLogger {
	const isEnabled = config?.enabled ?? false;
	const sink = config?.sink ?? NOOP_LOG_SINK;

	const emit = (
		level: RuntimeLogLevel,
		event: string,
		context?: Record<string, unknown>,
	) => {
		if (!isEnabled) {
			return;
		}
		sink({ level, event, context });
	};

	return {
		isEnabled,
		debug: (event, context) => emit('debug', event, context),
		info: (event, context) => emit('info', event, context),
		warn: (event, context) => emit('warn', event, context),
		error: (event, context) => emit('error', event, context),
	};
}

export function getWorldLayoutSummary(): {
	floorCount: number;
	outerWallCount: number;
	innerWallCount: number;
} {
	const outerWallCount = WORLD_WALLS.filter(
		(wall) => wall.kind === 'outer',
	).length;
	const innerWallCount = WORLD_WALLS.filter(
		(wall) => wall.kind === 'inner',
	).length;
	return {
		floorCount: 1,
		outerWallCount,
		innerWallCount,
	};
}

export function createInitialMovementKeys(): MovementKeys {
	return {
		KeyW: false,
		KeyA: false,
		KeyS: false,
		KeyD: false,
	};
}

export function isMovementKey(code: string): code is MovementKeyCode {
	return MOVEMENT_KEYS.includes(code as MovementKeyCode);
}

export function setMovementKeyState(
	keys: MovementKeys,
	code: string,
	isPressed: boolean,
	logger?: RuntimeLogger,
): void {
	if (isMovementKey(code)) {
		keys[code] = isPressed;
		logger?.debug('input.key.changed', { code, isPressed });
	}
}

export function createJumpSoundPlayer(
	logger?: RuntimeLogger,
): { play: () => void } {
	const AudioCtor =
		(globalThis as typeof globalThis & {
			AudioContext?: typeof AudioContext;
			webkitAudioContext?: typeof AudioContext;
		}).AudioContext ??
		(globalThis as typeof globalThis & {
			AudioContext?: typeof AudioContext;
			webkitAudioContext?: typeof AudioContext;
		}).webkitAudioContext;

	if (!AudioCtor) {
		logger?.debug('audio.unavailable');
		return { play: () => {} };
	}

	let audioContext: AudioContext | undefined;

	return {
		play: () => {
			try {
				const context = audioContext ?? new AudioCtor();
				audioContext = context;
				const startTime = context.currentTime;
				const oscillator = context.createOscillator();
				const gain = context.createGain();

				oscillator.type = 'square';
				oscillator.frequency.setValueAtTime(420, startTime);
				oscillator.frequency.exponentialRampToValueAtTime(180, startTime + 0.12);

				gain.gain.setValueAtTime(0.0001, startTime);
				gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.01);
				gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15);

				oscillator.connect(gain);
				gain.connect(context.destination);
				oscillator.start(startTime);
				oscillator.stop(startTime + 0.16);

				logger?.debug('jump.sound.played', { startTime, frequency: 420 });
			} catch (error) {
				logger?.warn('jump.sound.failed', {
					error: error instanceof Error ? error.message : 'unknown',
				});
			}
		},
	};
}

export function requestPointerLock(
	element: {
		requestPointerLock: () => void;
	},
	logger?: RuntimeLogger,
): void {
	logger?.debug('pointerLock.requested');
	element.requestPointerLock();
}

export function handlePointerLockChange(params: {
	pointerLockElement: unknown;
	rendererElement: unknown;
	logger?: RuntimeLogger;
}): { isLocked: boolean } {
	const isLocked = params.pointerLockElement === params.rendererElement;
	params.logger?.debug(
		isLocked ? 'pointerLock.acquired' : 'pointerLock.released',
	);
	return { isLocked };
}

export type LookState = {
	yaw: number;
	pitch: number;
};

type RotationLike = {
	set: (x: number, y: number, z: number, order?: 'YXZ') => void;
};

export function handleMouseMoveForLook(params: {
	pointerLockElement: unknown;
	rendererElement: unknown;
	yaw: number;
	pitch: number;
	movementX: number;
	movementY: number;
	cameraRotation: RotationLike;
	logger?: RuntimeLogger;
}): LookState & { updated: boolean } {
	if (params.pointerLockElement !== params.rendererElement) {
		params.logger?.debug('look.ignored.pointerLockInactive');
		return { yaw: params.yaw, pitch: params.pitch, updated: false };
	}

	const updatedLook = updateLookAngles(
		params.yaw,
		params.pitch,
		params.movementX,
		params.movementY,
	);

	params.cameraRotation.set(updatedLook.pitch, updatedLook.yaw, 0, 'YXZ');
	params.logger?.debug('look.updated', {
		movementX: params.movementX,
		movementY: params.movementY,
		yaw: updatedLook.yaw,
		pitch: updatedLook.pitch,
	});
	return { ...updatedLook, updated: true };
}

export type Position3D = { x: number; y: number; z: number };

export function createInitialJumpState(): JumpState {
	return createJumpState();
}

export function handleJumpInput(
	jumpState: JumpState,
	code: string,
): JumpState {
	if (code !== 'Space' || !jumpState.isGrounded) {
		return jumpState;
	}

	return triggerJump(jumpState);
}

function resolveJumpFrame(
	jumpState: JumpState,
	dt: number,
	groundY: number,
	currentY: number,
): { y: number; jumpState: JumpState } {
	if (jumpState.isGrounded) {
		return { y: groundY, jumpState: { ...jumpState } };
	}

	const nextVelocity = jumpState.verticalVelocity - GRAVITY * dt;
	const nextY = currentY + jumpState.verticalVelocity * dt - 0.5 * GRAVITY * dt * dt;

	if (nextY <= groundY) {
		return {
			y: groundY,
			jumpState: { isGrounded: true, verticalVelocity: 0 },
		};
	}

	return {
		y: nextY,
		jumpState: { isGrounded: false, verticalVelocity: nextVelocity },
	};
}

function normalizeDeltaTime(
	dt: number,
	logger?: RuntimeLogger,
): number {
	if (!Number.isFinite(dt) || dt < 0) {
		logger?.error('frame.invalidDeltaTime', { dt });
		return 0;
	}
	return dt;
}

function syncJumpState(
	destination: JumpState | undefined,
	source: JumpState,
): void {
	if (!destination) {
		return;
	}
	destination.isGrounded = source.isGrounded;
	destination.verticalVelocity = source.verticalVelocity;
}

export function applyFrameMovement(params: {
	position: Position3D;
	keys: MovementKeys;
	yaw: number;
	dt: number;
	moveSpeed?: number;
	playerHeight?: number;
	logger?: RuntimeLogger;
	jumpState?: JumpState;
	groundY?: number;
}): Position3D {
	const safeDeltaTime = normalizeDeltaTime(params.dt, params.logger);
	const move = getMovementDelta(
		params.keys,
		params.yaw,
		safeDeltaTime,
		params.moveSpeed ?? DEFAULT_MOVE_SPEED,
	);

	const groundY = params.groundY ?? params.playerHeight ?? PLAYER_HEIGHT;
	const jumpState = params.jumpState ?? createJumpState();
	const updatedJump = resolveJumpFrame(
		jumpState,
		safeDeltaTime,
		groundY,
		params.position.y,
	);

	syncJumpState(params.jumpState, updatedJump.jumpState);

	const nextPosition = {
		x: params.position.x + move.x,
		y: updatedJump.y,
		z: params.position.z + move.z,
	};

	params.logger?.debug('frame.movementApplied', {
		dt: safeDeltaTime,
		nextPosition,
		yaw: params.yaw,
		jumpState: updatedJump.jumpState,
	});

	return nextPosition;
}

type CameraLike = {
	aspect: number;
	updateProjectionMatrix: () => void;
};

type RendererLike = {
	setSize: (width: number, height: number) => void;
};

export function applyViewportResize(
	camera: CameraLike,
	renderer: RendererLike,
	width: number,
	height: number,
): void {
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height);
}
