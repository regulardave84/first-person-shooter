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
export const DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS = [
	new URL(
		'../assets/oil_drum_burning_frames/oil_drum_burning_01.png',
		import.meta.url,
	).href,
	new URL(
		'../assets/oil_drum_burning_frames/oil_drum_burning_02.png',
		import.meta.url,
	).href,
	new URL(
		'../assets/oil_drum_burning_frames/oil_drum_burning_03.png',
		import.meta.url,
	).href,
	new URL(
		'../assets/oil_drum_burning_frames/oil_drum_burning_04.png',
		import.meta.url,
	).href,
	new URL(
		'../assets/oil_drum_burning_frames/oil_drum_burning_05.png',
		import.meta.url,
	).href,
	new URL(
		'../assets/oil_drum_burning_frames/oil_drum_burning_06.png',
		import.meta.url,
	).href,
	new URL(
		'../assets/oil_drum_burning_frames/oil_drum_burning_07.png',
		import.meta.url,
	).href,
	new URL(
		'../assets/oil_drum_burning_frames/oil_drum_burning_08.png',
		import.meta.url,
	).href,
] as const;

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
export const DEFAULT_OIL_DRUM_FIRE_THRESHOLD_RATIO = 0.5;
export const DEFAULT_OIL_DRUM_FIRE_ANIMATION_FRAME_COUNT = 8;
export const DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS = 12;
export const DEFAULT_OIL_DRUM_VISIBLE_COVERAGE_RATIO = 0.64;
export const DEFAULT_OIL_DRUM_FIRE_VISIBLE_COVERAGE_RATIO = 0.16;

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

export type OilDrumVisualState = 'default' | 'fire' | 'destroyed';

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

type OilDrumFireFrameTexture = {
	assetUrl: string;
	texture: THREE.Texture;
	didLoad: boolean;
	didFail: boolean;
};

type OilDrumSpriteState = {
	oilDrumVisualState?: OilDrumVisualState;
	oilDrumFireElapsedSeconds?: number;
	oilDrumFireFrame?: number;
	oilDrumFireFrameTextures?: OilDrumFireFrameTexture[];
	oilDrumDefaultTexture?: THREE.Texture;
	oilDrumBaseScale?: { x: number; y: number; z: number };
	oilDrumBasePosition?: { x: number; y: number; z: number };
};

const oilDrumFireFrameTextureCache = new Map<string, OilDrumFireFrameTexture>();

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
	(
		texture.userData as { oilDrumVisibleCoverageRatio?: number }
	).oilDrumVisibleCoverageRatio = DEFAULT_OIL_DRUM_VISIBLE_COVERAGE_RATIO;

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

function resolveOilDrumVisualState(
	health: OilDrumHealthState,
): OilDrumVisualState {
	if (health.currentHealth <= 0) {
		return 'destroyed';
	}

	if (
		health.currentHealth > 0 &&
		health.currentHealth <
			health.maxHealth * DEFAULT_OIL_DRUM_FIRE_THRESHOLD_RATIO
	) {
		return 'fire';
	}

	return 'default';
}

function setOilDrumVisualState(
	sprite: THREE.Sprite,
	state: OilDrumVisualState,
): void {
	(
		getOilDrumSpriteState(sprite) as { oilDrumVisualState?: OilDrumVisualState }
	).oilDrumVisualState = state;
}

function getOilDrumVisualState(sprite: THREE.Sprite): OilDrumVisualState {
	return getOilDrumSpriteState(sprite).oilDrumVisualState ?? 'default';
}

function getOilDrumSpriteState(sprite: THREE.Sprite): OilDrumSpriteState {
	return sprite.userData as OilDrumSpriteState;
}

function resetOilDrumFireAnimation(sprite: THREE.Sprite): void {
	const state = getOilDrumSpriteState(sprite);
	state.oilDrumFireElapsedSeconds = 0;
	state.oilDrumFireFrame = 0;
	if (!state.oilDrumFireFrameTextures) {
		state.oilDrumFireFrameTextures = [];
	}
	ensureOilDrumBaseTransform(sprite);
}

function resolveTextureVisibleCoverageRatio(
	texture: THREE.Texture,
): number | null {
	const metadataCoverage = resolveTextureCoverageFromUserData(texture);
	return metadataCoverage;
}

function resolveTextureCoverageFromUserData(
	texture: THREE.Texture,
): number | null {
	const userDataCoverage = (
		texture.userData as { oilDrumVisibleCoverageRatio?: unknown }
	).oilDrumVisibleCoverageRatio;
	if (
		typeof userDataCoverage === 'number' &&
		Number.isFinite(userDataCoverage) &&
		userDataCoverage > 0
	) {
		return userDataCoverage;
	}

	return null;
}

function applyOilDrumFireScaleCompensation(params: {
	sprite: THREE.Sprite;
	defaultTexture?: THREE.Texture;
	fireTexture?: THREE.Texture;
	logger?: OilDrumLogger;
}): void {
	if (!params.defaultTexture || !params.fireTexture) {
		return;
	}

	const state = getOilDrumSpriteState(params.sprite);
	ensureOilDrumBaseTransform(params.sprite);

	const defaultCoverage = resolveTextureVisibleCoverageRatio(
		params.defaultTexture,
	);
	const fireCoverage = resolveTextureVisibleCoverageRatio(params.fireTexture);
	if (!defaultCoverage || !fireCoverage) {
		return;
	}

	const clampedScaleMultiplier = resolveClampedOilDrumScaleMultiplier(
		defaultCoverage,
		fireCoverage,
	);
	if (clampedScaleMultiplier === null) {
		return;
	}

	const baseScale = state.oilDrumBaseScale as {
		x: number;
		y: number;
		z: number;
	};
	const basePosition = state.oilDrumBasePosition as {
		x: number;
		y: number;
		z: number;
	};
	const nextScaleY = baseScale.y * clampedScaleMultiplier;
	params.sprite.scale.set(
		baseScale.x * clampedScaleMultiplier,
		nextScaleY,
		baseScale.z,
	);
	params.sprite.position.y = basePosition.y + (nextScaleY - baseScale.y) / 2;

	params.logger?.info?.('oil.drum.fire.scale.compensated', {
		scaleMultiplier: clampedScaleMultiplier,
	});
}

function ensureOilDrumBaseTransform(sprite: THREE.Sprite): void {
	const state = getOilDrumSpriteState(sprite);
	if (state.oilDrumBaseScale) {
		if (!state.oilDrumBasePosition) {
			state.oilDrumBasePosition = {
				x: sprite.position.x,
				y: sprite.position.y,
				z: sprite.position.z,
			};
		}
		return;
	}

	state.oilDrumBaseScale = {
		x: sprite.scale.x,
		y: sprite.scale.y,
		z: sprite.scale.z,
	};
	state.oilDrumBasePosition = {
		x: sprite.position.x,
		y: sprite.position.y,
		z: sprite.position.z,
	};
}

function resolveClampedOilDrumScaleMultiplier(
	defaultCoverage: number,
	fireCoverage: number,
): number | null {
	const scaleMultiplier = Math.sqrt(defaultCoverage / fireCoverage);
	if (!Number.isFinite(scaleMultiplier) || scaleMultiplier <= 0) {
		return null;
	}

	return Math.min(3, Math.max(1, scaleMultiplier));
}

function restoreOilDrumDefaultScale(sprite: THREE.Sprite): void {
	const state = getOilDrumSpriteState(sprite);
	const baseScale = state.oilDrumBaseScale;
	const basePosition = state.oilDrumBasePosition;
	if (!baseScale) {
		return;
	}

	sprite.scale.set(baseScale.x, baseScale.y, baseScale.z);
	if (basePosition) {
		sprite.position.set(basePosition.x, basePosition.y, basePosition.z);
	}
}

function getOrLoadOilDrumFireFrameTextures(params: {
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): OilDrumFireFrameTexture[] {
	const textureLoader = params.textureLoader ?? new THREE.TextureLoader();
	const shouldUseSharedCache = !params.textureLoader;

	return [...DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS].map((assetUrl) => {
		const cached = shouldUseSharedCache
			? oilDrumFireFrameTextureCache.get(assetUrl)
			: undefined;
		if (cached) {
			return cached;
		}

		const frameTexture: OilDrumFireFrameTexture = {
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
				params.logger?.warn?.('oil.drum.fire.frame.asset.load.failed', {
					assetUrl,
					error,
				});
			},
		);
		(
			frameTexture.texture.userData as {
				oilDrumVisibleCoverageRatio?: number;
			}
		).oilDrumVisibleCoverageRatio =
			DEFAULT_OIL_DRUM_FIRE_VISIBLE_COVERAGE_RATIO;

		if (shouldUseSharedCache) {
			oilDrumFireFrameTextureCache.set(assetUrl, frameTexture);
		}
		return frameTexture;
	});
}

function resolveOilDrumUsableFireFrameTextures(
	sprite: THREE.Sprite,
): THREE.Texture[] {
	const state = getOilDrumSpriteState(sprite);
	const frameTextures = state.oilDrumFireFrameTextures ?? [];
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

function applyOilDrumFireSprite(params: {
	wasOnFire: boolean;
	sprite?: THREE.Sprite;
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): void {
	if (!params.sprite) {
		return;
	}

	if (params.wasOnFire) {
		return;
	}

	const frameTextures = getOrLoadOilDrumFireFrameTextures({
		textureLoader: params.textureLoader,
		logger: params.logger,
	});
	const state = getOilDrumSpriteState(params.sprite);
	state.oilDrumFireFrameTextures = frameTextures;

	const usableFireTextures = resolveOilDrumUsableFireFrameTextures(
		params.sprite,
	);
	applyInitialOilDrumFireTexture({
		sprite: params.sprite,
		fireTexture: usableFireTextures[0],
		logger: params.logger,
	});
	finalizeOilDrumFireVisualUpdate(params.sprite, params.logger);
}

function applyInitialOilDrumFireTexture(params: {
	sprite: THREE.Sprite;
	fireTexture?: THREE.Texture;
	logger?: OilDrumLogger;
}): void {
	if (!params.fireTexture) {
		return;
	}

	const spriteMaterial = resolveOilDrumSpriteMaterial(params.sprite);
	if (!spriteMaterial) {
		return;
	}

	const state = getOilDrumSpriteState(params.sprite);
	const defaultTexture =
		(spriteMaterial.map as THREE.Texture | null | undefined) ?? undefined;
	if (defaultTexture) {
		state.oilDrumDefaultTexture = defaultTexture;
	}

	spriteMaterial.map = params.fireTexture;
	spriteMaterial.needsUpdate = true;
	applyOilDrumFireScaleCompensation({
		sprite: params.sprite,
		defaultTexture: state.oilDrumDefaultTexture,
		fireTexture: params.fireTexture,
		logger: params.logger,
	});
}

function finalizeOilDrumFireVisualUpdate(
	sprite: THREE.Sprite,
	logger?: OilDrumLogger,
): void {
	setOilDrumVisualState(sprite, 'fire');
	resetOilDrumFireAnimation(sprite);
	logger?.info?.('oil.drum.fire.visual.updated', {
		assetUrls: [...DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS],
	});
}

function resolveOilDrumSpriteMaterial(
	sprite: THREE.Sprite,
): THREE.SpriteMaterial | null {
	const spriteMaterial = sprite.material;
	if (spriteMaterial instanceof THREE.SpriteMaterial) {
		return spriteMaterial;
	}

	return null;
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
	restoreOilDrumDefaultScale(params.sprite);
	setOilDrumVisualState(params.sprite, 'destroyed');
	resetOilDrumFireAnimation(params.sprite);

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
	const nextVisualState = resolveOilDrumVisualState(nextHealth);

	params.logger?.info?.('oil.drum.damaged', {
		source: params.source,
		damageApplied,
		currentHealth,
		maxHealth: nextHealth.maxHealth,
	});

	if (nextVisualState === 'fire') {
		applyOilDrumFireSprite({
			wasOnFire: params.sprite
				? getOilDrumVisualState(params.sprite) === 'fire'
				: false,
			sprite: params.sprite,
			textureLoader: params.textureLoader,
			logger: params.logger,
		});
	}

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

export function advanceOilDrumFireAnimation(params: {
	health: OilDrumHealthState;
	sprite?: THREE.Sprite;
	deltaSeconds: number;
	frameCount?: number;
	fps?: number;
}): void {
	if (!canAdvanceOilDrumFireAnimation(params)) {
		return;
	}

	const sprite = params.sprite as THREE.Sprite;
	const spriteMaterial = sprite.material as THREE.SpriteMaterial;
	const usableFrameTextures = resolveOilDrumUsableFireFrameTextures(sprite);
	if (usableFrameTextures.length === 0) {
		return;
	}

	const requestedFrameCount = Math.max(
		1,
		Math.floor(
			params.frameCount ?? DEFAULT_OIL_DRUM_FIRE_ANIMATION_FRAME_COUNT,
		),
	);
	const frameCount = Math.min(requestedFrameCount, usableFrameTextures.length);
	const fps = Math.max(1, params.fps ?? DEFAULT_OIL_DRUM_FIRE_ANIMATION_FPS);
	const state = getOilDrumSpriteState(sprite);

	const elapsedSeconds =
		(state.oilDrumFireElapsedSeconds ?? 0) + Math.max(0, params.deltaSeconds);
	const frame = Math.floor(elapsedSeconds * fps) % frameCount;

	state.oilDrumFireElapsedSeconds = elapsedSeconds;
	state.oilDrumFireFrame = frame;

	const nextTexture = usableFrameTextures[frame];
	if (spriteMaterial.map !== nextTexture) {
		spriteMaterial.map = nextTexture;
		spriteMaterial.needsUpdate = true;
	}

	applyOilDrumFireScaleCompensation({
		sprite,
		defaultTexture: state.oilDrumDefaultTexture,
		fireTexture: nextTexture,
	});
}

function canAdvanceOilDrumFireAnimation(params: {
	health: OilDrumHealthState;
	sprite?: THREE.Sprite;
}): boolean {
	if (!params.sprite) {
		return false;
	}

	if (resolveOilDrumVisualState(params.health) !== 'fire') {
		return false;
	}

	if (getOilDrumVisualState(params.sprite) !== 'fire') {
		return false;
	}

	const spriteMaterial = params.sprite.material;
	return spriteMaterial instanceof THREE.SpriteMaterial;
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
	ensureOilDrumBaseTransform(sprite);
	config.scene.add(sprite);
	return {
		sprite,
		movementCollider,
		health,
	};
}
