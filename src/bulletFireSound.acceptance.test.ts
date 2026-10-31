import { describe, expect, it, vi } from 'vitest';
import {
	PROJECTILE_FIRE_RATE,
	advancePrimaryFireState,
	createInitialPrimaryFireState,
	playBulletFireSounds,
	setPrimaryFirePressedState,
} from './fpsRuntime';

describe('Acceptance: Bullet firing sound', () => {
	it('A firing sound plays for a single valid left-click shot', () => {
		let state = createInitialPrimaryFireState();
		state = setPrimaryFirePressedState(state, true, true);

		const advanced = advancePrimaryFireState({
			state,
			dt: 0,
			isPointerLockActive: true,
		});
		const player = { play: vi.fn() };
		playBulletFireSounds(player, advanced.shotsToSpawn);

		expect(advanced.shotsToSpawn).toBe(1);
		expect(player.play).toHaveBeenCalledTimes(1);
	});

	it('Holding left mouse plays one sound per emitted bullet at fire cadence', () => {
		let state = createInitialPrimaryFireState();
		state = setPrimaryFirePressedState(state, true, true);
		const player = { play: vi.fn() };

		const first = advancePrimaryFireState({
			state,
			dt: 0,
			isPointerLockActive: true,
			fireRate: PROJECTILE_FIRE_RATE,
		});
		playBulletFireSounds(player, first.shotsToSpawn);

		const second = advancePrimaryFireState({
			state: first.state,
			dt: 0.51,
			isPointerLockActive: true,
			fireRate: PROJECTILE_FIRE_RATE,
		});
		playBulletFireSounds(player, second.shotsToSpawn);

		expect(player.play).toHaveBeenCalledTimes(
			first.shotsToSpawn + second.shotsToSpawn,
		);
	});

	it('Releasing left mouse stops additional firing sounds', () => {
		let state = createInitialPrimaryFireState();
		state = setPrimaryFirePressedState(state, true, true);
		const first = advancePrimaryFireState({
			state,
			dt: 0,
			isPointerLockActive: true,
		});
		state = setPrimaryFirePressedState(first.state, false, true);
		const afterRelease = advancePrimaryFireState({
			state,
			dt: 2,
			isPointerLockActive: true,
		});
		const player = { play: vi.fn() };

		playBulletFireSounds(player, first.shotsToSpawn);
		playBulletFireSounds(player, afterRelease.shotsToSpawn);

		expect(afterRelease.shotsToSpawn).toBe(0);
		expect(player.play).toHaveBeenCalledTimes(1);
	});

	it('No firing sound is played when firing input is ignored', () => {
		let state = createInitialPrimaryFireState();
		state = setPrimaryFirePressedState(state, true, false);
		const advanced = advancePrimaryFireState({
			state,
			dt: 1,
			isPointerLockActive: false,
		});
		const player = { play: vi.fn() };
		playBulletFireSounds(player, advanced.shotsToSpawn);

		expect(advanced.shotsToSpawn).toBe(0);
		expect(player.play).not.toHaveBeenCalled();
	});

	it('Sound trigger is coupled to bullet emission only', () => {
		const player = { play: vi.fn() };
		playBulletFireSounds(player, 0);
		playBulletFireSounds(player, 3);

		expect(player.play).toHaveBeenCalledTimes(3);
	});
});
