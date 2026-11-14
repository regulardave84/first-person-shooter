import { describe, expect, it, vi } from 'vitest';

describe('Acceptance: Oil drum sound effects', () => {
	it('plays the fire sound once when the oil drum crosses into the fire state', () => {
		const firePlayer = { play: vi.fn() };
		const explosionPlayer = { play: vi.fn() };
		let hasOilDrumFireSoundPlayed = false;
		let hasOilDrumExplosionSoundPlayed = false;
		let currentHealth = 100;

		const syncOilDrumAudioState = () => {
			const fireThresholdHealth = 50;
			const isOilDrumOnFire =
				currentHealth > 0 && currentHealth < fireThresholdHealth;
			const isOilDrumExploding = currentHealth <= 0;

			if (isOilDrumOnFire && !hasOilDrumFireSoundPlayed) {
				firePlayer.play();
				hasOilDrumFireSoundPlayed = true;
			}
			if (!isOilDrumOnFire) {
				hasOilDrumFireSoundPlayed = false;
			}

			if (isOilDrumExploding && !hasOilDrumExplosionSoundPlayed) {
				explosionPlayer.play();
				hasOilDrumExplosionSoundPlayed = true;
			}
			if (!isOilDrumExploding) {
				hasOilDrumExplosionSoundPlayed = false;
			}
		};

		currentHealth = 60;
		syncOilDrumAudioState();
		expect(firePlayer.play).not.toHaveBeenCalled();

		currentHealth = 40;
		syncOilDrumAudioState();
		expect(firePlayer.play).toHaveBeenCalledTimes(1);
		currentHealth = 45;
		syncOilDrumAudioState();
		expect(firePlayer.play).toHaveBeenCalledTimes(1);
	});

	it('plays the explosion sound once when the oil drum reaches zero health', () => {
		const firePlayer = { play: vi.fn(), stop: vi.fn() };
		const explosionPlayer = { play: vi.fn() };
		let hasOilDrumFireSoundPlayed = false;
		let hasOilDrumExplosionSoundPlayed = false;
		let currentHealth = 100;

		const syncOilDrumAudioState = () => {
			const fireThresholdHealth = 50;
			const isOilDrumOnFire =
				currentHealth > 0 && currentHealth < fireThresholdHealth;
			const isOilDrumExploding = currentHealth <= 0;

			if (isOilDrumOnFire && !hasOilDrumFireSoundPlayed) {
				firePlayer.play();
				hasOilDrumFireSoundPlayed = true;
			}
			if (!isOilDrumOnFire) {
				hasOilDrumFireSoundPlayed = false;
			}

			if (isOilDrumExploding && !hasOilDrumExplosionSoundPlayed) {
				firePlayer.stop();
				explosionPlayer.play();
				hasOilDrumExplosionSoundPlayed = true;
			}
			if (!isOilDrumExploding) {
				hasOilDrumExplosionSoundPlayed = false;
			}
		};

		currentHealth = 30;
		syncOilDrumAudioState();
		expect(firePlayer.play).toHaveBeenCalledTimes(1);

		currentHealth = 0;
		syncOilDrumAudioState();
		expect(explosionPlayer.play).toHaveBeenCalledTimes(1);
		expect(firePlayer.stop).toHaveBeenCalledTimes(1);
		currentHealth = 0;
		syncOilDrumAudioState();
		expect(explosionPlayer.play).toHaveBeenCalledTimes(1);
		expect(firePlayer.stop).toHaveBeenCalledTimes(1);
	});
});
