import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { WORLD_WALLS } from '../../runtime/world';
import {
	DEFAULT_WORLD_WALL_COLOR,
	DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X,
	DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
	type WallTextureLoaderLike,
	applyDefaultWorldWallTexture,
} from '../../app/wallTexture';

function createSuccessfulTextureLoader(): WallTextureLoaderLike {
	return {
		load: (
			_textureUrl: string,
			onLoad?: (texture: THREE.Texture) => void,
		): THREE.Texture => {
			const texture = new THREE.Texture();
			onLoad?.(texture);
			return texture;
		},
	};
}

function createFailingTextureLoader(): WallTextureLoaderLike {
	return {
		load: (
			_textureUrl: string,
			_onLoad?: (texture: THREE.Texture) => void,
			_onProgress?: (event: ProgressEvent<EventTarget>) => void,
			onError?: (err: unknown) => void,
		): THREE.Texture => {
			onError?.(new Error('texture failed'));
			return new THREE.Texture();
		},
	};
}

describe('Acceptance: Red brick wall texture on all default map walls', () => {
	it('All default map walls render with a new red brick texture', () => {
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_WALL_COLOR,
		});
		const walls = WORLD_WALLS.map(
			(wall) =>
				new THREE.Mesh(
					new THREE.BoxGeometry(wall.w, wall.h, wall.d),
					wallMaterial,
				),
		);

		applyDefaultWorldWallTexture(wallMaterial, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(walls).toHaveLength(WORLD_WALLS.length);
		expect(walls.every((wall) => wall.material === wallMaterial)).toBe(true);
		expect(wallMaterial.map).toBeInstanceOf(THREE.Texture);
		expect(wallMaterial.map?.wrapS).toBe(THREE.RepeatWrapping);
		expect(wallMaterial.map?.wrapT).toBe(THREE.RepeatWrapping);
		expect(wallMaterial.map?.repeat.x).toBe(
			DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X,
		);
		expect(wallMaterial.map?.repeat.y).toBe(
			DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
		);
		expect(wallMaterial.color.getHex()).toBe(0xffffff);
	});

	it('Red brick texture remains visible while looking around', () => {
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_WALL_COLOR,
		});

		applyDefaultWorldWallTexture(wallMaterial, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(wallMaterial.map).toBeInstanceOf(THREE.Texture);
		expect(wallMaterial.map?.repeat.x).toBe(
			DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X,
		);
		expect(wallMaterial.map?.repeat.y).toBe(
			DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
		);
	});

	it('Wall brick texture does not replace floor or sky rendering', () => {
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_WALL_COLOR,
		});
		const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x334155 });
		const skyColor = new THREE.Color(0x0b1020);

		applyDefaultWorldWallTexture(wallMaterial, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(wallMaterial.map).toBeInstanceOf(THREE.Texture);
		expect(floorMaterial.color.getHex()).toBe(0x334155);
		expect(skyColor.getHex()).toBe(0x0b1020);
	});

	it('Texture loading failure uses a defined wall fallback appearance', () => {
		const logger = { warn: vi.fn() };
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_WALL_COLOR,
		});

		applyDefaultWorldWallTexture(wallMaterial, {
			textureLoader: createFailingTextureLoader(),
			logger,
		});

		expect(wallMaterial.map).toBeNull();
		expect(wallMaterial.color.getHex()).toBe(DEFAULT_WORLD_WALL_COLOR);
		expect(logger.warn).toHaveBeenCalledWith(
			'wall.texture.load.failed',
			expect.objectContaining({ fallbackColor: DEFAULT_WORLD_WALL_COLOR }),
		);
	});
});
