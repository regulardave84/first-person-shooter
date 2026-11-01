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
