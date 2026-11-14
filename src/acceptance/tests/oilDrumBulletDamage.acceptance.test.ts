import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT,
	advanceOilDrumExplosionAnimation,
	applyOilDrumHit,
} from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum takes configurable bullet damage', () => {
	it('Bullet hit applies configured damage to oil drum health', () => {
		const hit = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
		});

		expect(hit.health.currentHealth).toBe(65);
		expect(hit.health.maxHealth).toBe(100);
	});

	it('Repeated bullet hits stack damage independently', () => {
		const first = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
		});
		const second = applyOilDrumHit({
			health: first.health,
			source: 'bullet',
			bulletDamage: 35,
		});

		expect(second.health.currentHealth).toBe(30);
	});

	it('Oil drum becomes inactive when health reaches zero or below from bullets', () => {
		const scene = new THREE.Scene();
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		scene.add(sprite);
		const load = vi.fn(() => new THREE.Texture());

		const hit = applyOilDrumHit({
			health: { currentHealth: 35, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect(hit.health.currentHealth).toBe(0);
		expect(hit.wasRemoved).toBe(false);
		expect(scene.children).toContain(sprite);
	});

	it('Bullet-only damage does not apply from non-bullet sources', () => {
		const hit = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'non-bullet',
			bulletDamage: 35,
		});

		expect(hit.health.currentHealth).toBe(100);
		expect(hit.didApplyDamage).toBe(false);
	});

	it('Oil drum damage and destroyed-visual events are logged', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const load = vi.fn(() => new THREE.Texture());
		const info = vi.fn();

		applyOilDrumHit({
			health: { currentHealth: 35, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
			logger: { info },
		});

		expect(info).toHaveBeenCalledWith(
			'oil.drum.damaged',
			expect.objectContaining({ damageApplied: 35 }),
		);
		expect(info).toHaveBeenCalledWith(
			'oil.drum.explosion.visual.updated',
			expect.objectContaining({
				assetUrls: expect.arrayContaining([
					expect.stringContaining('oil_drum_explosion_01.png'),
				]),
			}),
		);

		advanceOilDrumExplosionAnimation({
			health: { currentHealth: 0, maxHealth: 100 },
			sprite,
			deltaSeconds:
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT /
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
			textureLoader: { load },
			logger: { info },
		});
		expect(info).toHaveBeenCalledWith(
			'oil.drum.destroyed.visual.updated',
			expect.objectContaining({
				assetUrl: expect.stringContaining('oil_drum_destroyed.png'),
			}),
		);
	});
});
