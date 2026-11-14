import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_COLLIDER_HEIGHT,
	DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
	addDefaultOilDrumEntityToScene,
} from '../../app/oilDrumEntity';
import { resolveHorizontalMovement } from '../../fpsRuntime';

describe('Acceptance: Oil drum collision blocks player movement', () => {
	it('Oil drum exports a stable collider size contract', () => {
		expect(DEFAULT_OIL_DRUM_COLLIDER_RADIUS).toBeCloseTo(0.75);
		expect(DEFAULT_OIL_DRUM_COLLIDER_HEIGHT).toBeCloseTo(2.25);
	});

	it('Oil drum collider is created at spawn position', () => {
		const scene = new THREE.Scene();
		const load = vi.fn(() => new THREE.Texture());

		const added = addDefaultOilDrumEntityToScene({
			scene,
			playerStartPosition: { x: 0, y: 1.6, z: 6 },
			textureLoader: { load },
		});

		expect(added.movementCollider.x).toBeCloseTo(added.sprite.position.x);
		expect(added.movementCollider.z).toBeCloseTo(added.sprite.position.z);
		expect(added.movementCollider.minY).toBeLessThan(added.movementCollider.maxY);
	});

	it('Player movement is blocked by the oil drum', () => {
		const collider = {
			x: 2,
			z: 2,
			radius: DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
			minY: 0,
			maxY: 2.2,
		};
		const playerStart = { x: 0, y: 1.6, z: 2 };

		const resolved = resolveHorizontalMovement(
			playerStart,
			{ x: 2, y: 1.6, z: 2 },
			[],
			0.9,
			[collider],
		);

		const dx = resolved.x - collider.x;
		const dz = resolved.z - collider.z;
		const minAllowedDistance = 0.9 + collider.radius;
		const distance = Math.hypot(dx, dz);

		expect(distance).toBeGreaterThanOrEqual(minAllowedDistance);
	});
});
