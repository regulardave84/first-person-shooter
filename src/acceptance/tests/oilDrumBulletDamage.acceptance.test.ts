import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { applyOilDrumHit } from '../../app/oilDrumEntity';

describe('Acceptance: Oil drum takes configurable bullet damage', () => {
	it('Bullet hit applies configured damage to oil drum health', () => {
		const hit = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
		});

		expect(hit.health.currentHealth).toBe(65);
		expect(hit.health.maxHealth).toBe(100);
	});

	it('Repeated bullet hits stack damage independently', () => {
		const first = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
		});
		const second = applyOilDrumHit({
			health: first.health,
			source: 'bullet',
			bulletDamage: 35,
		});

		expect(second.health.currentHealth).toBe(30);
	});

	it('Oil drum is removed when health reaches zero or below from bullets', () => {
		const scene = new THREE.Scene();
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		scene.add(sprite);

		const hit = applyOilDrumHit({
			health: { currentHealth: 35, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			scene,
			sprite,
		});

		expect(hit.health.currentHealth).toBe(0);
		expect(hit.wasRemoved).toBe(true);
		expect(scene.children).not.toContain(sprite);
	});

	it('Bullet-only damage does not apply from non-bullet sources', () => {
		const hit = applyOilDrumHit({
			health: { currentHealth: 100, maxHealth: 100 },
			source: 'non-bullet',
			bulletDamage: 35,
		});

		expect(hit.health.currentHealth).toBe(100);
		expect(hit.didApplyDamage).toBe(false);
	});

	it('Oil drum damage and removal events are logged', () => {
		const scene = new THREE.Scene();
		const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
		scene.add(sprite);
		const info = vi.fn();

		applyOilDrumHit({
			health: { currentHealth: 35, maxHealth: 100 },
			source: 'bullet',
			bulletDamage: 35,
			scene,
			sprite,
			logger: { info },
		});

		expect(info).toHaveBeenCalledWith(
			'oil.drum.damaged',
			expect.objectContaining({ damageApplied: 35 }),
		);
		expect(info).toHaveBeenCalledWith(
			'oil.drum.removed',
			expect.objectContaining({ reason: 'destroyed' }),
		);
	});
});
