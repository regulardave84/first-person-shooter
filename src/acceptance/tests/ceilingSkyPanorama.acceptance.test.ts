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

function getSkybox(scene: THREE.Scene): THREE.Mesh {
	return scene.children[0] as THREE.Mesh;
}

describe('Acceptance: Ceiling sky appears as a continuous real sky', () => {
	it('Sky uses a continuous panoramic mapping', () => {
		const scene = new THREE.Scene();
		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		expect(scene.children).toHaveLength(1);
		expect(getSkybox(scene).name).toBe('default-world-ceiling-skydome');

		const geometry = getSkybox(scene).geometry as THREE.SphereGeometry;
		expect(geometry.parameters.radius).toBeGreaterThan(0);
		const material = getSkybox(scene).material as THREE.MeshBasicMaterial;
		expect(material.map).toBeInstanceOf(THREE.Texture);
		expect(material.side).toBe(THREE.BackSide);
	});

	it('Sky remains stable while looking around', () => {
		const scene = new THREE.Scene();
		applyDefaultWorldCeilingSkybox(scene, {
			textureLoader: createSuccessfulTextureLoader(),
		});

		const material = getSkybox(scene).material as THREE.MeshBasicMaterial;
		const texture = material.map;
		expect(texture).toBeInstanceOf(THREE.Texture);
		expect(texture?.repeat.x).toBeCloseTo(1);
		expect(texture?.repeat.y).toBeCloseTo(1);
	});

	it('Texture load failure preserves existing fallback behavior', () => {
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
