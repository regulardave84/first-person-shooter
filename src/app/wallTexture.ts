import * as THREE from 'three';

export const DEFAULT_WORLD_WALL_COLOR = 0x64748b;
export const DEFAULT_WORLD_WALL_TEXTURE_REPEAT_X = 2;
export const DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y = 1;
export const DEFAULT_WORLD_WALL_TEXTURE_PATH = new URL(
	'../assets/wall-brick.png',
	import.meta.url,
).href;

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
