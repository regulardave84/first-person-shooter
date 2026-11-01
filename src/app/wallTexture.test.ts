import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
	type WallTextureLoaderLike,
	applyDefaultWorldWallTexture,
} from './wallTexture';

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

describe('wallTexture', () => {
	it('applies a loaded texture without throwing when material color is missing', () => {
		const materialWithoutColor = {
			map: null,
			needsUpdate: false,
		} as unknown as THREE.MeshStandardMaterial;

		expect(() => {
			applyDefaultWorldWallTexture(materialWithoutColor, {
				textureLoader: createSuccessfulTextureLoader(),
			});
		}).not.toThrow();

		expect(materialWithoutColor.map).toBeInstanceOf(THREE.Texture);
		expect(materialWithoutColor.needsUpdate).toBe(true);
	});

	it('handles load failure safely when logger is omitted', () => {
		const material = new THREE.MeshStandardMaterial({ color: 0x64748b });

		expect(() => {
			applyDefaultWorldWallTexture(material, {
				textureLoader: createFailingTextureLoader(),
			});
		}).not.toThrow();
	});

	it('handles load failure safely when logger has no warn function', () => {
		const material = new THREE.MeshStandardMaterial({ color: 0x64748b });

		expect(() => {
			applyDefaultWorldWallTexture(material, {
				textureLoader: createFailingTextureLoader(),
				logger: {},
			});
		}).not.toThrow();
	});
});
