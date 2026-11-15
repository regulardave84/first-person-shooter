import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	stepProjectiles,
	type Projectile,
} from '../../fpsRuntime';
import {
	DEFAULT_BULLET_HOLE_TEXTURE_ASSET_PATH,
	createBulletHoleManager,
} from '../../app/bulletHoles';

function createProjectile(params: {
	id: number;
	head: { x: number; y: number; z: number };
	direction: { x: number; y: number; z: number };
	speed: number;
}): Projectile {
	return {
		id: params.id,
		head: params.head,
		direction: params.direction,
		speed: params.speed,
		length: 0.35,
		color: 0xffffff,
	};
}

describe('Acceptance: Bullet holes appear on impacted world surfaces', () => {
	it('Wall impact spawns a bullet hole decal', () => {
		const scene = new THREE.Scene();
		const texture = new THREE.Texture();
		const load = vi.fn((url: string, onLoad?: (loaded: THREE.Texture) => void) => {
			void url;
			onLoad?.(texture);
			return texture;
		});
		const manager = createBulletHoleManager({ scene, textureLoader: { load } });
		const wallCollider = {
			min: { x: -0.5, y: 0, z: -1.5 },
			max: { x: 0.5, y: 2.5, z: -0.5 },
			kind: 'wall' as const,
		};
		const stepped = stepProjectiles({
			projectiles: [
				createProjectile({
					id: 1,
					head: { x: 0, y: 1.6, z: 1 },
					direction: { x: 0, y: 0, z: -1 },
					speed: 3,
				}),
			],
			dt: 1,
			worldColliders: [wallCollider],
			entityColliders: [],
		});

		expect(stepped.impacts).toHaveLength(1);
		const impact = stepped.impacts[0];
		expect(impact.colliderKind).toBe('wall');
		const hole = manager.recordImpact({
			colliderKind: impact.colliderKind,
			point: impact.point,
		});

		expect(hole).toBeInstanceOf(THREE.Sprite);
		expect(load).toHaveBeenCalledWith(
			DEFAULT_BULLET_HOLE_TEXTURE_ASSET_PATH,
			expect.any(Function),
			undefined,
			expect.any(Function),
		);
		expect(scene.children).toContain(hole as THREE.Object3D);
	});

	it('Floor impact spawns a bullet hole decal', () => {
		const scene = new THREE.Scene();
		const manager = createBulletHoleManager({
			scene,
			textureLoader: { load: vi.fn(() => new THREE.Texture()) },
		});
		const floorCollider = {
			min: { x: -5, y: -0.2, z: -5 },
			max: { x: 5, y: 0.2, z: 5 },
			kind: 'floor' as const,
		};
		const stepped = stepProjectiles({
			projectiles: [
				createProjectile({
					id: 2,
					head: { x: 0, y: 1, z: 0 },
					direction: { x: 0, y: -1, z: 0 },
					speed: 2,
				}),
			],
			dt: 1,
			worldColliders: [floorCollider],
			entityColliders: [],
		});

		expect(stepped.impacts).toHaveLength(1);
		const impact = stepped.impacts[0];
		expect(impact.colliderKind).toBe('floor');
		const hole = manager.recordImpact({
			colliderKind: impact.colliderKind,
			point: impact.point,
		});

		expect(hole).toBeInstanceOf(THREE.Sprite);
		expect((hole as THREE.Sprite).position.y).toBeGreaterThan(impact.point.y);
		expect(scene.children).toContain(hole as THREE.Object3D);
	});

	it('Oil drum impact does not spawn a bullet hole mark', () => {
		const scene = new THREE.Scene();
		const manager = createBulletHoleManager({
			scene,
			textureLoader: { load: vi.fn(() => new THREE.Texture()) },
		});
		const drumCollider = {
			min: { x: 1.5, y: 0, z: -2.5 },
			max: { x: 2.5, y: 2, z: -1.5 },
			kind: 'entity' as const,
		};
		const stepped = stepProjectiles({
			projectiles: [
				createProjectile({
					id: 3,
					head: { x: 0, y: 1.1, z: -2 },
					direction: { x: 1, y: 0, z: 0 },
					speed: 3,
				}),
			],
			dt: 1,
			worldColliders: [],
			entityColliders: [drumCollider],
		});

		expect(stepped.impacts).toHaveLength(1);
		const impact = stepped.impacts[0];
		expect(impact.colliderKind).toBe('entity');
		const hole = manager.recordImpact({
			colliderKind: impact.colliderKind,
			point: impact.point,
		});

		expect(hole).toBeNull();
		expect(manager.getActiveBulletHoleCount()).toBe(0);
	});

	it('Repeated wall and floor hits accumulate bullet holes up to a safe cap', () => {
		const scene = new THREE.Scene();
		const manager = createBulletHoleManager({
			scene,
			textureLoader: { load: vi.fn(() => new THREE.Texture()) },
			maxBulletHoles: 3,
		});
		const created: Array<THREE.Sprite | null> = [];

		for (let i = 0; i < 5; i += 1) {
			created.push(
				manager.recordImpact({
					colliderKind: i % 2 === 0 ? 'wall' : 'floor',
					point: { x: i, y: i % 2 === 0 ? 1 : 0, z: -i },
				}),
			);
		}

		expect(manager.getActiveBulletHoleCount()).toBe(3);
		expect(scene.children).not.toContain(created[0] as THREE.Object3D);
		expect(scene.children).not.toContain(created[1] as THREE.Object3D);
	});

	it('Non-hit shots do not create bullet holes', () => {
		const scene = new THREE.Scene();
		const manager = createBulletHoleManager({
			scene,
			textureLoader: { load: vi.fn(() => new THREE.Texture()) },
		});
		const stepped = stepProjectiles({
			projectiles: [
				createProjectile({
					id: 5,
					head: { x: 0, y: 1, z: 0 },
					direction: { x: 0, y: 0, z: 1 },
					speed: 2,
				}),
			],
			dt: 1,
			worldColliders: [],
			entityColliders: [],
		});

		expect(stepped.impacts).toHaveLength(0);
		for (const impact of stepped.impacts) {
			manager.recordImpact({
				colliderKind: impact.colliderKind,
				point: impact.point,
			});
		}
		expect(manager.getActiveBulletHoleCount()).toBe(0);
	});
});
