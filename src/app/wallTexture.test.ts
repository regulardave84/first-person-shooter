import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
	applyTiledUvToWallGeometry,
	calculateWallTextureRepeatX,
	createWallGeometryForKind,
	createTiledWallGeometry,
	DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE,
	DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X,
	DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
	type WallTextureLoaderLike,
	applyDefaultWorldWallTexture,
} from './wallTexture';

function getFaceUSpan(geometry: THREE.BoxGeometry, faceIndex: number): number {
	const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
	const baseIndex = faceIndex * 4;
	let minU = Number.POSITIVE_INFINITY;
	let maxU = Number.NEGATIVE_INFINITY;
	for (let vertex = 0; vertex < 4; vertex += 1) {
		const u = uv.getX(baseIndex + vertex);
		minU = Math.min(minU, u);
		maxU = Math.max(maxU, u);
	}
	return maxU - minU;
}

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
	it('creates tiled wall geometry with per-face u-scale from dimensions', () => {
		const geometry = createTiledWallGeometry(12, 4, 1);
		expect(getFaceUSpan(geometry, 0)).toBeCloseTo(
			1 / DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE,
			5,
		);
		expect(getFaceUSpan(geometry, 4)).toBeCloseTo(
			12 / DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE,
			5,
		);
	});

	it('uses default units-per-tile when wall UV tiling input is invalid', () => {
		const geometry = new THREE.BoxGeometry(12, 4, 1);
		applyTiledUvToWallGeometry(geometry, { width: 12, height: 4, depth: 1 }, 0);
		expect(getFaceUSpan(geometry, 4)).toBeCloseTo(
			12 / DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE,
			5,
		);
	});

	it('applies UV tiling to inner walls only', () => {
		const innerGeometry = createWallGeometryForKind(12, 4, 1, 'inner');
		const outerGeometry = createWallGeometryForKind(12, 4, 1, 'outer');

		expect(getFaceUSpan(innerGeometry, 4)).toBeCloseTo(
			12 / DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE,
			5,
		);
		expect(getFaceUSpan(outerGeometry, 4)).toBeCloseTo(1, 5);
	});

	it('scales repeat x from wall span with a safe minimum of one tile', () => {
		expect(calculateWallTextureRepeatX(40)).toBe(13);
		expect(calculateWallTextureRepeatX(12)).toBe(4);
		expect(calculateWallTextureRepeatX(1)).toBe(1);
	});

	it('uses safe defaults for invalid repeat-calculation inputs', () => {
		expect(calculateWallTextureRepeatX(0)).toBe(1);
		expect(calculateWallTextureRepeatX(-10)).toBe(1);
		expect(calculateWallTextureRepeatX(12, 0)).toBe(4);
		expect(calculateWallTextureRepeatX(12, -2)).toBe(4);
	});

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
		expect(materialWithoutColor.map?.wrapS).toBe(THREE.RepeatWrapping);
		expect(materialWithoutColor.map?.wrapT).toBe(THREE.RepeatWrapping);
		expect(materialWithoutColor.map?.repeat.x).toBe(
			DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X,
		);
		expect(materialWithoutColor.map?.repeat.y).toBe(
			DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
		);
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
