import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_BURN_DAMAGE_PER_SECOND,
	DEFAULT_OIL_DRUM_EXPLOSION_VISIBLE_COVERAGE_RATIO,
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT,
	DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS,
	DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS,
	DEFAULT_OIL_DRUM_FIRE_ANIMATION_FRAME_COUNT,
	DEFAULT_OIL_DRUM_FIRE_THRESHOLD_RATIO,
	DEFAULT_OIL_DRUM_SPRITE_ALPHA_TEST,
	DEFAULT_OIL_DRUM_BULLET_DAMAGE,
	DEFAULT_OIL_DRUM_COLLIDER_HEIGHT,
	DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
	DEFAULT_OIL_DRUM_DESTROYED_SPRITE_ASSET_PATH,
	DEFAULT_OIL_DRUM_MAX_HEALTH,
	DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS,
	DEFAULT_OIL_DRUM_SPAWN_OFFSET,
	DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH,
	DEFAULT_OIL_DRUM_SPRITE_SCALE,
	OIL_DRUM_ENTITY_NAME,
	advanceOilDrumBurnDamage,
	advanceOilDrumExplosionAnimation,
	advanceOilDrumFireAnimation,
	applyOilDrumHit,
	addDefaultOilDrumEntityToScene,
	createOilDrumHealthState,
	createOilDrumMovementCollider,
	createOilDrumSprite,
	resolveOilDrumSpawnPosition,
} from './oilDrumEntity';

describe('oilDrumEntity', () => {
	it('exports stable sprite defaults', () => {
		expect(DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH).toContain('oil_drum.png');
		expect(DEFAULT_OIL_DRUM_DESTROYED_SPRITE_ASSET_PATH).toContain(
			'oil_drum_destroyed.png',
		);
		expect(DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS).toHaveLength(8);
		expect(DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS[0]).toContain(
			'oil_drum_burning_frames/oil_drum_burning_01.png',
		);
		expect(DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS[7]).toContain(
			'oil_drum_burning_frames/oil_drum_burning_08.png',
		);
		expect(DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS).toHaveLength(8);
		expect(DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS[0]).toContain(
			'oil_drum_explosion_frames/oil_drum_explosion_01.png',
		);
		expect(DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS[7]).toContain(
			'oil_drum_explosion_frames/oil_drum_explosion_08.png',
		);
		expect(DEFAULT_OIL_DRUM_FIRE_THRESHOLD_RATIO).toBe(0.5);
		expect(DEFAULT_OIL_DRUM_FIRE_ANIMATION_FRAME_COUNT).toBe(8);
		expect(DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS).toBe(12);
		expect(DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT).toBe(8);
		expect(DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS).toBe(12);
		expect(DEFAULT_OIL_DRUM_BURN_DAMAGE_PER_SECOND).toBe(5);
		expect(DEFAULT_OIL_DRUM_EXPLOSION_VISIBLE_COVERAGE_RATIO).toBe(0.16);
		expect(DEFAULT_OIL_DRUM_SPRITE_ALPHA_TEST).toBe(0.05);
		expect(DEFAULT_OIL_DRUM_SPAWN_OFFSET).toEqual({
			x: 1.25,
			y: -0.6,
			z: -3.75,
		});
		expect(DEFAULT_OIL_DRUM_SPRITE_SCALE).toEqual({ x: 1.8, y: 2.2, z: 1 });
		expect(DEFAULT_OIL_DRUM_COLLIDER_RADIUS).toBeCloseTo(0.75);
		expect(DEFAULT_OIL_DRUM_COLLIDER_HEIGHT).toBeCloseTo(2.25);
		expect(DEFAULT_OIL_DRUM_MAX_HEALTH).toBe(100);
		expect(DEFAULT_OIL_DRUM_BULLET_DAMAGE).toBe(35);
	});

	it('creates default health state as 100/100', () => {
		const health = createOilDrumHealthState();

		expect(health).toEqual({
			currentHealth: 100,
			maxHealth: 100,
		});
	});

	it('resolves a default spawn position in front of the player', () => {
		const playerStartPosition = { x: 0, y: 1.6, z: 6 };

		const spawn = resolveOilDrumSpawnPosition(playerStartPosition);

		expect(spawn.x).toBeCloseTo(1.25);
		expect(spawn.y).toBeCloseTo(1);
		expect(spawn.z).toBeCloseTo(2.25);
	});

	it('creates an oil drum movement collider with fixed radius and height span', () => {
		const collider = createOilDrumMovementCollider({ x: 1.25, y: 1, z: 2.25 });

		expect(collider).toEqual({
			x: 1.25,
			z: 2.25,
			radius: DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
			minY: 1 - DEFAULT_OIL_DRUM_COLLIDER_HEIGHT / 2,
			maxY: 1 + DEFAULT_OIL_DRUM_COLLIDER_HEIGHT / 2,
		});
	});

	it('creates a named sprite with default scale and texture', () => {
		const texture = new THREE.Texture();
		const load = vi.fn(() => texture);

		const sprite = createOilDrumSprite({
			textureLoader: { load },
		});

		expect(load).toHaveBeenCalledWith(
			expect.stringContaining('oil_drum.png'),
			undefined,
			undefined,
			expect.any(Function),
		);
		expect(sprite.name).toBe(OIL_DRUM_ENTITY_NAME);
		expect(sprite.material).toBeInstanceOf(THREE.SpriteMaterial);
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(texture);
		expect((sprite.material as THREE.SpriteMaterial).alphaTest).toBeCloseTo(
			DEFAULT_OIL_DRUM_SPRITE_ALPHA_TEST,
		);
		expect(texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
		expect(texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
		expect(texture.generateMipmaps).toBe(false);
		expect(sprite.scale.x).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.x);
		expect(sprite.scale.y).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.y);
		expect(sprite.scale.z).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.z);
	});

	it('adds exactly one oil drum sprite near the starting player position', () => {
		const scene = new THREE.Scene();
		const playerStartPosition = { x: 0, y: 1.6, z: 6 };
		const texture = new THREE.Texture();
		const load = vi.fn(() => texture);

		const added = addDefaultOilDrumEntityToScene({
			scene,
			playerStartPosition,
			textureLoader: { load },
		});
		const sprite = added.sprite;

		expect(
			scene.children.filter((child) => child.name === OIL_DRUM_ENTITY_NAME),
		).toHaveLength(1);
		expect(scene.children).toContain(sprite);
		expect(added.movementCollider).toEqual({
			x: 1.25,
			z: 2.25,
			radius: DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
			minY: 1 - DEFAULT_OIL_DRUM_COLLIDER_HEIGHT / 2,
			maxY: 1 + DEFAULT_OIL_DRUM_COLLIDER_HEIGHT / 2,
		});
		expect(added.health).toEqual({
			currentHealth: 100,
			maxHealth: 100,
		});

		const distanceFromPlayer = sprite.position.distanceTo(
			new THREE.Vector3(
				playerStartPosition.x,
				playerStartPosition.y,
				playerStartPosition.z,
			),
		);
		expect(distanceFromPlayer).toBeLessThanOrEqual(6);
		expect(sprite.position.z).toBeLessThan(playerStartPosition.z);
	});

	it('applies deterministic default health across multiple oil drum spawns', () => {
		const scene = new THREE.Scene();
		const texture = new THREE.Texture();
		const load = vi.fn(() => texture);

		const first = addDefaultOilDrumEntityToScene({
			scene,
			playerStartPosition: { x: 0, y: 1.6, z: 6 },
			textureLoader: { load },
		});
		const second = addDefaultOilDrumEntityToScene({
			scene,
			playerStartPosition: { x: 4, y: 1.6, z: 8 },
			textureLoader: { load },
		});

		expect(first.health).toEqual({
			currentHealth: 100,
			maxHealth: 100,
		});
		expect(second.health).toEqual({
			currentHealth: 100,
			maxHealth: 100,
		});
		expect(first.health).not.toBe(second.health);
	});

	it('logs a warning when sprite texture fails to load', () => {
		const warn = vi.fn();
		const load = vi.fn(
			(
				_url: string,
				_onLoad?: (texture: THREE.Texture) => void,
				_onProgress?: (event: ProgressEvent<EventTarget>) => void,
				onError?: (error: unknown) => void,
			) => {
				onError?.(new Error('failed to load oil drum'));
				return new THREE.Texture();
			},
		);

		createOilDrumSprite({
			textureLoader: { load },
			logger: { warn },
		});

		expect(warn).toHaveBeenCalledWith(
			'oil.drum.asset.load.failed',
			expect.objectContaining({
				assetUrl: expect.stringContaining('oil_drum.png'),
			}),
		);
	});

	it('applies configurable bullet damage to oil drum health', () => {
		const hit = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
		});

		expect(hit.health).toEqual({
			currentHealth: 65,
			maxHealth: 100,
		});
		expect(hit.didApplyDamage).toBe(true);
		expect(hit.damageApplied).toBe(35);
		expect(hit.wasRemoved).toBe(false);
	});

	it('swaps to on-fire sprite when health drops below half but remains above zero', () => {
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

		const hit = applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect(hit.health.currentHealth).toBe(30);
		expect(load).toHaveBeenCalledTimes(
			DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.length,
		);
		for (const frameAssetUrl of DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS) {
			expect(load).toHaveBeenCalledWith(
				frameAssetUrl,
				expect.any(Function),
				undefined,
				expect.any(Function),
			);
		}
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(fireTextures[0]);
		expect(sprite.scale.x).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.x * 2);
		expect(sprite.scale.y).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.y * 2);
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);
		expect(
			(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState,
		).toBe('fire');
	});

	it('keeps scale unchanged when fire visible-coverage metadata is unavailable', () => {
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

	it('does not reload fire texture when oil drum is already in fire visual state', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const load = vi.fn(() => new THREE.Texture());

		const first = applyOilDrumHit({
			health: { currentHealth: 49, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 5,
			sprite,
			textureLoader: { load },
		});
		const second = applyOilDrumHit({
			health: first.health,
			source: 'bullet',
			bulletDamage: 5,
			sprite,
			textureLoader: { load },
		});

		expect(first.health.currentHealth).toBe(44);
		expect(second.health.currentHealth).toBe(39);
		expect(load).toHaveBeenCalledTimes(
			DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS.length,
		);
	});

	it('does not switch to fire visual at exactly half health', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const initialMap = new THREE.Texture();
		(sprite.material as THREE.SpriteMaterial).map = initialMap;
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
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(initialMap);
	});

	it('falls back to default bullet damage when configured damage is not positive', () => {
		const hit = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 0,
		});

		expect(hit.damageApplied).toBe(DEFAULT_OIL_DRUM_BULLET_DAMAGE);
		expect(hit.health.currentHealth).toBe(100 - DEFAULT_OIL_DRUM_BULLET_DAMAGE);
	});

	it('normalizes bullet damage to a floored integer', () => {
		const hit = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35.9,
		});

		expect(hit.damageApplied).toBe(35);
		expect(hit.health.currentHealth).toBe(65);
	});

	it('does not apply non-bullet interactions', () => {
		const hit = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'non-bullet',
			bulletDamage: 35,
		});

		expect(hit.health).toEqual({
			currentHealth: 100,
			maxHealth: 100,
		});
		expect(hit.didApplyDamage).toBe(false);
		expect(hit.damageApplied).toBe(0);
		expect(hit.wasRemoved).toBe(false);
	});

	it('starts explosion animation when bullet damage destroys it', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		sprite.position.set(0, 1, 0);
		sprite.scale.set(
			DEFAULT_OIL_DRUM_SPRITE_SCALE.x,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.y,
			DEFAULT_OIL_DRUM_SPRITE_SCALE.z,
		);
		const originalMap = new THREE.Texture();
		(
			originalMap.userData as { oilDrumVisibleCoverageRatio?: number }
		).oilDrumVisibleCoverageRatio = 0.64;
		(sprite.material as THREE.SpriteMaterial).map = originalMap;
		const fireTexture = new THREE.Texture();
		(
			fireTexture.userData as { oilDrumVisibleCoverageRatio?: number }
		).oilDrumVisibleCoverageRatio = 0.16;
		const explosionTexture = new THREE.Texture();
		const destroyedTexture = new THREE.Texture();
		const load = vi.fn((url: string) => {
			if (url.includes('oil_drum_explosion_frames')) {
				return explosionTexture;
			}
			if (url.includes('oil_drum_destroyed.png')) {
				return destroyedTexture;
			}
			return fireTexture;
		});

		applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		expect(sprite.scale.x).toBeGreaterThan(DEFAULT_OIL_DRUM_SPRITE_SCALE.x);

		const hit = applyOilDrumHit({
			health: { currentHealth: 35, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});

		expect(hit.health.currentHealth).toBe(0);
		expect(hit.wasRemoved).toBe(false);
		expect(load).toHaveBeenCalledWith(
			expect.stringContaining(
				'oil_drum_explosion_frames/oil_drum_explosion_01.png',
			),
			expect.any(Function),
			undefined,
			expect.any(Function),
		);
		expect(
			(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState,
		).toBe('exploding');
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(
			explosionTexture,
		);
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);

		advanceOilDrumExplosionAnimation({
			health: hit.health,
			sprite,
			deltaSeconds:
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT /
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
			textureLoader: { load },
		});

		expect(load).toHaveBeenCalledWith(
			expect.stringContaining('oil_drum_destroyed.png'),
			undefined,
			undefined,
			expect.any(Function),
		);
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(
			destroyedTexture,
		);
		expect(sprite.scale.x).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.x);
		expect(sprite.scale.y).toBeCloseTo(DEFAULT_OIL_DRUM_SPRITE_SCALE.y);
		expect(sprite.position.y).toBeCloseTo(1);
	});

	it('applies burn damage every elapsed second while on fire', () => {
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

		expect(firstHalf.didApplyDamage).toBe(false);
		expect(secondHalf.didApplyDamage).toBe(true);
		expect(secondHalf.damageApplied).toBe(5);
		expect(secondHalf.health.currentHealth).toBe(25);
	});

	it('starts explosion from burn damage at zero health and then becomes destroyed', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState =
			'fire';
		const explosionTextures = DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
		const destroyedTexture = new THREE.Texture();
		const load = vi.fn(
			(url: string, onLoad?: (texture: THREE.Texture) => void) => {
				if (url.includes('oil_drum_destroyed.png')) {
					return destroyedTexture;
				}
				const textureIndex =
					DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.indexOf(url);
				const texture = explosionTextures[Math.max(0, textureIndex)];
				onLoad?.(texture);
				return texture;
			},
		);

		const burn = advanceOilDrumBurnDamage({
			health: { currentHealth: 5, maxHealth: 100 },
			sprite,
			deltaSeconds: 1,
			textureLoader: { load },
		});

		expect(burn.health.currentHealth).toBe(0);
		expect(
			(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState,
		).toBe('exploding');

		advanceOilDrumExplosionAnimation({
			health: burn.health,
			sprite,
			deltaSeconds:
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT /
				DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
			textureLoader: { load },
		});

		expect(
			(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState,
		).toBe('destroyed');
		expect((sprite.material as THREE.SpriteMaterial).map).toBe(
			destroyedTexture,
		);

		const noFurtherBurn = advanceOilDrumBurnDamage({
			health: burn.health,
			sprite,
			deltaSeconds: 5,
		});
		expect(noFurtherBurn.health.currentHealth).toBe(0);
		expect(noFurtherBurn.didApplyDamage).toBe(false);
	});

	it('does not loop explosion animation after final frame', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const explosionTextures = DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.map(
			() => new THREE.Texture(),
		);
		const load = vi.fn(
			(url: string, onLoad?: (texture: THREE.Texture) => void) => {
				const textureIndex =
					DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS.indexOf(url);
				const texture = explosionTextures[Math.max(0, textureIndex)];
				onLoad?.(texture);
				return texture;
			},
		);

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

		expect(
			(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState,
		).toBe('destroyed');
	});

	it('keeps explosion frames floor-aligned while animation advances', () => {
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

		const inFire = applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);

		const exploded = applyOilDrumHit({
			health: inFire.health,
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
		});
		expect(exploded.health.currentHealth).toBe(0);
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);

		advanceOilDrumExplosionAnimation({
			health: exploded.health,
			sprite,
			deltaSeconds: 1 / DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS,
			textureLoader: { load },
		});
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);
	});

	it('does not apply additional bullet damage once oil drum is destroyed', () => {
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

		expect(first.didApplyDamage).toBe(true);
		expect(first.damageApplied).toBe(35);
		expect(first.health.currentHealth).toBe(0);
		expect(second.didApplyDamage).toBe(false);
		expect(second.damageApplied).toBe(0);
		expect(second.health.currentHealth).toBe(0);
	});

	it('advances fire animation frames in a loop while oil drum is below half health', () => {
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
		expect(sprite.position.y).toBeCloseTo(
			1 + DEFAULT_OIL_DRUM_SPRITE_SCALE.y / 2,
		);
	});

	it('does not advance fire animation when visual state is not fire', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const texture = new THREE.Texture();
		(sprite.material as THREE.SpriteMaterial).map = texture;
		(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState =
			'default';

		advanceOilDrumFireAnimation({
			health: { currentHealth: 30, maxHealth: 100 },
			sprite,
			deltaSeconds: 0.5,
		});

		expect((sprite.material as THREE.SpriteMaterial).map).toBe(texture);
	});

	it('does not advance fire animation when health is not in fire range', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const texture = new THREE.Texture();
		(sprite.material as THREE.SpriteMaterial).map = texture;
		(sprite.userData as { oilDrumVisualState?: string }).oilDrumVisualState =
			'fire';

		advanceOilDrumFireAnimation({
			health: { currentHealth: 50, maxHealth: 100 },
			sprite,
			deltaSeconds: 0.5,
		});

		expect((sprite.material as THREE.SpriteMaterial).map).toBe(texture);
	});

	it('skips failed fire frame assets while animation continues', () => {
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
					onError?.(new Error('frame failed'));
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
			frameCount: DEFAULT_OIL_DRUM_FIRE_ANIMATION_FRAME_COUNT,
		});

		expect((sprite.material as THREE.SpriteMaterial).map).toBe(fireTextures[2]);
	});

	it('emits fire-visual update event when entering fire state', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const load = vi.fn(() => new THREE.Texture());
		const info = vi.fn();

		applyOilDrumHit({
			health: { currentHealth: 65, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite,
			textureLoader: { load },
			logger: { info },
		});

		expect(info).toHaveBeenCalledWith(
			'oil.drum.fire.visual.updated',
			expect.objectContaining({
				assetUrls: expect.arrayContaining([
					expect.stringContaining('oil_drum_burning_01.png'),
				]),
			}),
		);
	});

	it('logs damage and explosion-visual events when destroyed by a bullet', () => {
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		const info = vi.fn();
		const load = vi.fn(() => new THREE.Texture());

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
			expect.objectContaining({
				damageApplied: 35,
				currentHealth: 0,
			}),
		);
		expect(info).toHaveBeenCalledWith(
			'oil.drum.explosion.visual.updated',
			expect.objectContaining({
				assetUrls: expect.arrayContaining([
					expect.stringContaining('oil_drum_explosion_01.png'),
				]),
			}),
		);
	});
});
