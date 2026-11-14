import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS,
	advanceOilDrumFireAnimation,
	applyOilDrumHit,
} from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum fire visual below half health', () => {
	it('Oil drum enters fire visual state below half health', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const fireTextures = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
		const load = vi.fn((url: string) => {
			const textureIndex =
				DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.indexOf(url);
			return fireTextures[Math.max(0, textureIndex)];
		});

		const hit = applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect(hit.health.currentHealth).toBe(30);
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(fireTextures[0]);
	});

	it('Fire animation advances while oil drum remains below half health', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const fireTextures = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
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
	});

	it('Fire animation skips failed frame files', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const fireTextures = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
		const failedFrameUrl = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS[1];
		const load = vi.fn(
			(
				url: string,
				onLoad?: (texture: THREE.Texture) => void,
				_onProgress?: (event: ProgressEvent<EventTarget>) => void,
				onError?: (error: unknown) => void,
			) => {
				const textureIndex =
					DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.indexOf(url);
				const texture = fireTextures[Math.max(0, textureIndex)];
				if (url === failedFrameUrl) {
					onError?.(new Error('missing frame'));
				} else {
					onLoad?.(texture);
				}
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

		expect((sprite.material as THREE.SpriteMaterial).map).toBe(fireTextures[2]);
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
			const fireTextures = DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.map(
				() => new THREE.Texture(),
			);
		const destroyedTexture = new THREE.Texture();
			const load = vi.fn((url: string) => {
				if (url.includes('oil_drum_destroyed.png')) {
					return destroyedTexture;
				}
				const textureIndex =
					DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.indexOf(url);
				return fireTextures[Math.max(0, textureIndex)];
			});

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
