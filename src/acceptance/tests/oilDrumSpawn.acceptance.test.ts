import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH,
	OIL_DRUM_ENTITY_NAME,
	addDefaultOilDrumEntityToScene,
	resolveOilDrumSpawnPosition,
} from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum sprite appears near the player at game start', () => {
	it('Oil drum sprite asset path uses oil_drum.png', () => {
		expect(DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH).toContain('oil_drum.png');
	});

	it('Oil drum is added to the scene on bootstrap', () => {
		const scene = new THREE.Scene();
		const playerStartPosition = { x: 0, y: 1.6, z: 6 };
		const load = vi.fn(() => new THREE.Texture());

		addDefaultOilDrumEntityToScene({
			scene,
			playerStartPosition,
			textureLoader: { load },
		});

		expect(
			scene.children.filter((child) => child.name === OIL_DRUM_ENTITY_NAME),
		).toHaveLength(1);
	});

	it('Oil drum starts close to the player', () => {
		const playerStartPosition = { x: 0, y: 1.6, z: 6 };
		const spawn = resolveOilDrumSpawnPosition(playerStartPosition);
		const dx = spawn.x - playerStartPosition.x;
		const dy = spawn.y - playerStartPosition.y;
		const dz = spawn.z - playerStartPosition.z;
		const distance = Math.hypot(dx, dy, dz);

		expect(distance).toBeLessThanOrEqual(6);
		expect(spawn.z).toBeLessThan(playerStartPosition.z);
	});
});
