import { describe, expect, it } from 'vitest';
import {
	PROJECTILE_FIRE_RATE,
	WORLD_PROJECTILE_COLLIDERS,
	advancePrimaryFireState,
	createEntityCollider,
	createInitialPrimaryFireState,
	setPrimaryFirePressedState,
	spawnProjectilesFromLook,
	stepProjectiles,
} from './fpsRuntime';

describe('Acceptance: Player machine-gun bullet firing', () => {
	it('Single left click fires exactly one bullet immediately when pointer lock is active', () => {
		let state = createInitialPrimaryFireState();
		state = setPrimaryFirePressedState(state, true, true);

		const advanced = advancePrimaryFireState({
			state,
			dt: 0,
			isPointerLockActive: true,
		});
		const spawned = spawnProjectilesFromLook({
			state: advanced.state,
			count: advanced.shotsToSpawn,
			origin: { x: 0, y: 1.6, z: 0 },
			yaw: 0,
			pitch: 0,
		});

		expect(advanced.shotsToSpawn).toBe(1);
		expect(spawned.projectiles).toHaveLength(1);
		expect(spawned.projectiles[0].length).toBeGreaterThan(0);
		expect(spawned.projectiles[0].color).toBe(0xffffff);
	});

	it('Holding left mouse continuously fires at 2 bullets per second while pointer lock is active', () => {
		let state = createInitialPrimaryFireState();
		state = setPrimaryFirePressedState(state, true, true);

		const first = advancePrimaryFireState({
			state,
			dt: 0,
			isPointerLockActive: true,
			fireRate: PROJECTILE_FIRE_RATE,
		});
		const second = advancePrimaryFireState({
			state: first.state,
			dt: 0.51,
			isPointerLockActive: true,
			fireRate: PROJECTILE_FIRE_RATE,
		});
		const third = advancePrimaryFireState({
			state: second.state,
			dt: 0.51,
			isPointerLockActive: true,
			fireRate: PROJECTILE_FIRE_RATE,
		});

		expect(first.shotsToSpawn).toBe(1);
		expect(second.shotsToSpawn).toBe(1);
		expect(third.shotsToSpawn).toBe(1);
	});

	it('Releasing left mouse stops continuous firing', () => {
		let state = createInitialPrimaryFireState();
		state = setPrimaryFirePressedState(state, true, true);
		const fired = advancePrimaryFireState({
			state,
			dt: 0,
			isPointerLockActive: true,
		});
		state = setPrimaryFirePressedState(fired.state, false, true);

		const afterRelease = advancePrimaryFireState({
			state,
			dt: 2,
			isPointerLockActive: true,
		});

		expect(afterRelease.shotsToSpawn).toBe(0);
	});

	it('Bullets stop and disappear on impact with world or entity geometry', () => {
		const entityColliders = [
			createEntityCollider({ x: 0, y: 1.6, z: -1, w: 1, h: 1, d: 1 }),
		];
		const spawned = spawnProjectilesFromLook({
			state: createInitialPrimaryFireState(),
			count: 1,
			origin: { x: 0, y: 1.6, z: 0 },
			yaw: 0,
			pitch: 0,
		});

		const stepped = stepProjectiles({
			projectiles: spawned.projectiles,
			dt: 1,
			worldColliders: WORLD_PROJECTILE_COLLIDERS,
			entityColliders,
		});

		expect(stepped.impacts).toHaveLength(1);
		expect(stepped.activeProjectiles).toHaveLength(0);
	});

	it('Firing input is ignored when pointer lock is inactive', () => {
		let state = createInitialPrimaryFireState();
		state = setPrimaryFirePressedState(state, true, false);

		const advanced = advancePrimaryFireState({
			state,
			dt: 1,
			isPointerLockActive: false,
		});

		expect(advanced.shotsToSpawn).toBe(0);
	});
});
