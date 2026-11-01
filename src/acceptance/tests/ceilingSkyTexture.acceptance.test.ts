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

function getSkyboxMaterials(scene: THREE.Scene): THREE.MeshBasicMaterial[] {
	const skybox = scene.children[0] as THREE.Mesh;
	return skybox.material as THREE.MeshBasicMaterial[];
}

function assertTopFaceTextureIsStretched(
	materials: THREE.MeshBasicMaterial[],
): void {
	const topTexture = materials[2]?.map;
	expect(topTexture).toBeInstanceOf(THREE.Texture);
	expect(topTexture?.wrapS).toBe(THREE.ClampToEdgeWrapping);
	expect(topTexture?.wrapT).toBe(THREE.ClampToEdgeWrapping);
	expect(topTexture?.repeat.x).toBeCloseTo(1);
	expect(topTexture?.repeat.y).toBeCloseTo(1);
}

function assertAllFacesUseSkyTexture(
	materials: THREE.MeshBasicMaterial[],
): void {
	for (const material of materials) {
		expect(material.map).toBeInstanceOf(THREE.Texture);
		expect(material.side).toBe(THREE.BackSide);
	}
}

describe('Acceptance: Blue sky visible above default map walls', () => {
	it('Default skybox points to PNG asset', () => {
		expect(DEFAULT_WORLD_CEILING_SKY_TEXTURE_PATH.endsWith('ceiling-sky.png')).toBe(
			true,
		);
		expect(DEFAULT_WORLD_CEILING_SKY_TEXTURE_PATH.includes('ceiling-sky.svg')).toBe(
			false,
		);
	});

	it('Default map renders blue sky above wall height', () => {
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(DEFAULT_WORLD_CEILING_COLOR);
		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(scene.children).toHaveLength(1);
		expect((scene.children[0] as THREE.Mesh).name).toBe(
			'default-world-ceiling-skybox',
		);
		const materials = getSkyboxMaterials(scene);
		expect(materials).toHaveLength(6);
		assertAllFacesUseSkyTexture(materials);
		assertTopFaceTextureIsStretched(materials);
	});

	it('Looking around keeps sky visible above walls', () => {
		const scene = new THREE.Scene();
		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		const skybox = scene.children[0] as THREE.Mesh;
		const materials = getSkyboxMaterials(scene);
		assertAllFacesUseSkyTexture(materials);
		const geometry = skybox.geometry as THREE.BoxGeometry;
		expect(geometry.parameters.width).toBe(DEFAULT_WORLD_CEILING_SKYBOX_SIZE);
		expect(geometry.parameters.height).toBe(DEFAULT_WORLD_CEILING_SKYBOX_SIZE);
		expect(geometry.parameters.depth).toBe(DEFAULT_WORLD_CEILING_SKYBOX_SIZE);
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
