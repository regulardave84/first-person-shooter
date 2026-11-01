import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
	DEFAULT_WORLD_FLOOR_COLOR,
	DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_X,
	DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_Y,
	applyDefaultWorldFloorTexture,
	type FloorTextureLoaderLike,
} from '../../app/floorTexture';
import {
	DEFAULT_WORLD_WALL_COLOR,
	DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X,
	DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
	DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE,
	applyDefaultWorldWallTexture,
	calculateWallTextureRepeatX,
	createWallGeometryForKind,
	createTiledWallGeometry,
	type WallTextureLoaderLike,
} from '../../app/wallTexture';
import { WORLD_WALLS } from '../../runtime/world';

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

function createSuccessfulFloorTextureLoader(): FloorTextureLoaderLike {
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

function createSuccessfulWallTextureLoader(): WallTextureLoaderLike {
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

describe('Acceptance: Crisp grid-aligned floor and outer wall textures', () => {
	it('Floor texture is tiled in a repeatable grid pattern', () => {
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_FLOOR_COLOR,
		});

		applyDefaultWorldFloorTexture(floorMaterial, {
			textureLoader: createSuccessfulFloorTextureLoader(),
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
	});

	it('Outer wall texture matches inner wall brick scale', () => {
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_WALL_COLOR,
		});

		applyDefaultWorldWallTexture(wallMaterial, {
			textureLoader: createSuccessfulWallTextureLoader(),
		});

		expect(wallMaterial.map).toBeInstanceOf(THREE.Texture);
		expect(wallMaterial.map?.wrapS).toBe(THREE.RepeatWrapping);
		expect(wallMaterial.map?.wrapT).toBe(THREE.RepeatWrapping);
		expect(wallMaterial.map?.repeat.x).toBe(
			DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X,
		);
		expect(wallMaterial.map?.repeat.y).toBe(
			DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
		);
		expect(DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X).toBeGreaterThan(1);
		expect(DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y).toBeGreaterThan(1);

		const outerWalls = WORLD_WALLS.filter((wall) => wall.kind === 'outer');
		const innerWalls = WORLD_WALLS.filter((wall) => wall.kind === 'inner');
		const unitsPerTile = (wall: (typeof WORLD_WALLS)[number]): number => {
			const primarySpan = Math.max(wall.w, wall.d);
			const repeatX = calculateWallTextureRepeatX(primarySpan);
			return primarySpan / repeatX;
		};

		const outerUnitsPerTile = outerWalls.map(unitsPerTile);
		const innerUnitsPerTile = innerWalls.map(unitsPerTile);
		const outerAverage =
			outerUnitsPerTile.reduce((sum, value) => sum + value, 0) /
			outerUnitsPerTile.length;
		const innerAverage =
			innerUnitsPerTile.reduce((sum, value) => sum + value, 0) /
			innerUnitsPerTile.length;

		expect(Math.abs(outerAverage - innerAverage)).toBeLessThanOrEqual(0.5);
	});

	it('Tiled textures remain stable while looking around', () => {
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_FLOOR_COLOR,
		});
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_WALL_COLOR,
		});

		applyDefaultWorldFloorTexture(floorMaterial, {
			textureLoader: createSuccessfulFloorTextureLoader(),
		});
		applyDefaultWorldWallTexture(wallMaterial, {
			textureLoader: createSuccessfulWallTextureLoader(),
		});

		expect(floorMaterial.map).toBeInstanceOf(THREE.Texture);
		expect(wallMaterial.map).toBeInstanceOf(THREE.Texture);
		expect(floorMaterial.map?.repeat.x).toBeGreaterThan(1);
		expect(floorMaterial.map?.repeat.y).toBeGreaterThan(1);
		expect(wallMaterial.map?.repeat.x).toBeGreaterThan(1);
		expect(wallMaterial.map?.repeat.y).toBeGreaterThan(1);
	});

	it('Inner wall side faces render with clear non-squashed bricks', () => {
		const innerWall = WORLD_WALLS.find(
			(wall) => wall.kind === 'inner' && Math.min(wall.w, wall.d) === 1,
		);
		expect(innerWall).toBeDefined();

		const wall = innerWall as NonNullable<typeof innerWall>;
		const geometry = createTiledWallGeometry(wall.w, wall.h, wall.d);
		const sideFaceU = getFaceUSpan(geometry, 0);
		const frontFaceU = getFaceUSpan(geometry, 4);
		const expectedSideFaceTiles =
			Math.min(wall.w, wall.d) /
			DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE;
		const expectedFrontFaceTiles =
			Math.max(wall.w, wall.d) /
			DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE;

		expect(sideFaceU).toBeCloseTo(expectedSideFaceTiles, 5);
		expect(frontFaceU).toBeCloseTo(expectedFrontFaceTiles, 5);
		expect(sideFaceU).toBeLessThan(frontFaceU);
	});

	it('Outer wall faces render with clear non-squashed brick scale', () => {
		const outerWall = WORLD_WALLS.find((wall) => wall.kind === 'outer');
		const innerWall = WORLD_WALLS.find((wall) => wall.kind === 'inner');
		expect(outerWall).toBeDefined();
		expect(innerWall).toBeDefined();

		const outerGeometry = createWallGeometryForKind(
			(outerWall as NonNullable<typeof outerWall>).w,
			(outerWall as NonNullable<typeof outerWall>).h,
			(outerWall as NonNullable<typeof outerWall>).d,
			'outer',
		);
		const innerGeometry = createWallGeometryForKind(
			(innerWall as NonNullable<typeof innerWall>).w,
			(innerWall as NonNullable<typeof innerWall>).h,
			(innerWall as NonNullable<typeof innerWall>).d,
			'inner',
		);

		expect(getFaceUSpan(outerGeometry, 4)).toBeCloseTo(1, 5);
		expect(getFaceUSpan(innerGeometry, 4)).toBeGreaterThan(1);
	});

	it('Texture loading failure still uses safe fallback rendering', () => {
		const floorMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_FLOOR_COLOR,
		});
		const wallMaterial = new THREE.MeshStandardMaterial({
			color: DEFAULT_WORLD_WALL_COLOR,
		});

		const failingFloorTextureLoader: FloorTextureLoaderLike = {
			load: (
				_textureUrl: string,
				_onLoad?: (texture: THREE.Texture) => void,
				_onProgress?: (event: ProgressEvent<EventTarget>) => void,
				onError?: (err: unknown) => void,
			): THREE.Texture => {
				onError?.(new Error('floor texture failed'));
				return new THREE.Texture();
			},
		};
		const failingWallTextureLoader: WallTextureLoaderLike = {
			load: (
				_textureUrl: string,
				_onLoad?: (texture: THREE.Texture) => void,
				_onProgress?: (event: ProgressEvent<EventTarget>) => void,
				onError?: (err: unknown) => void,
			): THREE.Texture => {
				onError?.(new Error('wall texture failed'));
				return new THREE.Texture();
			},
		};

		expect(() => {
			applyDefaultWorldFloorTexture(floorMaterial, {
				textureLoader: failingFloorTextureLoader,
			});
			applyDefaultWorldWallTexture(wallMaterial, {
				textureLoader: failingWallTextureLoader,
			});
		}).not.toThrow();

		expect(floorMaterial.map).toBeNull();
		expect(wallMaterial.map).toBeNull();
		expect(floorMaterial.color.getHex()).toBe(DEFAULT_WORLD_FLOOR_COLOR);
		expect(wallMaterial.color.getHex()).toBe(DEFAULT_WORLD_WALL_COLOR);
	});
});
