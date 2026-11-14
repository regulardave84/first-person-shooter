import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT,
	DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS,
	DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS,
	DEFAULT_OIL_DRUM_SPRITE_ALPHA_TEST,
	DEFAULT_OIL_DRUM_SPRITE_SCALE,
	advanceOilDrumExplosionAnimation,
	advanceOilDrumFireAnimation,
	applyOilDrumHit,
	createOilDrumSprite,
} from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum explosion visual bug fixes', () => {
	it('Oil drum sprite rendering avoids visible rectangle border artifacts', () => {
		const defaultTexture = new THREE.Texture();
		const fireTextures = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
		const explosionTextures = DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
		const destroyedTexture = new THREE.Texture();
		const load = vi.fn(
			(url: string, onLoad?: (texture: THREE.Texture) => void) => {
				if (url.includes('oil_drum_destroyed.png')) {
					return destroyedTexture;
				}
				const fireIndex =
					DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.indexOf(url);
				if (fireIndex >= 0) {
					return fireTextures[fireIndex];
				}
				const explosionIndex =
					DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.indexOf(url);
				if (explosionIndex >= 0) {
					onLoad?.(explosionTextures[explosionIndex]);
					return explosionTextures[explosionIndex];
				}
				return defaultTexture;
			},
		);
		const sprite = createOilDrumSprite({ textureLoader: { load } });

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
		const destroyedByHit = applyOilDrumHit({
			health: { currentHealth: 30, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		advanceOilDrumExplosionAnimation({
			health: destroyedByHit.health,
			sprite,
			deltaSeconds:
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT /
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
			textureLoader: { load },
		});

		const material = sprite.material as THREE.SpriteMaterial;
		expect(material.alphaTest).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_ALPHA_TEST);
		expect(defaultTexture.wrapS).toBe(THREE.ClampToEdgeWrapping);
		expect(defaultTexture.wrapT).toBe(THREE.ClampToEdgeWrapping);
		expect(defaultTexture.generateMipmaps).toBe(false);
		expect(explosionTextures[0]?.wrapS).toBe(THREE.ClampToEdgeWrapping);
		expect(explosionTextures[0]?.wrapT).toBe(THREE.ClampToEdgeWrapping);
	});

	it('Explosion animation remains floor-aligned', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.position.set(0, 1, 0);
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
		const load = vi.fn(
			(url: string, onLoad?: (texture: THREE.Texture) => void) => {
				if (url.includes('oil_drum_burning')) {
					return fireTexture;
				}
				const index = DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.indexOf(url);
				const texture = explosionTextures[Math.max(0, index)];
				onLoad?.(texture);
				return texture;
			},
		);

		const fireHit = applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);

		const destroyedHit = applyOilDrumHit({
			health: fireHit.health,
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		expect(destroyedHit.health.currentHealth).toBe(0);
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);

		advanceOilDrumExplosionAnimation({
			health: destroyedHit.health,
			sprite,
			deltaSeconds: 1 / DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
			textureLoader: { load },
		});
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);
	});

	it('Explosion completion still transitions to destroyed baseline', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.position.set(0, 1, 0);
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
		const load = vi.fn(
			(url: string, onLoad?: (texture: THREE.Texture) => void) => {
				if (url.includes('oil_drum_destroyed.png')) {
					return destroyedTexture;
				}
				if (url.includes('oil_drum_burning')) {
					return fireTexture;
				}
				const index = DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.indexOf(url);
				const texture = explosionTextures[Math.max(0, index)];
				onLoad?.(texture);
				return texture;
			},
		);

		const inFire = applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		const exploded = applyOilDrumHit({
			health: inFire.health,
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		advanceOilDrumExplosionAnimation({
			health: exploded.health,
			sprite,
			deltaSeconds:
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT /
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
			textureLoader: { load },
		});

		expect(
			(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState,
		).toBe('destroyed');
		expect(sprite.position.y).toBeCloseTo(1);
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(
			destroyedTexture,
		);
	});
});
