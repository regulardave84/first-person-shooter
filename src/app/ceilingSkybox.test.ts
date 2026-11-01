import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_WORLD_CEILING_SKY_TEXTURE_PATH,
	applyDefaultWorldCeilingSkybox,
} from './ceilingSkybox';

describe('ceilingSkybox', () => {
	it('uses default config when omitted', () => {
		const loadSpy = vi
			.spyOn(THREE.TextureLoader.prototype, 'load')
			.mockImplementation((_url, onLoad) => {
				const texture = new THREE.Texture() as THREE.Texture<HTMLImageElement>;
				onLoad?.(texture);
				return texture;
			});
		const scene = new THREE.Scene();

		expect(() => applyDefaultWorldCeilingSkybox(scene)).not.toThrow();
		expect(loadSpy).toHaveBeenCalledTimes(1);
		expect(loadSpy.mock.calls[0]?.[0]).toBe(
			DEFAULT_WORLD_CEILING_SKY_TEXTURE_PATH,
		);

		loadSpy.mockRestore();
	});

	it('creates a single-material sky dome mesh', () => {
		const loadSpy = vi
			.spyOn(THREE.TextureLoader.prototype, 'load')
			.mockImplementation((_url, onLoad) => {
				const texture = new THREE.Texture() as THREE.Texture<HTMLImageElement>;
				onLoad?.(texture);
				return texture;
			});
		const scene = new THREE.Scene();

		applyDefaultWorldCeilingSkybox(scene);

		const skydome = scene.children[0] as THREE.Mesh;
		expect(skydome.name).toBe('default-world-ceiling-skydome');

		const geometry = skydome.geometry as THREE.SphereGeometry;
		expect(geometry).toBeInstanceOf(THREE.SphereGeometry);
		expect(geometry.parameters.radius).toBeCloseTo(200);

		const material = skydome.material as THREE.MeshBasicMaterial;
		expect(material).toBeInstanceOf(THREE.MeshBasicMaterial);
		expect(material.side).toBe(THREE.BackSide);
		expect(material.map).toBeInstanceOf(THREE.Texture);

		loadSpy.mockRestore();
	});

	it('does not throw on load failure without logger', () => {
		const loadSpy = vi
			.spyOn(THREE.TextureLoader.prototype, 'load')
			.mockImplementation((_, __, ___, onError) => {
				onError?.(new Error('failed'));
				return new THREE.Texture() as THREE.Texture<HTMLImageElement>;
			});
		const scene = new THREE.Scene();

		expect(() => applyDefaultWorldCeilingSkybox(scene)).not.toThrow();
		expect(scene.children).toHaveLength(0);

		loadSpy.mockRestore();
	});
});
