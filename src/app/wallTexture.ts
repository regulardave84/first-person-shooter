import * as THREE from 'three';

export const DEFAULT_WORLD_WALL_COLOR = 0x64748b;
export const DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X = 4;
export const DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y = 2;
export const DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE = 3;
export const DEFAULT_WORLD_WALL_TEXTURE_PATH = new URL(
	'../assets/wall-brick.png',
	import.meta.url,
).href;

export function calculateWallTextureRepeatX(
	primaryWallSpan: number,
	worldUnitsPerTile: number = DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE,
): number {
	const resolvedWorldUnitsPerTile =
		Number.isFinite(worldUnitsPerTile) && worldUnitsPerTile > 0
			? worldUnitsPerTile
			: DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE;
	const resolvedPrimaryWallSpan =
		Number.isFinite(primaryWallSpan) && primaryWallSpan > 0
			? primaryWallSpan
			: resolvedWorldUnitsPerTile;

	return Math.max(
		1,
		Math.round(resolvedPrimaryWallSpan / resolvedWorldUnitsPerTile),
	);
}

function resolveWorldUnitsPerTile(worldUnitsPerTile?: number): number {
	if (Number.isFinite(worldUnitsPerTile) && (worldUnitsPerTile ?? 0) > 0) {
		return worldUnitsPerTile as number;
	}
	return DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE;
}

function getFaceUvOffset(faceIndex: number): number {
	return faceIndex * 8;
}

function applyFaceUvScale(
	uvArray: Float32Array,
	baseUvArray: Float32Array,
	faceIndex: number,
	uScale: number,
	vScale: number,
): void {
	const offset = getFaceUvOffset(faceIndex);
	for (let vertex = 0; vertex < 4; vertex += 1) {
		const index = offset + vertex * 2;
		uvArray[index] = baseUvArray[index] * uScale;
		uvArray[index + 1] = baseUvArray[index + 1] * vScale;
	}
}

export function applyTiledUvToWallGeometry(
	geometry: THREE.BoxGeometry,
	wallDimensions: { width: number; height: number; depth: number },
	worldUnitsPerTile: number = DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE,
): THREE.BoxGeometry {
	const maybeGetAttribute = geometry as THREE.BoxGeometry & {
		getAttribute?: (name: string) => { array?: ArrayLike<number> };
	};
	const uvAttribute = maybeGetAttribute.getAttribute?.('uv');
	const rawUvArray = uvAttribute?.array;
	if (!rawUvArray || !(rawUvArray instanceof Float32Array)) {
		return geometry;
	}

	const unitsPerTile = resolveWorldUnitsPerTile(worldUnitsPerTile);
	const widthTiles = wallDimensions.width / unitsPerTile;
	const heightTiles = wallDimensions.height / unitsPerTile;
	const depthTiles = wallDimensions.depth / unitsPerTile;

	const baseUvArray = Float32Array.from(rawUvArray);

	// BoxGeometry face order: right, left, top, bottom, front, back.
	applyFaceUvScale(rawUvArray, baseUvArray, 0, depthTiles, heightTiles);
	applyFaceUvScale(rawUvArray, baseUvArray, 1, depthTiles, heightTiles);
	applyFaceUvScale(rawUvArray, baseUvArray, 2, widthTiles, depthTiles);
	applyFaceUvScale(rawUvArray, baseUvArray, 3, widthTiles, depthTiles);
	applyFaceUvScale(rawUvArray, baseUvArray, 4, widthTiles, heightTiles);
	applyFaceUvScale(rawUvArray, baseUvArray, 5, widthTiles, heightTiles);

	const maybeNeedsUpdate = uvAttribute as { needsUpdate?: boolean };
	maybeNeedsUpdate.needsUpdate = true;

	return geometry;
}

export function createTiledWallGeometry(
	width: number,
	height: number,
	depth: number,
	worldUnitsPerTile: number = DEFAULT_WORLD_WALL_TEXTURE_WORLD_UNITS_PER_TILE,
): THREE.BoxGeometry {
	const geometry = new THREE.BoxGeometry(width, height, depth);
	return applyTiledUvToWallGeometry(
		geometry,
		{ width, height, depth },
		worldUnitsPerTile,
	);
}

export function createWallGeometryForKind(
	width: number,
	height: number,
	depth: number,
	kind: 'outer' | 'inner',
): THREE.BoxGeometry {
	if (kind === 'inner') {
		return createTiledWallGeometry(width, height, depth);
	}
	return new THREE.BoxGeometry(width, height, depth);
}

export type WallTextureLogger = {
	warn?: (message: string, context?: Record<string, unknown>) => void;
};

export type WallTextureLoaderLike = {
	load: (
		url: string,
		onLoad?: (texture: THREE.Texture) => void,
		onProgress?: (event: ProgressEvent<EventTarget>) => void,
		onError?: (err: unknown) => void,
	) => unknown;
};

type ResolvedWallTextureConfig = {
	textureUrl: string;
	repeatX: number;
	repeatY: number;
	fallbackColor: number;
	logger?: WallTextureLogger;
	textureLoader: WallTextureLoaderLike;
};

function resolveWallTextureConfig(config?: {
	textureUrl?: string;
	repeatX?: number;
	repeatY?: number;
	fallbackColor?: number;
	logger?: WallTextureLogger;
	textureLoader?: WallTextureLoaderLike;
}): ResolvedWallTextureConfig {
	const {
		textureUrl = DEFAULT_WORLD_WALL_TEXTURE_PATH,
		repeatX = DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X,
		repeatY = DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
		fallbackColor = DEFAULT_WORLD_WALL_COLOR,
		logger,
		textureLoader,
	} = config ?? {};

	return {
		textureUrl,
		repeatX,
		repeatY,
		fallbackColor,
		logger,
		textureLoader: textureLoader ?? new THREE.TextureLoader(),
	};
}

function setMaterialColorHex(
	wallMaterial: THREE.MeshStandardMaterial,
	hexColor: number,
): void {
	const maybeColor = (
		wallMaterial as THREE.MeshStandardMaterial & {
			color?: { setHex?: (value: number) => void };
		}
	).color;
	if (maybeColor?.setHex) {
		maybeColor.setHex(hexColor);
	}
}

export function applyDefaultWorldWallTexture(
	wallMaterial: THREE.MeshStandardMaterial,
	config?: {
		textureUrl?: string;
		repeatX?: number;
		repeatY?: number;
		fallbackColor?: number;
		logger?: WallTextureLogger;
		textureLoader?: WallTextureLoaderLike;
	},
): void {
	const resolved = resolveWallTextureConfig(config);

	resolved.textureLoader.load(
		resolved.textureUrl,
		(texture) => {
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.repeat.set(resolved.repeatX, resolved.repeatY);
			wallMaterial.map = texture;
			setMaterialColorHex(wallMaterial, 0xffffff);
			wallMaterial.needsUpdate = true;
		},
		undefined,
		() => {
			wallMaterial.map = null;
			setMaterialColorHex(wallMaterial, resolved.fallbackColor);
			wallMaterial.needsUpdate = true;
			resolved.logger?.warn?.('wall.texture.load.failed', {
				textureUrl: resolved.textureUrl,
				fallbackColor: resolved.fallbackColor,
			});
		},
	);
}
