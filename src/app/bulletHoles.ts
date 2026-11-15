import * as THREE from 'three';

export const DEFAULT_BULLET_HOLE_TEXTURE_ASSET_PATH = new URL(
	'../assets/bullet_hole.png',
	import.meta.url,
).href;
export const DEFAULT_BULLET_HOLE_WORLD_SIZE = 0.35;
export const DEFAULT_BULLET_HOLE_MAX_COUNT = 100;
const BULLET_HOLE_FLOOR_VERTICAL_OFFSET = 0.01;

export type BulletHoleImpactKind = 'wall' | 'floor' | 'ceiling' | 'entity';

export type BulletHolePoint = {
	x: number;
	y: number;
	z: number;
};

export type BulletHoleImpact = {
	colliderKind: BulletHoleImpactKind;
	point: BulletHolePoint;
};

export type BulletHoleManager = {
	recordImpact: (impact: BulletHoleImpact) => THREE.Sprite | null;
	getActiveBulletHoleCount: () => number;
};

type BulletHoleLogger = {
	warn?: (event: string, context?: Record<string, unknown>) => void;
};

type BulletHoleTextureLoaderLike = {
	load: (
		url: string,
		onLoad?: (texture: THREE.Texture) => void,
		onProgress?: (event: ProgressEvent<EventTarget>) => void,
		onError?: (err: unknown) => void,
	) => THREE.Texture;
};

type ManagedBulletHole = {
	sprite: THREE.Sprite;
};

function createBulletHoleTexture(
	textureLoader: BulletHoleTextureLoaderLike,
	assetUrl: string,
	logger?: BulletHoleLogger,
): THREE.Texture {
	return textureLoader.load(
		assetUrl,
		(texture) => {
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.wrapS = THREE.ClampToEdgeWrapping;
			texture.wrapT = THREE.ClampToEdgeWrapping;
			texture.needsUpdate = true;
		},
		undefined,
		(error) => {
			logger?.warn?.('bullet.hole.asset.load.failed', {
				assetUrl,
				error:
					error instanceof Error
						? error.message
						: typeof error === 'string'
							? error
							: 'unknown',
			});
		},
	);
}

function shouldCreateBulletHole(kind: BulletHoleImpactKind): boolean {
	return kind === 'wall' || kind === 'floor';
}

function resolveWorldPosition(impact: BulletHoleImpact): THREE.Vector3 {
	const yOffset =
		impact.colliderKind === 'floor' ? BULLET_HOLE_FLOOR_VERTICAL_OFFSET : 0;
	return new THREE.Vector3(
		impact.point.x,
		impact.point.y + yOffset,
		impact.point.z,
	);
}

function placeBulletHoleSprite(params: {
	sprite: THREE.Sprite;
	worldPosition: THREE.Vector3;
	scene: THREE.Scene;
}): void {
	const { sprite, worldPosition, scene } = params;
	scene.add(sprite);
	sprite.position.copy(worldPosition);
}

export function createBulletHoleManager(params: {
	scene: THREE.Scene;
	textureLoader?: BulletHoleTextureLoaderLike;
	assetUrl?: string;
	size?: number;
	maxBulletHoles?: number;
	logger?: BulletHoleLogger;
}): BulletHoleManager {
	const textureLoader = params.textureLoader ?? new THREE.TextureLoader();
	const bulletHoleTexture = createBulletHoleTexture(
		textureLoader,
		params.assetUrl ?? DEFAULT_BULLET_HOLE_TEXTURE_ASSET_PATH,
		params.logger,
	);
	const size = params.size ?? DEFAULT_BULLET_HOLE_WORLD_SIZE;
	const maxBulletHoles = params.maxBulletHoles ?? DEFAULT_BULLET_HOLE_MAX_COUNT;
	const activeBulletHoles: ManagedBulletHole[] = [];

	function removeOldestIfNeeded(): void {
		while (activeBulletHoles.length > maxBulletHoles) {
			const oldest = activeBulletHoles.shift();
			if (!oldest?.sprite.parent) {
				continue;
			}
			oldest.sprite.parent.remove(oldest.sprite);
		}
	}

	return {
		recordImpact: (impact) => {
			if (!shouldCreateBulletHole(impact.colliderKind)) {
				return null;
			}

			const sprite = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: bulletHoleTexture,
					transparent: true,
					depthWrite: false,
				}),
			);
			sprite.scale.set(size, size, size);
			placeBulletHoleSprite({
				sprite,
				worldPosition: resolveWorldPosition(impact),
				scene: params.scene,
			});

			activeBulletHoles.push({ sprite });
			removeOldestIfNeeded();

			return sprite;
		},
		getActiveBulletHoleCount: () => activeBulletHoles.length,
	};
}
