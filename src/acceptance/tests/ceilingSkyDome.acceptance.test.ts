import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_WORLD_CEILING_COLOR,
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

describe('Acceptance: Ceiling sky uses a single-texture sky dome', () => {
	it('Default sky uses dome geometry instead of a box', () => {
		const scene = new THREE.Scene();
		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(scene.children).toHaveLength(1);
		const sky = scene.children[0] as THREE.Mesh;
		expect(sky.name).toBe('default-world-ceiling-skydome');
		expect(sky.geometry).toBeInstanceOf(THREE.SphereGeometry);
		const material = sky.material as THREE.MeshBasicMaterial;
		expect(material.map).toBeInstanceOf(THREE.Texture);
		expect(material.side).toBe(THREE.BackSide);
	});

	it('Sky texture appears once without side duplication', () => {
		const scene = new THREE.Scene();
		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		const sky = scene.children[0] as THREE.Mesh;
		const geometry = sky.geometry as THREE.SphereGeometry;
		expect(geometry.parameters.radius).toBeGreaterThan(0);
		expect(geometry.parameters.widthSegments).toBeGreaterThanOrEqual(32);
		expect(geometry.parameters.heightSegments).toBeGreaterThanOrEqual(16);
		const material = sky.material as THREE.MeshBasicMaterial;
		expect(material.map).toBeInstanceOf(THREE.Texture);
		expect(material.map?.repeat.x).toBeCloseTo(1);
		expect(material.map?.repeat.y).toBeCloseTo(1);
	});

	it('Existing fallback behavior is preserved on texture load failure', () => {
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
