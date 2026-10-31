import {
	DEFAULT_MOVE_SPEED,
	GRAVITY,
	PLAYER_HEIGHT,
	createJumpState,
	getMovementDelta,
	triggerJump,
	type JumpState,
	type MovementKeys,
} from '../core/gameLogic';
import type { RuntimeLogger } from './logger';
import { PLAYER_COLLISION_RADIUS, WORLD_WALLS, type WallSpec } from './world';
import type { Position3D } from './combat';

export function createInitialJumpState(): JumpState {
	return createJumpState();
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
