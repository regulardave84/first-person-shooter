import {
	createEntityHealthState,
	type EntityHealthState,
} from './entityHealth';

export const DEFAULT_PLAYER_MAX_HEALTH = 100;
export const DEFAULT_BURNING_OIL_DRUM_PROXIMITY_DAMAGE_PER_SECOND = 15;
export const DEFAULT_BURNING_OIL_DRUM_PROXIMITY_RADIUS_METERS = 1;
export const DEFAULT_OIL_DRUM_EXPLOSION_PLAYER_DAMAGE = 75;
export const DEFAULT_OIL_DRUM_EXPLOSION_DAMAGE_RADIUS_METERS =
	DEFAULT_BURNING_OIL_DRUM_PROXIMITY_RADIUS_METERS;

export type HazardPosition3D = {
	x: number;
	y: number;
	z: number;
};

export type PlayerHealthState = EntityHealthState;

export type PlayerHazardTickState = {
	proximityDamageElapsedSeconds: number;
};

export type PlayerHazardDamageResult = {
	health: PlayerHealthState;
	state: PlayerHazardTickState;
	didApplyDamage: boolean;
	damageApplied: number;
};

export function createPlayerHealthState(config?: {
	maxHealth?: number;
	currentHealth?: number;
}): PlayerHealthState {
	return createEntityHealthState({
		maxHealth: config?.maxHealth ?? DEFAULT_PLAYER_MAX_HEALTH,
		currentHealth: config?.currentHealth,
	});
}

export function createInitialPlayerHazardTickState(): PlayerHazardTickState {
	return {
		proximityDamageElapsedSeconds: 0,
	};
}

function toNonNegativeFloor(value: number | undefined, fallback: number): number {
	const candidate = Number.isFinite(value) ? Math.floor(value as number) : fallback;
	return Math.max(1, candidate);
}

function resolveRadiusMeters(radiusMeters: number | undefined): number {
	const radius =
		typeof radiusMeters === 'number' && Number.isFinite(radiusMeters)
			? radiusMeters
			: DEFAULT_BURNING_OIL_DRUM_PROXIMITY_RADIUS_METERS;
	return Math.max(0, radius);
}

function isWithinRadius(
	from: HazardPosition3D,
	to: HazardPosition3D,
	radiusMeters: number,
): boolean {
	const dx = to.x - from.x;
	const dz = to.z - from.z;
	return dx * dx + dz * dz <= radiusMeters * radiusMeters;
}

function clampHealth(currentHealth: number, maxHealth: number): PlayerHealthState {
	return {
		currentHealth: Math.max(0, Math.min(maxHealth, currentHealth)),
		maxHealth,
	};
}

export function advancePlayerBurningOilDrumProximityDamage(params: {
	health: PlayerHealthState;
	state: PlayerHazardTickState;
	playerPosition: HazardPosition3D;
	burningDrumPositions: ReadonlyArray<HazardPosition3D>;
	deltaSeconds: number;
	damagePerSecond?: number;
	radiusMeters?: number;
}): PlayerHazardDamageResult {
	if (params.health.currentHealth <= 0) {
		return {
			health: clampHealth(params.health.currentHealth, params.health.maxHealth),
			state: {
				proximityDamageElapsedSeconds: 0,
			},
			didApplyDamage: false,
			damageApplied: 0,
		};
	}

	const radiusMeters = resolveRadiusMeters(params.radiusMeters);
	const nearbyBurningDrumCount = params.burningDrumPositions.filter((position) =>
		isWithinRadius(params.playerPosition, position, radiusMeters),
	).length;

	if (nearbyBurningDrumCount <= 0) {
		return {
			health: clampHealth(params.health.currentHealth, params.health.maxHealth),
			state: {
				proximityDamageElapsedSeconds: 0,
			},
			didApplyDamage: false,
			damageApplied: 0,
		};
	}

	const deltaSeconds = Math.max(0, Number.isFinite(params.deltaSeconds) ? params.deltaSeconds : 0);
	const elapsedSeconds = params.state.proximityDamageElapsedSeconds + deltaSeconds;
	const elapsedWholeSeconds = Math.floor(elapsedSeconds);

	if (elapsedWholeSeconds <= 0) {
		return {
			health: clampHealth(params.health.currentHealth, params.health.maxHealth),
			state: {
				proximityDamageElapsedSeconds: elapsedSeconds,
			},
			didApplyDamage: false,
			damageApplied: 0,
		};
	}

	const damagePerSecond = toNonNegativeFloor(
		params.damagePerSecond,
		DEFAULT_BURNING_OIL_DRUM_PROXIMITY_DAMAGE_PER_SECOND,
	);
	const requestedDamage =
		damagePerSecond * nearbyBurningDrumCount * elapsedWholeSeconds;
	const nextHealth = clampHealth(
		params.health.currentHealth - requestedDamage,
		params.health.maxHealth,
	);
	const damageApplied = params.health.currentHealth - nextHealth.currentHealth;

	return {
		health: nextHealth,
		state: {
			proximityDamageElapsedSeconds: elapsedSeconds - elapsedWholeSeconds,
		},
		didApplyDamage: damageApplied > 0,
		damageApplied,
	};
}

export function applyPlayerOilDrumExplosionDamage(params: {
	health: PlayerHealthState;
	playerPosition: HazardPosition3D;
	explosionPositions: ReadonlyArray<HazardPosition3D>;
	damagePerExplosion?: number;
	radiusMeters?: number;
}): PlayerHazardDamageResult {
	if (params.health.currentHealth <= 0) {
		return {
			health: clampHealth(params.health.currentHealth, params.health.maxHealth),
			state: createInitialPlayerHazardTickState(),
			didApplyDamage: false,
			damageApplied: 0,
		};
	}

	const radiusMeters = resolveRadiusMeters(
		params.radiusMeters ?? DEFAULT_OIL_DRUM_EXPLOSION_DAMAGE_RADIUS_METERS,
	);
	const nearbyExplosionCount = params.explosionPositions.filter((position) =>
		isWithinRadius(params.playerPosition, position, radiusMeters),
	).length;

	if (nearbyExplosionCount <= 0) {
		return {
			health: clampHealth(params.health.currentHealth, params.health.maxHealth),
			state: createInitialPlayerHazardTickState(),
			didApplyDamage: false,
			damageApplied: 0,
		};
	}

	const damagePerExplosion = toNonNegativeFloor(
		params.damagePerExplosion,
		DEFAULT_OIL_DRUM_EXPLOSION_PLAYER_DAMAGE,
	);
	const requestedDamage = damagePerExplosion * nearbyExplosionCount;
	const nextHealth = clampHealth(
		params.health.currentHealth - requestedDamage,
		params.health.maxHealth,
	);
	const damageApplied = params.health.currentHealth - nextHealth.currentHealth;

	return {
		health: nextHealth,
		state: createInitialPlayerHazardTickState(),
		didApplyDamage: damageApplied > 0,
		damageApplied,
	};
}
