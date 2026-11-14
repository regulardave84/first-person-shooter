import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_FIRE_ANIMATION_FRAME_COUNT,
	advanceOilDrumFireAnimation,
	applyOilDrumHit,
} from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum fire visual below half health', () => {
	it('Oil drum enters fire visual state below half health', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const fireTexture = new THREE.Texture();
		const load = vi.fn(() => fireTexture);

		const hit = applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect(hit.health.currentHealth).toBe(30);
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(fireTexture);
	});

	it('Fire animation advances while oil drum remains below half health', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const fireTexture = new THREE.Texture();
		const load = vi.fn(() => fireTexture);

		applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		advanceOilDrumFireAnimation({
			health: { currentHealth: 30, maxHealth: 100 },
			sprite,
			deltaSeconds: 1 / DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS,
		});

		expect(fireTexture.offset.x).toBeCloseTo(
			1 / DEFAULT_OIL_DRUM_FIRE_ANIMATION_FRAME_COUNT,
		);
	});

	it('Oil drum does not enter fire visual state at half health', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const initialTexture = new THREE.Texture();
		(sprite.material as THREE.SpriteMaterial).map = initialTexture;
		const load = vi.fn(() => new THREE.Texture());

		const hit = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 50,
			sprite,
			textureLoader: { load },
		});

		expect(hit.health.currentHealth).toBe(50);
		expect(load).not.toHaveBeenCalled();
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(initialTexture);
	});

	it('Destroyed visual overrides fire visual at zero health', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const fireTexture = new THREE.Texture();
		const destroyedTexture = new THREE.Texture();
		const load = vi
			.fn()
			.mockReturnValueOnce(fireTexture)
			.mockReturnValueOnce(destroyedTexture);

		const belowHalf = applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		const destroyed = applyOilDrumHit({
			health: belowHalf.health,
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect(destroyed.health.currentHealth).toBe(0);
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(
			destroyedTexture,
		);
	});
});
