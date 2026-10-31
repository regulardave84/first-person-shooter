import { WORLD_WALLS } from './world';

export const PROJECTILE_FIRE_RATE = 2;
export const PROJECTILE_SPEED = 45;
export const PROJECTILE_LENGTH = 0.35;
export const PROJECTILE_COLOR = 0xffffff;

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
