import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_BULLET_HOLE_TEXTURE_ASSET_PATH,
	createBulletHoleManager,
} from './bulletHoles';

function createTextureLoaderMock() {
	const texture = new THREE.Texture();
	const load = vi.fn(
		(
			_url: string,
			onLoad?: (loadedTexture: THREE.Texture) => void,
			onProgress?: (event: ProgressEvent<EventTarget>) => void,
			onError?: (err: unknown) => void,
		) => {
			void onProgress;
			void onError;
			onLoad?.(texture);
			return texture;
		},
	);

	return {
		load,
		texture,
	};
}

describe('bulletHoles', () => {
	it('creates wall and floor bullet hole sprites with the bullet_hole asset', () => {
		const scene = new THREE.Scene();
		const textureLoader = createTextureLoaderMock();
		const manager = createBulletHoleManager({
			scene,
			textureLoader,
		});

		const wallHole = manager.recordImpact({
			colliderKind: 'wall',
			point: { x: 1, y: 1.2, z: -2 },
		});
		const floorHole = manager.recordImpact({
			colliderKind: 'floor',
			point: { x: 2, y: 0, z: -3 },
		});

		expect(textureLoader.load).toHaveBeenCalledWith(
			DEFAULT_BULLET_HOLE_TEXTURE_ASSET_PATH,
			expect.any(Function),
			undefined,
			expect.any(Function),
		);
		expect(wallHole).toBeInstanceOf(THREE.Sprite);
		expect(floorHole).toBeInstanceOf(THREE.Sprite);
		expect(wallHole?.material).toBeInstanceOf(THREE.SpriteMaterial);
		const wallMaterial = wallHole?.material as THREE.SpriteMaterial;
		expect(wallMaterial.map).toBe(textureLoader.texture);
		expect(wallMaterial.transparent).toBe(true);
		expect(wallMaterial.depthWrite).toBe(false);
		expect(scene.children).toContain(wallHole as THREE.Object3D);
		expect(scene.children).toContain(floorHole as THREE.Object3D);
		expect(floorHole?.position.y).toBeGreaterThan(0);
		expect(textureLoader.texture.colorSpace).toBe(THREE.SRGBColorSpace);
		expect(textureLoader.texture.wrapS).toBe(THREE.ClampToEdgeWrapping);
		expect(textureLoader.texture.wrapT).toBe(THREE.ClampToEdgeWrapping);
		expect(textureLoader.texture.version).toBeGreaterThan(0);
	});

	it('logs bullet hole asset load failures with safe error normalization', () => {
		const scene = new THREE.Scene();
		const warn = vi.fn();
		const manager = createBulletHoleManager({
			scene,
			textureLoader: {
				load: (
					_url: string,
					onLoad?: (loadedTexture: THREE.Texture) => void,
					_onProgress?: (event: ProgressEvent<EventTarget>) => void,
					onError?: (err: unknown) => void,
				) => {
					onLoad?.(new THREE.Texture());
					onError?.(new Error('asset missing'));
					onError?.('network');
					onError?.({});
					return new THREE.Texture();
				},
			},
			logger: { warn },
		});

		void manager;
		expect(warn).toHaveBeenCalledWith(
			'bullet.hole.asset.load.failed',
			expect.objectContaining({
				assetUrl: DEFAULT_BULLET_HOLE_TEXTURE_ASSET_PATH,
				error: 'asset missing',
			}),
		);
		expect(warn).toHaveBeenCalledWith(
			'bullet.hole.asset.load.failed',
			expect.objectContaining({ error: 'network' }),
		);
		expect(warn).toHaveBeenCalledWith(
			'bullet.hole.asset.load.failed',
			expect.objectContaining({ error: 'unknown' }),
		);
	});

	it('does not create bullet holes on oil drum or entity impacts', () => {
		const scene = new THREE.Scene();
		const textureLoader = createTextureLoaderMock();
		const manager = createBulletHoleManager({ scene, textureLoader });
		const oilDrumSprite = new THREE.Sprite(new THREE.SpriteMaterial());
		oilDrumSprite.position.set(4, 1, -5);
		scene.add(oilDrumSprite);

		const hole = manager.recordImpact({
			colliderKind: 'entity',
			point: { x: 4.1, y: 1.1, z: -5 },
		});

		expect(hole).toBeNull();
		expect(oilDrumSprite.children).toHaveLength(0);
		expect(manager.getActiveBulletHoleCount()).toBe(0);
	});

	it('removes oldest bullet holes first when max count is exceeded', () => {
		const scene = new THREE.Scene();
		const textureLoader = createTextureLoaderMock();
		const manager = createBulletHoleManager({
			scene,
			textureLoader,
			maxBulletHoles: 3,
		});

		const first = manager.recordImpact({
			colliderKind: 'wall',
			point: { x: 0, y: 1, z: 0 },
		});
		const second = manager.recordImpact({
			colliderKind: 'wall',
			point: { x: 1, y: 1, z: 0 },
		});
		manager.recordImpact({ colliderKind: 'wall', point: { x: 2, y: 1, z: 0 } });
		manager.recordImpact({ colliderKind: 'wall', point: { x: 3, y: 1, z: 0 } });
		manager.recordImpact({ colliderKind: 'wall', point: { x: 4, y: 1, z: 0 } });

		expect(manager.getActiveBulletHoleCount()).toBe(3);
		expect(scene.children).not.toContain(first as THREE.Object3D);
		expect(scene.children).not.toContain(second as THREE.Object3D);
	});

	it('respects custom bullet hole size and handles removed-parent FIFO entries safely', () => {
		const scene = new THREE.Scene();
		const textureLoader = createTextureLoaderMock();
		const manager = createBulletHoleManager({
			scene,
			textureLoader,
			maxBulletHoles: 1,
			size: 0.5,
		});

		const first = manager.recordImpact({
			colliderKind: 'wall',
			point: { x: 0, y: 1, z: 0 },
		});
		scene.remove(first as THREE.Object3D);

		const second = manager.recordImpact({
			colliderKind: 'wall',
			point: { x: 1, y: 1, z: 0 },
		});

		expect(second?.scale.x).toBeCloseTo(0.5);
		expect(second?.scale.y).toBeCloseTo(0.5);
		expect(manager.getActiveBulletHoleCount()).toBe(1);
	});

	it('does not create bullet holes for misses or unsupported collisions', () => {
		const scene = new THREE.Scene();
		const textureLoader = createTextureLoaderMock();
		const manager = createBulletHoleManager({ scene, textureLoader });

		const ceilingHole = manager.recordImpact({
			colliderKind: 'ceiling',
			point: { x: 0, y: 4, z: 0 },
		});
		const missingEntityHole = manager.recordImpact({
			colliderKind: 'entity',
			point: { x: 0, y: 1, z: 0 },
		});

		expect(ceilingHole).toBeNull();
		expect(missingEntityHole).toBeNull();
		expect(manager.getActiveBulletHoleCount()).toBe(0);
		expect(scene.children).toHaveLength(0);
	});
});
