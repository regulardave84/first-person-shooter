import { describe, expect, it } from 'vitest';
import {
	DEFAULT_BURNING_OIL_DRUM_PROXIMITY_DAMAGE_PER_SECOND,
	DEFAULT_OIL_DRUM_EXPLOSION_PLAYER_DAMAGE,
	advancePlayerBurningOilDrumProximityDamage,
	applyPlayerOilDrumExplosionDamage,
	createInitialPlayerHazardTickState,
	createPlayerHealthState,
} from './playerHazardDamage';

describe('playerHazardDamage', () => {
	it('applies 15 damage every elapsed second for one nearby burning drum', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 1 }],
			deltaSeconds: 1,
			damagePerSecond: DEFAULT_BURNING_OIL_DRUM_PROXIMITY_DAMAGE_PER_SECOND,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(85);
		expect(result.didApplyDamage).toBe(true);
		expect(result.damageApplied).toBe(15);
	});

	it('does not apply burning damage outside radius', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 1.01 }],
			deltaSeconds: 2,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(100);
		expect(result.didApplyDamage).toBe(false);
		expect(result.state.proximityDamageElapsedSeconds).toBe(0);
	});

	it('stacks burning damage across multiple nearby drums per second', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [
				{ x: 1, y: 0, z: 0 },
				{ x: 0, y: 0, z: -1 },
			],
			deltaSeconds: 1,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(70);
		expect(result.damageApplied).toBe(30);
	});

	it('applies burning damage in one-second chunks', () => {
		const firstHalf = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0.25, y: 0, z: 0 }],
			deltaSeconds: 0.5,
			radiusMeters: 1,
		});
		const secondHalf = advancePlayerBurningOilDrumProximityDamage({
			health: firstHalf.health,
			state: firstHalf.state,
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0.25, y: 0, z: 0 }],
			deltaSeconds: 0.5,
			radiusMeters: 1,
		});

		expect(firstHalf.health.currentHealth).toBe(100);
		expect(secondHalf.health.currentHealth).toBe(85);
	});

	it('applies configured explosion damage when an explosion is nearby', () => {
		const result = applyPlayerOilDrumExplosionDamage({
			health: createPlayerHealthState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			explosionPositions: [{ x: 0.5, y: 0, z: 0 }],
			damagePerExplosion: DEFAULT_OIL_DRUM_EXPLOSION_PLAYER_DAMAGE,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(25);
		expect(result.didApplyDamage).toBe(true);
		expect(result.damageApplied).toBe(75);
	});

	it('stops applying hazard damage once health reaches zero', () => {
		const first = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState({ currentHealth: 10 }),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 0 }],
			deltaSeconds: 1,
			radiusMeters: 1,
		});
		const second = advancePlayerBurningOilDrumProximityDamage({
			health: first.health,
			state: first.state,
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 0 }],
			deltaSeconds: 2,
			radiusMeters: 1,
		});

		expect(first.health.currentHealth).toBe(0);
		expect(second.health.currentHealth).toBe(0);
		expect(second.didApplyDamage).toBe(false);
	});

	it('resets accumulated burn tick state when no burning drums are in range', () => {
		const firstHalf = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0.5, y: 0, z: 0 }],
			deltaSeconds: 0.5,
			radiusMeters: 1,
		});
		const outOfRange = advancePlayerBurningOilDrumProximityDamage({
			health: firstHalf.health,
			state: firstHalf.state,
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 2, y: 0, z: 0 }],
			deltaSeconds: 0.5,
			radiusMeters: 1,
		});
		const backInRange = advancePlayerBurningOilDrumProximityDamage({
			health: outOfRange.health,
			state: outOfRange.state,
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0.5, y: 0, z: 0 }],
			deltaSeconds: 0.5,
			radiusMeters: 1,
		});

		expect(firstHalf.state.proximityDamageElapsedSeconds).toBe(0.5);
		expect(outOfRange.state.proximityDamageElapsedSeconds).toBe(0);
		expect(backInRange.health.currentHealth).toBe(100);
	});

	it('uses horizontal world-space distance for proximity checks', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 2, z: 0 }],
			deltaSeconds: 1,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(85);
		expect(result.didApplyDamage).toBe(true);
	});

	it('uses configured default damage values when undefined', () => {
		const burn = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 0 }],
			deltaSeconds: 1,
		});
		const explosion = applyPlayerOilDrumExplosionDamage({
			health: createPlayerHealthState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			explosionPositions: [{ x: 0.5, y: 0, z: 0 }],
		});

		expect(burn.damageApplied).toBe(15);
		expect(explosion.damageApplied).toBe(75);
	});

	it('stacks explosion damage across multiple nearby explosion sources', () => {
		const result = applyPlayerOilDrumExplosionDamage({
			health: createPlayerHealthState({ currentHealth: 200, maxHealth: 200 }),
			playerPosition: { x: 0, y: 0, z: 0 },
			explosionPositions: [
				{ x: 0.2, y: 0, z: 0 },
				{ x: -0.2, y: 0, z: 0 },
			],
			damagePerExplosion: DEFAULT_OIL_DRUM_EXPLOSION_PLAYER_DAMAGE,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(50);
		expect(result.damageApplied).toBe(150);
	});

	it('does not apply explosion damage outside configured radius', () => {
		const result = applyPlayerOilDrumExplosionDamage({
			health: createPlayerHealthState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			explosionPositions: [{ x: 2, y: 0, z: 0 }],
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(100);
		expect(result.didApplyDamage).toBe(false);
	});

	it('uses fallback max health when configured maxHealth is undefined', () => {
		const health = createPlayerHealthState({ maxHealth: undefined });

		expect(health.maxHealth).toBe(100);
		expect(health.currentHealth).toBe(100);
	});

	it('uses explicit maxHealth when provided', () => {
		const health = createPlayerHealthState({ maxHealth: 50, currentHealth: 50 });

		expect(health.maxHealth).toBe(50);
		expect(health.currentHealth).toBe(50);
	});

	it('treats non-finite radius as default one meter and clamps negative radius to zero', () => {
		const withNaNRadius = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0.5, y: 0, z: 0 }],
			deltaSeconds: 1,
			radiusMeters: Number.NaN,
		});
		const withNegativeRadius = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 0 }],
			deltaSeconds: 1,
			radiusMeters: -10,
		});

		expect(withNaNRadius.damageApplied).toBe(15);
		expect(withNegativeRadius.damageApplied).toBe(15);
	});

	it('computes proximity distance relative to the player world position', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 10, y: 0, z: 0 },
			burningDrumPositions: [{ x: 10.5, y: 0, z: 0 }],
			deltaSeconds: 1,
			radiusMeters: 1,
		});

		expect(result.damageApplied).toBe(15);
	});

	it('returns a full no-damage contract when player is already at zero health (burning)', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState({ currentHealth: 0 }),
			state: { proximityDamageElapsedSeconds: 0.8 },
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 0 }],
			deltaSeconds: 1,
		});

		expect(result.health.currentHealth).toBe(0);
		expect(result.state.proximityDamageElapsedSeconds).toBe(0);
		expect(result.didApplyDamage).toBe(false);
		expect(result.damageApplied).toBe(0);
	});

	it('returns a full no-damage contract when player is already at zero health (explosion)', () => {
		const result = applyPlayerOilDrumExplosionDamage({
			health: createPlayerHealthState({ currentHealth: 0 }),
			playerPosition: { x: 0, y: 0, z: 0 },
			explosionPositions: [{ x: 0, y: 0, z: 0 }],
		});

		expect(result.health.currentHealth).toBe(0);
		expect(result.state.proximityDamageElapsedSeconds).toBe(0);
		expect(result.didApplyDamage).toBe(false);
		expect(result.damageApplied).toBe(0);
	});

	it('keeps elapsed remainder as elapsed minus consumed whole seconds', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: { proximityDamageElapsedSeconds: 0.25 },
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 0 }],
			deltaSeconds: 2.4,
			radiusMeters: 1,
		});

		expect(result.damageApplied).toBe(30);
		expect(result.state.proximityDamageElapsedSeconds).toBeCloseTo(0.65, 6);
	});

	it('floors and clamps configured damage-per-second to at least 1', () => {
		const floored = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 0 }],
			deltaSeconds: 1,
			damagePerSecond: 15.9,
		});
		const clamped = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState(),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0, y: 0, z: 0 }],
			deltaSeconds: 1,
			damagePerSecond: 0,
		});

		expect(floored.damageApplied).toBe(15);
		expect(clamped.damageApplied).toBe(1);
	});

	it('clamps explosion damage to max health and keeps damageApplied consistent with clamp', () => {
		const result = applyPlayerOilDrumExplosionDamage({
			health: createPlayerHealthState({ currentHealth: 20, maxHealth: 100 }),
			playerPosition: { x: 0, y: 0, z: 0 },
			explosionPositions: [{ x: 0, y: 0, z: 0 }],
			damagePerExplosion: 75,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(0);
		expect(result.damageApplied).toBe(20);
		expect(result.didApplyDamage).toBe(true);
	});
});
