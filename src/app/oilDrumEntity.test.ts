import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_COLLIDER_HEIGHT,
	DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
	DEFAULT_OIL_DRUM_MAX_HEALTH,
	DEFAULT_OIL_DRUM_SPAWN_OFFSET,
	DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH,
	DEFAULT_OIL_DRUM_SPRITE_SCALE,
	OIL_DRUM_ENTITY_NAME,
	addDefaultOilDrumEntityToScene,
	createOilDrumHealthState,
	createOilDrumMovementCollider,
	createOilDrumSprite,
	resolveOilDrumSpawnPosition,
} from './oilDrumEntity';

describe('oilDrumEntity', () => {
	it('exports stable sprite defaults', () => {
		expect(DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH).toContain('oil_drum.png');
		expect(DEFAULT_OIL_DRUM_SPAWN_OFFSET).toEqual({
			x: 1.25,
			y: -0.6,
			z: -3.75,
		});
		expect(DEFAULT_OIL_DRUM_SPRITE_SCALE).toEqual({ x: 1.8, y: 2.2, z: 1 });
		expect(DEFAULT_OIL_DRUM_COLLIDER_RADIUS).toBeCloseTo(0.75);
		expect(DEFAULT_OIL_DRUM_COLLIDER_HEIGHT).toBeCloseTo(2.25);
		expect(DEFAULT_OIL_DRUM_MAX_HEALTH).toBe(100);
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
});
