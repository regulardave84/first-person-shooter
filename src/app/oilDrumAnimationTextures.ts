import * as THREE from 'three';

export type OilDrumAnimatedFrameTexture = {
	assetUrl: string;
	texture: THREE.Texture;
	didLoad: boolean;
	didFail: boolean;
};

type TextureLoaderLike = {
	load: (
		url: string,
		onLoad?: (texture: THREE.Texture) => void,
		onProgress?: (event: ProgressEvent<EventTarget>) => void,
		onError?: (error: unknown) => void,
	) => THREE.Texture;
};

type LoggerLike = {
	warn?: (event: string, context?: Record<string, unknown>) => void;
};

export function configureOilDrumSpriteTexture(
	texture: THREE.Texture,
	visibleCoverageRatio?: number,
): void {
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.generateMipmaps = false;
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.premultiplyAlpha = false;
	if (typeof visibleCoverageRatio !== 'number') {
		return;
	}
	(
		texture.userData as {
			oilDrumVisibleCoverageRatio?: number;
		}
	).oilDrumVisibleCoverageRatio = visibleCoverageRatio;
}

export function getOrLoadOilDrumFrameTextures(params: {
	assetUrls: ReadonlyArray<string>;
	cache: Map<string, OilDrumAnimatedFrameTexture>;
	textureLoader?: TextureLoaderLike;
	logger?: LoggerLike;
	failedEventName: string;
	visibleCoverageRatio?: number;
}): OilDrumAnimatedFrameTexture[] {
	const textureLoader = params.textureLoader ?? new THREE.TextureLoader();
	const shouldUseSharedCache = !params.textureLoader;
	return [...params.assetUrls].map((assetUrl) => {
		const cached = shouldUseSharedCache
			? params.cache.get(assetUrl)
			: undefined;
		if (cached) {
			return cached;
		}
		const frameTexture: OilDrumAnimatedFrameTexture = {
			assetUrl,
			texture: new THREE.Texture(),
			didLoad: false,
			didFail: false,
		};
		frameTexture.texture = textureLoader.load(
			assetUrl,
			() => {
				frameTexture.didLoad = true;
			},
			undefined,
			(error) => {
				frameTexture.didFail = true;
				params.logger?.warn?.(params.failedEventName, {
					assetUrl,
					error,
				});
			},
		);
		configureOilDrumSpriteTexture(
			frameTexture.texture,
			params.visibleCoverageRatio,
		);
		if (shouldUseSharedCache) {
			params.cache.set(assetUrl, frameTexture);
		}
		return frameTexture;
	});
}

export function resolveOilDrumUsableFrameTextures(
	frameTextures: OilDrumAnimatedFrameTexture[],
): THREE.Texture[] {
	const loadedTextures = frameTextures
		.filter((frameTexture) => frameTexture.didLoad && !frameTexture.didFail)
		.map((frameTexture) => frameTexture.texture);
	if (loadedTextures.length > 0) {
		return loadedTextures;
	}
	return frameTextures
		.filter((frameTexture) => !frameTexture.didFail)
		.map((frameTexture) => frameTexture.texture);
}
