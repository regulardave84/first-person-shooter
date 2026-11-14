import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_SPAWN_OFFSET,
	DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH,
	DEFAULT_OIL_DRUM_SPRITE_SCALE,
	OIL_DRUM_ENTITY_NAME,
	addDefaultOilDrumEntityToScene,
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
	});

	it('resolves a default spawn position in front of the player', () => {
		const playerStartPosition = { x: 0, y: 1.6, z: 6 };

		const spawn = resolveOilDrumSpawnPosition(playerStartPosition);

		expect(spawn.x).toBeCloseTo(1.25);
		expect(spawn.y).toBeCloseTo(1);
		expect(spawn.z).toBeCloseTo(2.25);
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

		const sprite = addDefaultOilDrumEntityToScene({
			scene,
			playerStartPosition,
			textureLoader: { load },
		});

		expect(
			scene.children.filter((child) => child.name === OIL_DRUM_ENTITY_NAME),
		).toHaveLength(1);
		expect(scene.children).toContain(sprite);

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
