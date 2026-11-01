import * as THREE from 'three';

export const DEFAULT_WORLD_CEILING_COLOR = 0x0b1020;
export const DEFAULT_WORLD_CEILING_SKYBOX_SIZE = 400;
export const DEFAULT_WORLD_CEILING_SKY_TEXTURE_PATH = new URL(
	'../assets/ceiling-sky.svg',
	import.meta.url,
).href;

export type CeilingSkyboxLogger = {
	warn?: (message: string, context?: Record<string, unknown>) => void;
};

export type TextureLoaderLike = {
	load: (
		url: string,
		onLoad?: (texture: THREE.Texture) => void,
		onProgress?: (event: ProgressEvent<EventTarget>) => void,
		onError?: (err: unknown) => void,
	) => unknown;
};

type CeilingSkyboxResolvedConfig = {
	textureUrl: string;
	fallbackColor: number;
	skyboxSize: number;
	logger?: CeilingSkyboxLogger;
	textureLoader: TextureLoaderLike;
};

function resolveSkyboxConfig(config?: {
	textureUrl?: string;
	fallbackColor?: number;
	skyboxSize?: number;
	logger?: CeilingSkyboxLogger;
	textureLoader?: TextureLoaderLike;
}): CeilingSkyboxResolvedConfig {
	const {
		textureUrl = DEFAULT_WORLD_CEILING_SKY_TEXTURE_PATH,
		fallbackColor = DEFAULT_WORLD_CEILING_COLOR,
		skyboxSize = DEFAULT_WORLD_CEILING_SKYBOX_SIZE,
		logger,
		textureLoader,
	} = config ?? {};

	return {
		textureUrl,
		fallbackColor,
		skyboxSize,
		logger,
		textureLoader: textureLoader ?? new THREE.TextureLoader(),
	};
}

function createSkyboxMaterials(
	texture: THREE.Texture,
): THREE.MeshBasicMaterial[] {
	const createFace = () =>
		new THREE.MeshBasicMaterial({
			map: texture,
			color: 0xffffff,
			side: THREE.BackSide,
		});

	return [
		createFace(),
		createFace(),
		createFace(),
		createFace(),
		createFace(),
		createFace(),
	];
}

export function applyDefaultWorldCeilingSkybox(
	scene: THREE.Scene,
	config?: {
		textureUrl?: string;
		fallbackColor?: number;
		skyboxSize?: number;
		logger?: CeilingSkyboxLogger;
		textureLoader?: TextureLoaderLike;
	},
): void {
	const resolved = resolveSkyboxConfig(config);

	resolved.textureLoader.load(
		resolved.textureUrl,
		(texture) => {
			texture.wrapS = THREE.ClampToEdgeWrapping;
			texture.wrapT = THREE.ClampToEdgeWrapping;
			texture.repeat.set(1, 1);

			const skybox = new THREE.Mesh(
				new THREE.BoxGeometry(
					resolved.skyboxSize,
					resolved.skyboxSize,
					resolved.skyboxSize,
				),
				createSkyboxMaterials(texture),
			);
			skybox.name = 'default-world-ceiling-skybox';
			scene.add(skybox);
		},
		undefined,
		() => {
			resolved.logger?.warn?.('ceiling.skybox.texture.load.failed', {
				textureUrl: resolved.textureUrl,
				fallbackColor: resolved.fallbackColor,
			});
		},
	);
}
