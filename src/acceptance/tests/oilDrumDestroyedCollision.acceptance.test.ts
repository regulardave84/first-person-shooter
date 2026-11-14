import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
	addDefaultOilDrumEntityToScene,
	applyOilDrumHit,
} from '../../app/oilDrumEntity';
import { resolveHorizontalMovement } from '../../fpsRuntime';

describe('Acceptance: Destroyed oil drum preserves movement collision', () => {
	it('Destroyed oil drum keeps same movement collider after health reaches zero', () => {
		const scene = new THREE.Scene();
		const textureLoader = { load: vi.fn(() => new THREE.Texture()) };
		const added = addDefaultOilDrumEntityToScene({
			scene,
			playerStartPosition: { x: 0, y: 1.6, z: 6 },
			textureLoader,
		});
		const colliderBefore = { ...added.movementCollider };

		const hit = applyOilDrumHit({
			health: { currentHealth: 35, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			sprite: added.sprite,
			textureLoader,
		});

		expect(hit.health.currentHealth).toBe(0);
		expect(added.movementCollider).toEqual(colliderBefore);
	});

	it('Destroyed oil drum still blocks player movement in walking, running, and jumping attempts', () => {
		const collider = {
			x: 2,
			z: 2,
			radius: DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
			minY: 0,
			maxY: 2.25,
		};
		const minAllowedDistance = 0.9 + collider.radius;

		const walking = resolveHorizontalMovement(
			{ x: 0, y: 1.6, z: 2 },
			{ x: 2, y: 1.6, z: 2 },
			[],
			0.9,
			[collider],
		);
		const running = resolveHorizontalMovement(
			{ x: 0, y: 1.6, z: 2 },
			{ x: 2.6, y: 1.6, z: 2 },
			[],
			0.9,
			[collider],
		);
		const jumping = resolveHorizontalMovement(
			{ x: 0, y: 3.2, z: 2 },
			{ x: 2.6, y: 3.2, z: 2 },
			[],
			0.9,
			[collider],
		);

		for (const resolved of [walking, running, jumping]) {
			const distance = Math.hypot(
				resolved.x - collider.x,
				resolved.z - collider.z,
			);
			expect(distance).toBeGreaterThanOrEqual(minAllowedDistance);
		}
	});

	it('Destroyed oil drum receives no additional bullet damage', () => {
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

		expect(first.health.currentHealth).toBe(0);
		expect(second.damageApplied).toBe(0);
		expect(second.health.currentHealth).toBe(0);
	});
});
