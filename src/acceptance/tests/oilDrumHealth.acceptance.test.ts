import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_MAX_HEALTH,
	addDefaultOilDrumEntityToScene,
	createOilDrumHealthState,
} from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum has a default health pool', () => {
	it('Oil drum defaults to 100 health', () => {
		const health = createOilDrumHealthState();

		expect(health.currentHealth).toBe(100);
	});

	it('Oil drum health is represented as current and maximum values', () => {
		const health = createOilDrumHealthState();

		expect(health.currentHealth).toBe(health.maxHealth);
		expect(health.maxHealth).toBe(DEFAULT_OIL_DRUM_MAX_HEALTH);
		expect(health.maxHealth).toBe(100);
	});

	it('Oil drum health defaults are deterministic across spawns', () => {
		const scene = new THREE.Scene();
		const load = vi.fn(() => new THREE.Texture());

		const first = addDefaultOilDrumEntityToScene({
			scene,
			playerStartPosition: { x: 0, y: 1.6, z: 6 },
			textureLoader: { load },
		});
		const second = addDefaultOilDrumEntityToScene({
			scene,
			playerStartPosition: { x: 2, y: 1.6, z: 4 },
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
	});
});
