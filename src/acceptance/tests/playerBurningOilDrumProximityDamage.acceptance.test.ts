import { describe, expect, it } from 'vitest';
import {
	advancePlayerBurningOilDrumProximityDamage,
	createInitialPlayerHazardTickState,
	createPlayerHealthState,
} from '../../app/playerHazardDamage';

describe('Acceptance: Player takes proximity damage from burning oil drums', () => {
	it('Player takes 15 damage after one second within one meter of a burning oil drum', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState({ currentHealth: 100 }),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0.5, y: 0, z: 0.5 }],
			deltaSeconds: 1,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(85);
	});

	it('Player does not take proximity damage while outside one meter', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState({ currentHealth: 100 }),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 1.1, y: 0, z: 0 }],
			deltaSeconds: 2,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(100);
	});

	it('Proximity damage stops immediately after leaving range', () => {
		const firstHalf = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState({ currentHealth: 100 }),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0.5, y: 0, z: 0.5 }],
			deltaSeconds: 0.5,
			radiusMeters: 1,
		});
		const outsideRange = advancePlayerBurningOilDrumProximityDamage({
			health: firstHalf.health,
			state: firstHalf.state,
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 2, y: 0, z: 0 }],
			deltaSeconds: 0.5,
			radiusMeters: 1,
		});

		expect(outsideRange.health.currentHealth).toBe(100);
	});

	it('Proximity damage can reduce health to zero but not below', () => {
		const result = advancePlayerBurningOilDrumProximityDamage({
			health: createPlayerHealthState({ currentHealth: 10 }),
			state: createInitialPlayerHazardTickState(),
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: [{ x: 0.5, y: 0, z: 0.5 }],
			deltaSeconds: 1,
			radiusMeters: 1,
		});

		expect(result.health.currentHealth).toBe(0);
		expect(result.health.currentHealth).toBeGreaterThanOrEqual(0);
	});
});
