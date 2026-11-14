import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT,
	DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS,
	advanceOilDrumBurnDamage,
	advanceOilDrumExplosionAnimation,
	applyOilDrumHit,
} from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum burn damage and explosion lifecycle', () => {
	it('Burning oil drum takes 5 damage every second', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState =
			'fire';

		const burn = advanceOilDrumBurnDamage({
			health: { currentHealth: 30, maxHealth: 100 },
			sprite,
			deltaSeconds: 1,
		});

		expect(burn.health.currentHealth).toBe(25);
	});

	it('Partial elapsed time accumulates before applying burn damage', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState =
			'fire';

		const firstHalf = advanceOilDrumBurnDamage({
			health: { currentHealth: 30, maxHealth: 100 },
			sprite,
			deltaSeconds: 0.5,
		});
		const secondHalf = advanceOilDrumBurnDamage({
			health: firstHalf.health,
			sprite,
			deltaSeconds: 0.5,
		});

		expect(firstHalf.health.currentHealth).toBe(30);
		expect(secondHalf.health.currentHealth).toBe(25);
	});

	it('Burn damage triggers explosion at zero health', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState =
			'fire';
		const explosionTextures = DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
		const load = vi.fn((url: string, onLoad?: (texture: THREE.Texture) => void) => {
			const textureIndex =
				DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.indexOf(url);
			const texture = explosionTextures[Math.max(0, textureIndex)];
			onLoad?.(texture);
			return texture;
		});

		const burn = advanceOilDrumBurnDamage({
			health: { currentHealth: 5, maxHealth: 100 },
			sprite,
			deltaSeconds: 1,
			textureLoader: { load },
		});

		expect(burn.health.currentHealth).toBe(0);
		expect((sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState).toBe(
			'exploding',
		);
	});

	it('Explosion animation advances and then completes once', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const explosionTextures = DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
		const destroyedTexture = new THREE.Texture();
		const load = vi.fn((url: string, onLoad?: (texture: THREE.Texture) => void) => {
			if (url.includes('oil_drum_destroyed.png')) {
				return destroyedTexture;
			}
			const textureIndex =
				DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.indexOf(url);
			const texture = explosionTextures[Math.max(0, textureIndex)];
			onLoad?.(texture);
			return texture;
		});

		applyOilDrumHit({
			health: { currentHealth: 5, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		advanceOilDrumExplosionAnimation({
			health: { currentHealth: 0, maxHealth: 100 },
			sprite,
			deltaSeconds:
				(2 * DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT) /
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
			textureLoader: { load },
		});

		expect((sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState).toBe(
			'destroyed',
		);
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(destroyedTexture);
	});

	it('Destroyed drum no longer takes burn damage', () => {
		const noFurtherBurn = advanceOilDrumBurnDamage({
			health: { currentHealth: 0, maxHealth: 100 },
			deltaSeconds: 5,
		});

		expect(noFurtherBurn.health.currentHealth).toBe(0);
		expect(noFurtherBurn.didApplyDamage).toBe(false);
	});
});
