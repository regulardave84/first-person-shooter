import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { applyOilDrumHit } from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum destroyed visual state', () => {
	it('Oil drum swaps to destroyed sprite at zero health', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const destroyedTexture = new THREE.Texture();
		const load = vi.fn(() => destroyedTexture);

		const hit = applyOilDrumHit({
			health: { currentHealth: 35, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect(hit.health.currentHealth).toBe(0);
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(
			destroyedTexture,
		);
	});

	it('Destroyed oil drum remains in scene and becomes inactive', () => {
		const scene = new THREE.Scene();
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		scene.add(sprite);
		const destroyedTexture = new THREE.Texture();
		const load = vi.fn(() => destroyedTexture);

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

	it('Additional bullet hits do not apply after destruction', () => {
		const first = applyOilDrumHit({
			health: { currentHealth: 35, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
		});
		const second = applyOilDrumHit({
			health: first.health,
			source: 'bullet',
			bulletDamage: 35,
		});

		expect(first.damageApplied).toBe(35);
		expect(second.damageApplied).toBe(0);
		expect(second.health.currentHealth).toBe(0);
	});

	it('Destroyed-state transition logs damage and visual swap', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const destroyedTexture = new THREE.Texture();
		const load = vi.fn(() => destroyedTexture);
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
			'oil.drum.destroyed.visual.updated',
			expect.objectContaining({
				assetUrl: expect.stringContaining('oil_drum_destroyed.png'),
			}),
		);
	});
});
