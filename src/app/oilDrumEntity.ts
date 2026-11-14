import * as THREE from 'three';
import type { EntityMovementCollider } from '../runtime/fpsRuntime';
import {
	DEFAULT_ENTITY_MAX_HEALTH,
	createEntityHealthState,
	type EntityHealthState,
} from './entityHealth';

export const OIL_DRUM_ENTITY_NAME = 'oil-drum-entity';
export const DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH = new URL(
	'../assets/oil_drum.png',
	import.meta.url,
).href;
export const DEFAULT_OIL_DRUM_DESTROYED_SPRITE_ASSET_PATH = new URL(
	'../assets/oil_drum_destroyed.png',
	import.meta.url,
).href;

export const DEFAULT_OIL_DRUM_SPAWN_OFFSET = {
	x: 1.25,
	y: -0.6,
	z: -3.75,
} as const;

export const DEFAULT_OIL_DRUM_SPRITE_SCALE = {
	x: 1.8,
	y: 2.2,
	z: 1,
} as const;

export const DEFAULT_OIL_DRUM_COLLIDER_RADIUS = 0.75;
export const DEFAULT_OIL_DRUM_COLLIDER_HEIGHT = 2.25;
export const DEFAULT_OIL_DRUM_MAX_HEALTH = DEFAULT_ENTITY_MAX_HEALTH;
export const DEFAULT_OIL_DRUM_BULLET_DAMAGE = 35;

export type OilDrumPosition = {
	x: number;
	y: number;
	z: number;
};

export type OilDrumLogger = {
	info?: (event: string, context?: Record<string, unknown>) => void;
	warn?: (event: string, context?: Record<string, unknown>) => void;
};

export type OilDrumHealthState = EntityHealthState;

export type OilDrumHitSource = 'bullet' | 'non-bullet';

export type OilDrumDamageResult = {
	health: OilDrumHealthState;
	didApplyDamage: boolean;
	wasRemoved: boolean;
	damageApplied: number;
};

export type OilDrumTextureLoaderLike = {
	load: (
		url: string,
		onLoad?: (texture: THREE.Texture) => void,
		onProgress?: (event: ProgressEvent<EventTarget>) => void,
		onError?: (error: unknown) => void,
	) => THREE.Texture;
};

export function resolveOilDrumSpawnPosition(
	playerStartPosition: OilDrumPosition,
	offset: OilDrumPosition = DEFAULT_OIL_DRUM_SPAWN_OFFSET,
): OilDrumPosition {
	return {
		x: playerStartPosition.x + offset.x,
		y: playerStartPosition.y + offset.y,
		z: playerStartPosition.z + offset.z,
	};
}

export function createOilDrumSprite(config?: {
	assetUrl?: string;
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): THREE.Sprite {
	const assetUrl = config?.assetUrl ?? DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH;
	const textureLoader = config?.textureLoader ?? new THREE.TextureLoader();

	const texture = textureLoader.load(
		assetUrl,
		undefined,
		undefined,
		(error) => {
			config?.logger?.warn?.('oil.drum.asset.load.failed', {
				assetUrl,
				error,
			});
		},
	);

	const material = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
	});
	const sprite = new THREE.Sprite(material);
	sprite.name = OIL_DRUM_ENTITY_NAME;
	sprite.scale.set(
		DEFAULT_OIL_DRUM_SPRITE_SCALE.x,
		DEFAULT_OIL_DRUM_SPRITE_SCALE.y,
		DEFAULT_OIL_DRUM_SPRITE_SCALE.z,
	);
	return sprite;
}

export function createOilDrumMovementCollider(
	spawnPosition: OilDrumPosition,
): EntityMovementCollider {
	const halfHeight = DEFAULT_OIL_DRUM_COLLIDER_HEIGHT / 2;
	return {
		x: spawnPosition.x,
		z: spawnPosition.z,
		radius: DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
		minY: spawnPosition.y - halfHeight,
		maxY: spawnPosition.y + halfHeight,
	};
}

export function createOilDrumHealthState(): OilDrumHealthState {
	return createEntityHealthState({
		maxHealth: DEFAULT_OIL_DRUM_MAX_HEALTH,
	});
}

function normalizeOilDrumBulletDamage(damage: number | undefined): number {
	if (!Number.isFinite(damage) || (damage ?? 0) <= 0) {
		return DEFAULT_OIL_DRUM_BULLET_DAMAGE;
	}
	return Math.floor(damage as number);
}

function createNoDamageResult(health: OilDrumHealthState): OilDrumDamageResult {
	return {
		health: {
			currentHealth: health.currentHealth,
			maxHealth: health.maxHealth,
		},
		didApplyDamage: false,
		wasRemoved: false,
		damageApplied: 0,
	};
}

function applyDestroyedSprite(params: {
	wasDestroyed: boolean;
	sprite?: THREE.Sprite;
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): void {
	if (!params.wasDestroyed || !params.sprite) {
		return;
	}

	const textureLoader = params.textureLoader ?? new THREE.TextureLoader();
	const texture = textureLoader.load(
		DEFAULT_OIL_DRUM_DESTROYED_SPRITE_ASSET_PATH,
		undefined,
		undefined,
		(error) => {
			params.logger?.warn?.('oil.drum.destroyed.asset.load.failed', {
				assetUrl: DEFAULT_OIL_DRUM_DESTROYED_SPRITE_ASSET_PATH,
				error,
			});
		},
	);

	const spriteMaterial = params.sprite.material;
	if (spriteMaterial instanceof THREE.SpriteMaterial) {
		spriteMaterial.map = texture;
		spriteMaterial.needsUpdate = true;
	}

	params.logger?.info?.('oil.drum.destroyed.visual.updated', {
		assetUrl: DEFAULT_OIL_DRUM_DESTROYED_SPRITE_ASSET_PATH,
	});
}

export function applyOilDrumHit(params: {
	health: OilDrumHealthState;
	source: OilDrumHitSource;
	bulletDamage?: number;
	sprite?: THREE.Sprite;
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): OilDrumDamageResult {
	if (params.source !== 'bullet' || params.health.currentHealth <= 0) {
		return createNoDamageResult(params.health);
	}

	const damageApplied = normalizeOilDrumBulletDamage(params.bulletDamage);
	const currentHealth = Math.max(
		0,
		params.health.currentHealth - damageApplied,
	);
	const nextHealth = {
		currentHealth,
		maxHealth: params.health.maxHealth,
	};
	const wasDestroyed = currentHealth <= 0;

	params.logger?.info?.('oil.drum.damaged', {
		source: params.source,
		damageApplied,
		currentHealth,
		maxHealth: nextHealth.maxHealth,
	});

	applyDestroyedSprite({
		wasDestroyed,
		sprite: params.sprite,
		textureLoader: params.textureLoader,
		logger: params.logger,
	});

	return {
		health: nextHealth,
		didApplyDamage: true,
		wasRemoved: false,
		damageApplied,
	};
}

export function addDefaultOilDrumEntityToScene(config: {
	scene: THREE.Scene;
	playerStartPosition: OilDrumPosition;
	assetUrl?: string;
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): {
	sprite: THREE.Sprite;
	movementCollider: EntityMovementCollider;
	health: OilDrumHealthState;
} {
	const sprite = createOilDrumSprite({
		assetUrl: config.assetUrl,
		textureLoader: config.textureLoader,
		logger: config.logger,
	});
	const spawn = resolveOilDrumSpawnPosition(config.playerStartPosition);
	const movementCollider = createOilDrumMovementCollider(spawn);
	const health = createOilDrumHealthState();
	sprite.position.set(spawn.x, spawn.y, spawn.z);
	config.scene.add(sprite);
	return {
		sprite,
		movementCollider,
		health,
	};
}
