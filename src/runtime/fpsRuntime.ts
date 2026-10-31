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

export const PLAYER_COLLISION_RADIUS = 0.9;
export const PROJECTILE_FIRE_RATE = 2;
export const PROJECTILE_SPEED = 45;
export const PROJECTILE_LENGTH = 0.35;
export const PROJECTILE_COLOR = 0xffffff;

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

export function createJumpSoundPlayer(logger?: RuntimeLogger): {
	play: () => void;
} {
	const AudioCtor =
		(
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
				webkitAudioContext?: typeof AudioContext;
			}
		).AudioContext ??
		(
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
				webkitAudioContext?: typeof AudioContext;
			}
		).webkitAudioContext;

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
				oscillator.frequency.exponentialRampToValueAtTime(
					180,
					startTime + 0.12,
				);

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

export function createBulletFireSoundPlayer(logger?: RuntimeLogger): {
	play: () => void;
} {
	const AudioCtor =
		(
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
				webkitAudioContext?: typeof AudioContext;
			}
		).AudioContext ??
		(
			globalThis as typeof globalThis & {
				AudioContext?: typeof AudioContext;
				webkitAudioContext?: typeof AudioContext;
			}
		).webkitAudioContext;

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
				oscillator.frequency.setValueAtTime(900, startTime);
				oscillator.frequency.exponentialRampToValueAtTime(
					680,
					startTime + 0.08,
				);

				gain.gain.setValueAtTime(0.0001, startTime);
				gain.gain.exponentialRampToValueAtTime(1, startTime + 0.005);
				gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09);

				oscillator.connect(gain);
				gain.connect(context.destination);
				oscillator.start(startTime);
				oscillator.stop(startTime + 0.1);

				logger?.debug('bullet.sound.played', { startTime, frequency: 900 });
			} catch (error) {
				logger?.warn('bullet.sound.failed', {
					error: error instanceof Error ? error.message : 'unknown',
				});
			}
		},
	};
}

export function playBulletFireSounds(
	player: { play: () => void },
	shotCount: number,
): void {
	const safeShotCount =
		Number.isFinite(shotCount) && shotCount > 0 ? Math.floor(shotCount) : 0;
	for (let i = 0; i < safeShotCount; i += 1) {
		player.play();
	}
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

export type ProjectileColliderKind = 'wall' | 'floor' | 'ceiling' | 'entity';

export type ProjectileCollider = {
	min: Position3D;
	max: Position3D;
	kind: ProjectileColliderKind;
};

export type Projectile = {
	id: number;
	head: Position3D;
	direction: Position3D;
	speed: number;
	length: number;
	color: number;
};

export type ProjectileImpact = {
	projectileId: number;
	point: Position3D;
	colliderKind: ProjectileColliderKind;
};

export type PrimaryFireState = {
	isPrimaryHeld: boolean;
	hasQueuedImmediateShot: boolean;
	secondsUntilNextShot: number;
	nextProjectileId: number;
};

const WORLD_HALF_SPAN = 30;
const PROJECTILE_FLOOR_THICKNESS = 0.25;
const PROJECTILE_CEILING_THICKNESS = 0.25;
const PROJECTILE_CEILING_Y = 4;

function toColliderFromCenterSize(params: {
	x: number;
	y: number;
	z: number;
	w: number;
	h: number;
	d: number;
	kind: ProjectileColliderKind;
}): ProjectileCollider {
	const halfW = params.w / 2;
	const halfH = params.h / 2;
	const halfD = params.d / 2;
	return {
		min: {
			x: params.x - halfW,
			y: params.y - halfH,
			z: params.z - halfD,
		},
		max: {
			x: params.x + halfW,
			y: params.y + halfH,
			z: params.z + halfD,
		},
		kind: params.kind,
	};
}

export function createEntityCollider(params: {
	x: number;
	y: number;
	z: number;
	w: number;
	h: number;
	d: number;
}): ProjectileCollider {
	return toColliderFromCenterSize({ ...params, kind: 'entity' });
}

export const WORLD_PROJECTILE_COLLIDERS: ReadonlyArray<ProjectileCollider> = [
	...WORLD_WALLS.map((wall) =>
		toColliderFromCenterSize({
			x: wall.x,
			y: wall.y,
			z: wall.z,
			w: wall.w,
			h: wall.h,
			d: wall.d,
			kind: 'wall',
		}),
	),
	toColliderFromCenterSize({
		x: 0,
		y: -PROJECTILE_FLOOR_THICKNESS / 2,
		z: 0,
		w: WORLD_HALF_SPAN * 2,
		h: PROJECTILE_FLOOR_THICKNESS,
		d: WORLD_HALF_SPAN * 2,
		kind: 'floor',
	}),
	toColliderFromCenterSize({
		x: 0,
		y: PROJECTILE_CEILING_Y + PROJECTILE_CEILING_THICKNESS / 2,
		z: 0,
		w: WORLD_HALF_SPAN * 2,
		h: PROJECTILE_CEILING_THICKNESS,
		d: WORLD_HALF_SPAN * 2,
		kind: 'ceiling',
	}),
];

export function createInitialJumpState(): JumpState {
	return createJumpState();
}

export function createInitialPrimaryFireState(): PrimaryFireState {
	return {
		isPrimaryHeld: false,
		hasQueuedImmediateShot: false,
		secondsUntilNextShot: 0,
		nextProjectileId: 1,
	};
}

export function setPrimaryFirePressedState(
	state: PrimaryFireState,
	isPressed: boolean,
	isPointerLockActive: boolean,
): PrimaryFireState {
	if (!isPointerLockActive) {
		return {
			...state,
			isPrimaryHeld: false,
			hasQueuedImmediateShot: false,
		};
	}

	if (!isPressed) {
		return {
			...state,
			isPrimaryHeld: false,
		};
	}

	const hasNewPress = !state.isPrimaryHeld;
	return {
		...state,
		isPrimaryHeld: true,
		hasQueuedImmediateShot: state.hasQueuedImmediateShot || hasNewPress,
	};
}

export function advancePrimaryFireState(params: {
	state: PrimaryFireState;
	dt: number;
	isPointerLockActive: boolean;
	fireRate?: number;
}): { state: PrimaryFireState; shotsToSpawn: number } {
	if (!params.isPointerLockActive) {
		return {
			state: {
				...params.state,
				isPrimaryHeld: false,
				hasQueuedImmediateShot: false,
			},
			shotsToSpawn: 0,
		};
	}

	const fireRate = params.fireRate ?? PROJECTILE_FIRE_RATE;
	const interval = 1 / fireRate;
	const dt = Math.max(0, Number.isFinite(params.dt) ? params.dt : 0);
	let secondsUntilNextShot = Math.max(
		0,
		params.state.secondsUntilNextShot - dt,
	);
	let hasQueuedImmediateShot = params.state.hasQueuedImmediateShot;
	let shotsToSpawn = 0;

	if (hasQueuedImmediateShot && secondsUntilNextShot <= 0) {
		shotsToSpawn += 1;
		hasQueuedImmediateShot = false;
		secondsUntilNextShot = interval;
	}

	while (params.state.isPrimaryHeld && secondsUntilNextShot <= 0) {
		shotsToSpawn += 1;
		secondsUntilNextShot += interval;
	}

	return {
		state: {
			...params.state,
			hasQueuedImmediateShot,
			secondsUntilNextShot,
		},
		shotsToSpawn,
	};
}

function resolveProjectileDirection(yaw: number, pitch: number): Position3D {
	const cosPitch = Math.cos(pitch);
	const x = -Math.sin(yaw) * cosPitch;
	const y = Math.sin(pitch);
	const z = -Math.cos(yaw) * cosPitch;
	const magnitude = Math.hypot(x, y, z);

	if (magnitude === 0) {
		return { x: 0, y: 0, z: -1 };
	}

	return { x: x / magnitude, y: y / magnitude, z: z / magnitude };
}

export function spawnProjectilesFromLook(params: {
	state: PrimaryFireState;
	count: number;
	origin: Position3D;
	yaw: number;
	pitch: number;
	projectileSpeed?: number;
	projectileLength?: number;
	projectileColor?: number;
}): { state: PrimaryFireState; projectiles: Projectile[] } {
	const projectiles: Projectile[] = [];
	const direction = resolveProjectileDirection(params.yaw, params.pitch);
	let nextProjectileId = params.state.nextProjectileId;

	for (let i = 0; i < params.count; i += 1) {
		projectiles.push({
			id: nextProjectileId,
			head: {
				x: params.origin.x,
				y: params.origin.y,
				z: params.origin.z,
			},
			direction,
			speed: params.projectileSpeed ?? PROJECTILE_SPEED,
			length: params.projectileLength ?? PROJECTILE_LENGTH,
			color: params.projectileColor ?? PROJECTILE_COLOR,
		});
		nextProjectileId += 1;
	}

	return {
		state: {
			...params.state,
			nextProjectileId,
		},
		projectiles,
	};
}

function intersectSegmentWithCollider(
	start: Position3D,
	end: Position3D,
	collider: ProjectileCollider,
): number | null {
	const direction = {
		x: end.x - start.x,
		y: end.y - start.y,
		z: end.z - start.z,
	};

	let entry = 0;
	let exit = 1;

	const axes: Array<keyof Position3D> = ['x', 'y', 'z'];
	for (const axis of axes) {
		const axisRange = getAxisIntersectionRange(
			start[axis],
			direction[axis],
			collider.min[axis],
			collider.max[axis],
		);

		if (!axisRange) {
			return null;
		}

		entry = Math.max(entry, axisRange.entry);
		exit = Math.min(exit, axisRange.exit);

		if (!isValidIntersectionRange(entry, exit)) {
			return null;
		}
	}

	if (!isWithinSegmentRange(entry)) {
		return null;
	}

	return entry;
}

function getAxisIntersectionRange(
	start: number,
	direction: number,
	min: number,
	max: number,
): { entry: number; exit: number } | null {
	if (direction === 0) {
		if (start < min || start > max) {
			return null;
		}
		return { entry: 0, exit: 1 };
	}

	const inverse = 1 / direction;
	let t0 = (min - start) * inverse;
	let t1 = (max - start) * inverse;

	if (t0 > t1) {
		const swap = t0;
		t0 = t1;
		t1 = swap;
	}

	return { entry: t0, exit: t1 };
}

function isValidIntersectionRange(entry: number, exit: number): boolean {
	return entry <= exit;
}

function isWithinSegmentRange(t: number): boolean {
	return t >= 0 && t <= 1;
}

function normalizeProjectileDeltaTime(dt: number): number {
	return Math.max(0, Number.isFinite(dt) ? dt : 0);
}

function getProjectileTravelEnd(
	projectile: Projectile,
	dt: number,
): Position3D {
	const travel = projectile.speed * dt;
	return {
		x: projectile.head.x + projectile.direction.x * travel,
		y: projectile.head.y + projectile.direction.y * travel,
		z: projectile.head.z + projectile.direction.z * travel,
	};
}

function findProjectileImpact(
	projectile: Projectile,
	end: Position3D,
	colliders: ReadonlyArray<ProjectileCollider>,
): { impactT: number; collider: ProjectileCollider } | null {
	let earliestImpactT: number | null = null;
	let hitCollider: ProjectileCollider | undefined;

	for (const collider of colliders) {
		const t = intersectSegmentWithCollider(projectile.head, end, collider);
		if (t === null) {
			continue;
		}

		if (earliestImpactT === null || t < earliestImpactT) {
			earliestImpactT = t;
			hitCollider = collider;
		}
	}

	if (earliestImpactT === null || !hitCollider) {
		return null;
	}

	return { impactT: earliestImpactT, collider: hitCollider };
}

function createProjectileImpact(params: {
	projectile: Projectile;
	end: Position3D;
	impactT: number;
	collider: ProjectileCollider;
}): ProjectileImpact {
	return {
		projectileId: params.projectile.id,
		point: {
			x:
				params.projectile.head.x +
				(endOffset(params.projectile.head.x, params.end.x) + Number.EPSILON) *
					params.impactT,
			y:
				params.projectile.head.y +
				(endOffset(params.projectile.head.y, params.end.y) + Number.EPSILON) *
					params.impactT,
			z:
				params.projectile.head.z +
				(endOffset(params.projectile.head.z, params.end.z) + Number.EPSILON) *
					params.impactT,
		},
		colliderKind: params.collider.kind,
	};
}

function endOffset(start: number, end: number): number {
	return end - start;
}

export function stepProjectiles(params: {
	projectiles: ReadonlyArray<Projectile>;
	dt: number;
	worldColliders?: ReadonlyArray<ProjectileCollider>;
	entityColliders?: ReadonlyArray<ProjectileCollider>;
}): { activeProjectiles: Projectile[]; impacts: ProjectileImpact[] } {
	const dt = normalizeProjectileDeltaTime(params.dt);
	const worldColliders = params.worldColliders ?? WORLD_PROJECTILE_COLLIDERS;
	const entityColliders = params.entityColliders ?? [];
	const colliders = [...worldColliders, ...entityColliders];
	const activeProjectiles: Projectile[] = [];
	const impacts: ProjectileImpact[] = [];

	for (const projectile of params.projectiles) {
		const end = getProjectileTravelEnd(projectile, dt);
		const impact = findProjectileImpact(projectile, end, colliders);

		if (impact) {
			impacts.push(
				createProjectileImpact({
					projectile,
					end,
					impactT: impact.impactT,
					collider: impact.collider,
				}),
			);
			continue;
		}

		activeProjectiles.push({
			...projectile,
			head: end,
		});
	}

	return { activeProjectiles, impacts };
}

export function handleJumpInput(jumpState: JumpState, code: string): JumpState {
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
	const nextY =
		currentY + jumpState.verticalVelocity * dt - 0.5 * GRAVITY * dt * dt;

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

function normalizeDeltaTime(dt: number, logger?: RuntimeLogger): number {
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

function collidesWithWall(
	positionX: number,
	positionZ: number,
	wall: WallSpec,
	playerRadius: number,
): boolean {
	const halfW = wall.w / 2 + playerRadius;
	const halfD = wall.d / 2 + playerRadius;
	const dx = Math.abs(positionX - wall.x);
	const dz = Math.abs(positionZ - wall.z);

	return dx <= halfW && dz <= halfD;
}

function collidesWithWalls(
	positionX: number,
	positionZ: number,
	walls: ReadonlyArray<WallSpec>,
	playerRadius: number,
): boolean {
	return walls.some((wall) =>
		collidesWithWall(positionX, positionZ, wall, playerRadius),
	);
}

export function resolveHorizontalMovement(
	position: Position3D,
	desired: Position3D,
	walls: ReadonlyArray<WallSpec> = WORLD_WALLS,
	playerRadius = PLAYER_COLLISION_RADIUS,
): Position3D {
	const next = { ...position, x: desired.x, y: desired.y, z: desired.z };
	if (!collidesWithWalls(next.x, next.z, walls, playerRadius)) {
		return next;
	}

	const xOnly = { ...position, x: desired.x, y: desired.y };
	const zOnly = { ...position, z: desired.z, y: desired.y };
	const xOnlyBlocked = collidesWithWalls(
		xOnly.x,
		position.z,
		walls,
		playerRadius,
	);
	const zOnlyBlocked = collidesWithWalls(
		position.x,
		zOnly.z,
		walls,
		playerRadius,
	);

	if (!xOnlyBlocked) {
		return xOnly;
	}
	if (!zOnlyBlocked) {
		return zOnly;
	}

	return { ...position, y: desired.y };
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

	const rawNextPosition = {
		x: params.position.x + move.x,
		y: updatedJump.y,
		z: params.position.z + move.z,
	};

	const resolvedPosition = resolveHorizontalMovement(
		params.position,
		rawNextPosition,
		WORLD_WALLS,
		PLAYER_COLLISION_RADIUS,
	);

	params.logger?.debug('frame.movementApplied', {
		dt: safeDeltaTime,
		nextPosition: resolvedPosition,
		yaw: params.yaw,
		jumpState: updatedJump.jumpState,
	});

	return resolvedPosition;
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
