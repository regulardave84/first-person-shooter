import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_WORLD_CEILING_COLOR,
	DEFAULT_WORLD_CEILING_SKY_TEXTURE_PATH,
	DEFAULT_WORLD_CEILING_SKYBOX_SIZE,
	type TextureLoaderLike,
	applyDefaultWorldCeilingSkybox,
} from '../../app/ceilingSkybox';

function createSuccessfulTextureLoader(): TextureLoaderLike {
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

function createFailingTextureLoader(): TextureLoaderLike {
	return {
		load: (
			_textureUrl: string,
			_onLoad?: (texture: THREE.Texture) => void,
			_onProgress?: (event: ProgressEvent<EventTarget>) => void,
			onError?: (event: unknown) => void,
		): THREE.Texture => {
			onError?.(new Error('texture failed'));
			return new THREE.Texture();
		},
	};
}

function getSkyMaterial(scene: THREE.Scene): THREE.MeshBasicMaterial {
	const sky = scene.children[0] as THREE.Mesh;
	return sky.material as THREE.MeshBasicMaterial;
}

describe('Acceptance: Blue sky visible above default map walls', () => {
	it('Default skybox points to PNG asset', () => {
		expect(
			DEFAULT_WORLD_CEILING_SKY_TEXTURE_PATH.endsWith('ceiling-sky.png'),
		).toBe(true);
		expect(
			DEFAULT_WORLD_CEILING_SKY_TEXTURE_PATH.includes('ceiling-sky.svg'),
		).toBe(false);
	});

	it('Default map renders blue sky above wall height', () => {
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(DEFAULT_WORLD_CEILING_COLOR);
		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(scene.children).toHaveLength(1);
		expect((scene.children[0] as THREE.Mesh).name).toBe(
			'default-world-ceiling-skydome',
		);
		const material = getSkyMaterial(scene);
		expect(material.map).toBeInstanceOf(THREE.Texture);
		expect(material.side).toBe(THREE.BackSide);
		const texture = material.map;
		expect(texture?.wrapS).toBe(THREE.ClampToEdgeWrapping);
		expect(texture?.wrapT).toBe(THREE.ClampToEdgeWrapping);
		expect(texture?.repeat.x).toBeCloseTo(1);
		expect(texture?.repeat.y).toBeCloseTo(1);
	});

	it('Looking around keeps sky visible above walls', () => {
		const scene = new THREE.Scene();
		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		const sky = scene.children[0] as THREE.Mesh;
		expect(getSkyMaterial(scene).map).toBeInstanceOf(THREE.Texture);
		const geometry = sky.geometry as THREE.SphereGeometry;
		expect(geometry.parameters.radius).toBe(
			DEFAULT_WORLD_CEILING_SKYBOX_SIZE / 2,
		);
	});

	it('Sky rendering does not change floor or wall materials', () => {
		const scene = new THREE.Scene();
		const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x64748b });
		const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x334155 });

		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(wallMaterial.color.getHex()).toBe(0x64748b);
		expect(floorMaterial.color.getHex()).toBe(0x334155);
	});

	it('Texture loading failure uses current fallback appearance', () => {
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(DEFAULT_WORLD_CEILING_COLOR);
		const logger = { warn: vi.fn() };

		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createFailingTextureLoader(),
			logger,
		});

		expect(scene.children).toHaveLength(0);
		expect((scene.background as THREE.Color).getHex()).toBe(
			DEFAULT_WORLD_CEILING_COLOR,
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'ceiling.skybox.texture.load.failed',
			expect.objectContaining({ fallbackColor: DEFAULT_WORLD_CEILING_COLOR }),
		);
	});
});
