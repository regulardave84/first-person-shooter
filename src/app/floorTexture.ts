import * as THREE from 'three';

export const DEFAULT_WORLD_FLOOR_COLOR = 0x334155;
export const DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_X = 8;
export const DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_Y = 8;
export const DEFAULT_WORLD_FLOOR_TEXTURE_PATH = new URL(
	'../assets/floor-concrete.png',
	import.meta.url,
).href;

export type FloorTextureLogger = {
	warn?: (message: string, context?: Record<string, unknown>) => void;
};

export type FloorTextureLoaderLike = {
	load: (
		url: string,
		onLoad?: (texture: THREE.Texture) => void,
		onProgress?: (event: ProgressEvent<EventTarget>) => void,
		onError?: (err: unknown) => void,
	) => unknown;
};

type ResolvedFloorTextureConfig = {
	textureUrl: string;
	repeatX: number;
	repeatY: number;
	fallbackColor: number;
	logger?: FloorTextureLogger;
	textureLoader: FloorTextureLoaderLike;
};

function resolveFloorTextureConfig(config?: {
	textureUrl?: string;
	repeatX?: number;
	repeatY?: number;
	fallbackColor?: number;
	logger?: FloorTextureLogger;
	textureLoader?: FloorTextureLoaderLike;
}): ResolvedFloorTextureConfig {
	const {
		textureUrl = DEFAULT_WORLD_FLOOR_TEXTURE_PATH,
		repeatX = DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_X,
		repeatY = DEFAULT_WORLD_FLOOR_TEXTURE_REPEAT_Y,
		fallbackColor = DEFAULT_WORLD_FLOOR_COLOR,
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
	floorMaterial: THREE.MeshStandardMaterial,
	hexColor: number,
): void {
	const maybeColor = (
		floorMaterial as THREE.MeshStandardMaterial & {
			color?: { setHex?: (value: number) => void };
		}
	).color;
	if (maybeColor?.setHex) {
		maybeColor.setHex(hexColor);
	}
}

export function applyDefaultWorldFloorTexture(
	floorMaterial: THREE.MeshStandardMaterial,
	config?: {
		textureUrl?: string;
		repeatX?: number;
		repeatY?: number;
		fallbackColor?: number;
		logger?: FloorTextureLogger;
		textureLoader?: FloorTextureLoaderLike;
	},
): void {
	const resolved = resolveFloorTextureConfig(config);

	resolved.textureLoader.load(
		resolved.textureUrl,
		(texture) => {
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.repeat.set(resolved.repeatX, resolved.repeatY);
			floorMaterial.map = texture;
			setMaterialColorHex(floorMaterial, 0xffffff);
			floorMaterial.needsUpdate = true;
		},
		undefined,
		() => {
			floorMaterial.map = null;
			setMaterialColorHex(floorMaterial, resolved.fallbackColor);
			floorMaterial.needsUpdate = true;
			resolved.logger?.warn?.('floor.texture.load.failed', {
				textureUrl: resolved.textureUrl,
				fallbackColor: resolved.fallbackColor,
			});
		},
	);
}
