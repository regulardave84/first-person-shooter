import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT,
	DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS,
	DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS,
	DEFAULT_OIL_DRUM_SPRITE_SCALE,
	advanceOilDrumExplosionAnimation,
	advanceOilDrumFireAnimation,
	applyOilDrumHit,
} from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum burning frames preserve default visual size', () => {
	it('Fire visual keeps same apparent size as default drum', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.scale.set(
			DEFAULT_OIL_DRUM_SPRITE_SCALE.x,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.y,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.z,
		);
		const defaultTexture = new THREE.Texture();
		(
			defaultTexture.userData as { oilDrumVisibleCoverageRatio?: number }
		).oilDrumVisibleCoverageRatio = 0.64;
		(sprite.material as THREE.SpriteMaterial).map = defaultTexture;
		const fireTextures = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.map(() => {
			const texture = new THREE.Texture();
			(
				texture.userData as { oilDrumVisibleCoverageRatio?: number }
			).oilDrumVisibleCoverageRatio = 0.16;
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

		expect(sprite.scale.x).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.x * 2);
		expect(sprite.scale.y).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.y * 2);
	});

	it('Fire animation continues while scale compensation is active', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.scale.set(
			DEFAULT_OIL_DRUM_SPRITE_SCALE.x,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.y,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.z,
		);
		const defaultTexture = new THREE.Texture();
		(
			defaultTexture.userData as { oilDrumVisibleCoverageRatio?: number }
		).oilDrumVisibleCoverageRatio = 0.64;
		(sprite.material as THREE.SpriteMaterial).map = defaultTexture;
		const fireTextures = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.map(() => {
			const texture = new THREE.Texture();
			(
				texture.userData as { oilDrumVisibleCoverageRatio?: number }
			).oilDrumVisibleCoverageRatio = 0.16;
			return texture;
		});
		const load = vi.fn(
			(url: string, onLoad?: (texture: THREE.Texture) => void) => {
				const textureIndex =
					DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.indexOf(url);
				const texture = fireTextures[Math.max(0, textureIndex)];
				onLoad?.(texture);
				return texture;
			},
		);

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
		expect(sprite.scale.x).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.x * 2);
		expect(sprite.scale.y).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.y * 2);
	});

	it('Missing image-data metadata falls back safely', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.scale.set(
			DEFAULT_OIL_DRUM_SPRITE_SCALE.x,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.y,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.z,
		);
		const defaultTexture = new THREE.Texture();
		(sprite.material as THREE.SpriteMaterial).map = defaultTexture;
		const load = vi.fn(() => new THREE.Texture());

		applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect(sprite.scale.x).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.x);
		expect(sprite.scale.y).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.y);
	});

	it('Destroyed visual removes fire scale compensation', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.scale.set(
			DEFAULT_OIL_DRUM_SPRITE_SCALE.x,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.y,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.z,
		);
		const defaultTexture = new THREE.Texture();
		(
			defaultTexture.userData as { oilDrumVisibleCoverageRatio?: number }
		).oilDrumVisibleCoverageRatio = 0.64;
		(sprite.material as THREE.SpriteMaterial).map = defaultTexture;
		const fireTexture = new THREE.Texture();
		(
			fireTexture.userData as { oilDrumVisibleCoverageRatio?: number }
		).oilDrumVisibleCoverageRatio = 0.16;
		const explosionTextures = DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
		const destroyedTexture = new THREE.Texture();
		const load = vi.fn((url: string) => {
			if (url.includes('oil_drum_destroyed.png')) {
				return destroyedTexture;
			}
			const explosionTextureIndex =
				DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.indexOf(url);
			if (explosionTextureIndex >= 0) {
				return explosionTextures[explosionTextureIndex];
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
		expect(sprite.scale.x).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.x * 2);

		const destroyed = applyOilDrumHit({
			health: belowHalf.health,
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		advanceOilDrumExplosionAnimation({
			health: destroyed.health,
			sprite,
			deltaSeconds:
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT /
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
			textureLoader: { load },
		});

		expect((sprite.material as THREE.SpriteMaterial).map).toBe(
			destroyedTexture,
		);
		expect(sprite.scale.x).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.x);
		expect(sprite.scale.y).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.y);
	});
});
