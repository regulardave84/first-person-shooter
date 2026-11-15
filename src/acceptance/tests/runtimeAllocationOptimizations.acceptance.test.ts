import { describe, expect, it } from 'vitest';
import {
	createEntityCollider,
	createInitialPrimaryFireState,
	spawnProjectilesFromLook,
	stepProjectiles,
} from '../../runtime/combat';
import {
	advancePlayerBurningOilDrumProximityDamage,
	createInitialPlayerHazardTickState,
	createPlayerHealthState,
} from '../../app/playerHazardDamage';

describe('Acceptance: Runtime allocation optimizations', () => {
	it('Projectile visuals are updated in place across frames', () => {
		const spawn = spawnProjectilesFromLook({
			state: createInitialPrimaryFireState(),
			count: 1,
			origin: { x: 0, y: 1.6, z: 0 },
			yaw: 0,
			pitch: 0,
		});

		const firstStep = stepProjectiles({
			projectiles: spawn.projectiles,
			dt: 0.01,
			worldColliders: [],
			entityColliders: [],
		});
		const secondStep = stepProjectiles({
			projectiles: firstStep.activeProjectiles,
			dt: 0.01,
			worldColliders: [],
			entityColliders: [],
		});

		expect(secondStep.activeProjectiles).toHaveLength(1);
		expect(secondStep.activeProjectiles[0]?.id).toBe(
			spawn.projectiles[0]?.id,
		);
		expect(secondStep.activeProjectiles[0]?.head.z).toBeLessThan(
			firstStep.activeProjectiles[0]?.head.z ?? 0,
		);
	});

	it('Oil-drum projectile collider and proximity hazard inputs are reused with unchanged burn outcomes', () => {
		const sharedEntityCollider = createEntityCollider({
			x: 1.25,
			y: 1,
			z: 2.25,
			w: 1.5,
			h: 2.2,
			d: 1.5,
		});
		const sharedEntityColliders = [sharedEntityCollider];
		const sharedBurningDrumPosition = [{ x: 0.4, y: 0, z: 0.4 }];

		const health = createPlayerHealthState({ currentHealth: 100, maxHealth: 100 });
		const state = createInitialPlayerHazardTickState();
		const firstBurn = advancePlayerBurningOilDrumProximityDamage({
			health,
			state,
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: sharedBurningDrumPosition,
			deltaSeconds: 0.5,
			radiusMeters: 1,
		});

		sharedBurningDrumPosition[0] = { x: 2, y: 0, z: 2 };
		const secondBurn = advancePlayerBurningOilDrumProximityDamage({
			health: firstBurn.health,
			state: firstBurn.state,
			playerPosition: { x: 0, y: 0, z: 0 },
			burningDrumPositions: sharedBurningDrumPosition,
			deltaSeconds: 0.5,
			radiusMeters: 1,
		});

		const projectile = {
			id: 1,
			head: { x: 1.25, y: 1, z: 1.5 },
			direction: { x: 0, y: 0, z: 1 },
			speed: 45,
			length: 0.35,
			color: 0xffffff,
		};
		const firstStep = stepProjectiles({
			projectiles: [projectile],
			dt: 0.02,
			worldColliders: [],
			entityColliders: sharedEntityColliders,
		});
		const secondStep = stepProjectiles({
			projectiles: [projectile],
			dt: 0.02,
			worldColliders: [],
			entityColliders: sharedEntityColliders,
		});

		expect(secondBurn.health.currentHealth).toBe(100);
		expect(firstStep.impacts[0]?.colliderKind).toBe('entity');
		expect(secondStep.impacts[0]?.colliderKind).toBe('entity');
	});

	it('Projectile spawning appends without replacing active projectile state containers', () => {
		const firstSpawn = spawnProjectilesFromLook({
			state: createInitialPrimaryFireState(),
			count: 1,
			origin: { x: 0, y: 1.6, z: 0 },
			yaw: 0,
			pitch: 0,
		});
		const activeProjectiles = [...firstSpawn.projectiles];
		const secondSpawn = spawnProjectilesFromLook({
			state: firstSpawn.state,
			count: 1,
			origin: { x: 0, y: 1.6, z: 0 },
			yaw: 0,
			pitch: 0,
		});

		activeProjectiles.push(...secondSpawn.projectiles);

		expect(activeProjectiles).toHaveLength(2);
		expect(activeProjectiles[0]?.id).toBe(1);
		expect(activeProjectiles[1]?.id).toBe(2);
		const stepped = stepProjectiles({
			projectiles: activeProjectiles,
			dt: 0.01,
			worldColliders: [],
			entityColliders: [],
		});
		expect(stepped.activeProjectiles).toHaveLength(2);
	});
});
