import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_WORLD_FLOOR_COLOR,
	DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_X,
	DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_Y,
	type FloorTextureLoaderLike,
	applyDefaultWorldFloorTexture,
} from '../../app/floorTexture';

function createSuccessfulTextureLoader(): FloorTextureLoaderLike {
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

function createFailingTextureLoader(): FloorTextureLoaderLike {
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

describe('Acceptance: Dark grey concrete texture on default map floor', () => {
	it('Default map floor renders with a new dark grey concrete texture', () => {
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_FLOOR_COLOR,
		});

		applyDefaultWorldFloorTexture(floorMaterial, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(floorMaterial.map).toBeInstanceOf(THREE.Texture);
		expect(floorMaterial.map?.wrapS).toBe(THREE.RepeatWrapping);
		expect(floorMaterial.map?.wrapT).toBe(THREE.RepeatWrapping);
		expect(floorMaterial.map?.repeat.x).toBe(
			DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_X,
		);
		expect(floorMaterial.map?.repeat.y).toBe(
			DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_Y,
		);
		expect(DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_X).toBeGreaterThan(1);
		expect(DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_Y).toBeGreaterThan(1);
		expect(floorMaterial.color.getHex()).toBe(0xffffff);
	});

	it('Concrete floor texture remains visible while looking around', () => {
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_FLOOR_COLOR,
		});

		applyDefaultWorldFloorTexture(floorMaterial, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(floorMaterial.map).toBeInstanceOf(THREE.Texture);
		expect(floorMaterial.map?.repeat.x).toBe(
			DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_X,
		);
		expect(floorMaterial.map?.repeat.y).toBe(
			DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_Y,
		);
	});

	it('Floor concrete texture does not replace wall or sky rendering', () => {
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_FLOOR_COLOR,
		});
		const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x64748b });
		const skyColor = new THREE.Color(0x0b1020);

		applyDefaultWorldFloorTexture(floorMaterial, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(floorMaterial.map).toBeInstanceOf(THREE.Texture);
		expect(wallMaterial.color.getHex()).toBe(0x64748b);
		expect(skyColor.getHex()).toBe(0x0b1020);
	});

	it('Texture loading failure uses a defined floor fallback appearance', () => {
		const logger = { warn: vi.fn() };
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_FLOOR_COLOR,
		});

		applyDefaultWorldFloorTexture(floorMaterial, {
			textureLoader: createFailingTextureLoader(),
			logger,
		});

		expect(floorMaterial.map).toBeNull();
		expect(floorMaterial.color.getHex()).toBe(DEFAULT_WORLD_FLOOR_COLOR);
		expect(logger.warn).toHaveBeenCalledWith(
			'floor.texture.load.failed',
			expect.objectContaining({ fallbackColor: DEFAULT_WORLD_FLOOR_COLOR }),
		);
	});
});
