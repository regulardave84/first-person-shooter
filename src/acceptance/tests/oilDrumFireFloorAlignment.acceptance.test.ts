import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS,
	DEFAULT_OIL_DRUM_SPRITE_SCALE,
	advanceOilDrumFireAnimation,
	applyOilDrumHit,
} from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum fire scaling preserves floor contact', () => {
	it('Entering fire state keeps oil drum bottom aligned to floor', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.position.set(0, 1, 0);
		sprite.scale.set(
			DEFAULT_OIL_DRUM_SPRITE_SCALE.x,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.y,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.z,
		);
		const defaultTexture = new THREE.Texture();
		(defaultTexture.userData as { oilDrumVisibleCoverageRatio?: number }).oilDrumVisibleCoverageRatio =
			0.64;
		(sprite.material as THREE.SpriteMaterial).map = defaultTexture;
		const fireTextures = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.map(() => {
			const texture = new THREE.Texture();
			(texture.userData as { oilDrumVisibleCoverageRatio?: number }).oilDrumVisibleCoverageRatio =
				0.16;
			return texture;
		});
		const load = vi.fn((url: string) => {
			const textureIndex =
				DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.indexOf(url);
			return fireTextures[Math.max(0, textureIndex)];
		});

		applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect(sprite.scale.y).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.y * 2);
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);
	});

	it('Fire animation frame changes keep floor alignment', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.position.set(0, 1, 0);
		sprite.scale.set(
			DEFAULT_OIL_DRUM_SPRITE_SCALE.x,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.y,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.z,
		);
		const defaultTexture = new THREE.Texture();
		(defaultTexture.userData as { oilDrumVisibleCoverageRatio?: number }).oilDrumVisibleCoverageRatio =
			0.64;
		(sprite.material as THREE.SpriteMaterial).map = defaultTexture;
		const fireTextures = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.map(() => {
			const texture = new THREE.Texture();
			(texture.userData as { oilDrumVisibleCoverageRatio?: number }).oilDrumVisibleCoverageRatio =
				0.16;
			return texture;
		});
		const load = vi.fn((url: string, onLoad?: (texture: THREE.Texture) => void) => {
			const textureIndex =
				DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.indexOf(url);
			const texture = fireTextures[Math.max(0, textureIndex)];
			onLoad?.(texture);
			return texture;
		});

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

		expect((sprite.material as THREE.SpriteMaterial).map).toBe(fireTextures[1]);
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);
	});

	it('Destroyed visual restores default transform baseline', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.position.set(0, 1, 0);
		sprite.scale.set(
			DEFAULT_OIL_DRUM_SPRITE_SCALE.x,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.y,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.z,
		);
		const defaultTexture = new THREE.Texture();
		(defaultTexture.userData as { oilDrumVisibleCoverageRatio?: number }).oilDrumVisibleCoverageRatio =
			0.64;
		(sprite.material as THREE.SpriteMaterial).map = defaultTexture;
		const fireTexture = new THREE.Texture();
		(fireTexture.userData as { oilDrumVisibleCoverageRatio?: number }).oilDrumVisibleCoverageRatio =
			0.16;
		const destroyedTexture = new THREE.Texture();
		const load = vi.fn((url: string) => {
			if (url.includes('oil_drum_destroyed.png')) {
				return destroyedTexture;
			}
			return fireTexture;
		});

		const belowHalf = applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);

		applyOilDrumHit({
			health: belowHalf.health,
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect((sprite.material as THREE.SpriteMaterial).map).toBe(destroyedTexture);
		expect(sprite.scale.x).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.x);
		expect(sprite.scale.y).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.y);
		expect(sprite.position.y).toBeCloseTo(1);
	});
});
