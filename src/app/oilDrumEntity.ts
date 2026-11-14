import * as THREE from 'three';
import type { EntityMovementCollider } from '../runtime/fpsRuntime';
import {
	DEFAULT_ENTITY_MAX_HEALTH,
	createEntityHealthState,
	type EntityHealthState,
} from './entityHealth';
import {
	configureOilDrumSpriteTexture,
	getOrLoadOilDrumFrameTextures,
	resolveOilDrumUsableFrameTextures,
	type OilDrumAnimatedFrameTexture,
} from './oilDrumAnimationTextures';

export const OIL_DRUM_ENTITY_NAME = 'oil-drum-entity';
export const DEFAULT_OIL_DRUM_SPRITE_ASSET_PATH = new URL(
	'../assets/oil_drum.png',
	import.meta.url,
).href;
export const DEFAULT_OIL_DRUM_DESTROYED_SPRITE_ASSET_PATH = new URL(
	'../assets/oil_drum_destroyed.png',
	import.meta.url,
).href;
const OIL_DRUM_FRAME_IDS = ['01', '02', '03', '04', '05', '06', '07', '08'];

function resolveOilDrumFrameAssetPaths(config: {
	folder: string;
	filePrefix: string;
}): string[] {
	return OIL_DRUM_FRAME_IDS.map(
		(frameId) =>
			new URL(
				`../assets/${config.folder}/${config.filePrefix}_${frameId}.png`,
				import.meta.url,
			).href,
	);
}

export const DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS =
	resolveOilDrumFrameAssetPaths({
		folder: 'oil_drum_burning_frames',
		filePrefix: 'oil_drum_burning',
	});

export const DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS =
	resolveOilDrumFrameAssetPaths({
		folder: 'oil_drum_explosion_frames',
		filePrefix: 'oil_drum_explosion',
	});
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
export const DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT = 8;
export const DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS = 12;
export const DEFAULT_OIL_DRUM_BURN_DAMAGE_PER_SECOND = 5;
export const DEFAULT_OIL_DRUM_VISIBLE_COVERAGE_RATIO = 0.64;
export const DEFAULT_OIL_DRUM_FIRE_VISIBLE_COVERAGE_RATIO = 0.16;
export const DEFAULT_OIL_DRUM_EXPLOSION_VISIBLE_COVERAGE_RATIO = 0.16;
export const DEFAULT_OIL_DRUM_SPRITE_ALPHA_TEST = 0.05;

export type OilDrumPosition = { x: number; y: number; z: number };
export type OilDrumLogger = {
	info?: (event: string, context?: Record<string, unknown>) => void;
	warn?: (event: string, context?: Record<string, unknown>) => void;
};

export type OilDrumHealthState = EntityHealthState;

export type OilDrumHitSource = 'bullet' | 'non-bullet';

export type OilDrumVisualState = 'default' | 'fire' | 'exploding' | 'destroyed';

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

type OilDrumSpriteState = {
	oilDrumVisualState?: OilDrumVisualState;
	oilDrumFireElapsedSeconds?: number;
	oilDrumFireFrame?: number;
	oilDrumFireFrameTextures?: OilDrumAnimatedFrameTexture[];
	oilDrumBurnElapsedSeconds?: number;
	oilDrumExplosionElapsedSeconds?: number;
	oilDrumExplosionFrame?: number;
	oilDrumExplosionFrameTextures?: OilDrumAnimatedFrameTexture[];
	oilDrumDefaultTexture?: THREE.Texture;
	oilDrumBaseScale?: { x: number; y: number; z: number };
	oilDrumBasePosition?: { x: number; y: number; z: number };
};

const oilDrumFireFrameTextureCache = new Map<
	string,
	OilDrumAnimatedFrameTexture
>();
const oilDrumExplosionFrameTextureCache = new Map<
	string,
	OilDrumAnimatedFrameTexture
>();

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
	configureOilDrumSpriteTexture(
		texture,
		DEFAULT_OIL_DRUM_VISIBLE_COVERAGE_RATIO,
	);

	const material = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		alphaTest: DEFAULT_OIL_DRUM_SPRITE_ALPHA_TEST,
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

function resetOilDrumExplosionAnimation(sprite: THREE.Sprite): void {
	const state = getOilDrumSpriteState(sprite);
	state.oilDrumExplosionElapsedSeconds = 0;
	state.oilDrumExplosionFrame = 0;
	if (!state.oilDrumExplosionFrameTextures) {
		state.oilDrumExplosionFrameTextures = [];
	}
	ensureOilDrumBaseTransform(sprite);
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
	const defaultCoverage = resolveTextureCoverageFromUserData(
		params.defaultTexture,
	);
	const fireCoverage = resolveTextureCoverageFromUserData(params.fireTexture);
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
}): OilDrumAnimatedFrameTexture[] {
	return getOrLoadOilDrumFrameTextures({
		assetUrls: DEFAULT_OIL_DRUM_ON_FIRE_FRAME_ASSET_PATHS,
		cache: oilDrumFireFrameTextureCache,
		textureLoader: params.textureLoader,
		logger: params.logger,
		failedEventName: 'oil.drum.fire.frame.asset.load.failed',
		visibleCoverageRatio: DEFAULT_OIL_DRUM_FIRE_VISIBLE_COVERAGE_RATIO,
	});
}

function getOrLoadOilDrumExplosionFrameTextures(params: {
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): OilDrumAnimatedFrameTexture[] {
	return getOrLoadOilDrumFrameTextures({
		assetUrls: DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS,
		cache: oilDrumExplosionFrameTextureCache,
		textureLoader: params.textureLoader,
		logger: params.logger,
		failedEventName: 'oil.drum.explosion.frame.asset.load.failed',
		visibleCoverageRatio: DEFAULT_OIL_DRUM_EXPLOSION_VISIBLE_COVERAGE_RATIO,
	});
}

function resolveOilDrumUsableFireFrameTextures(
	sprite: THREE.Sprite,
): THREE.Texture[] {
	return resolveOilDrumUsableFrameTextures(
		getOilDrumSpriteState(sprite).oilDrumFireFrameTextures ?? [],
	);
}

function resolveOilDrumUsableExplosionFrameTextures(
	sprite: THREE.Sprite,
): THREE.Texture[] {
	return resolveOilDrumUsableFrameTextures(
		getOilDrumSpriteState(sprite).oilDrumExplosionFrameTextures ?? [],
	);
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
	return spriteMaterial instanceof THREE.SpriteMaterial ? spriteMaterial : null;
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
	configureOilDrumSpriteTexture(
		texture,
		DEFAULT_OIL_DRUM_VISIBLE_COVERAGE_RATIO,
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

function applyOilDrumExplosionSprite(params: {
	wasDestroyed: boolean;
	sprite?: THREE.Sprite;
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): void {
	if (!params.wasDestroyed || !params.sprite) {
		return;
	}

	if (getOilDrumVisualState(params.sprite) === 'destroyed') {
		return;
	}

	const frameTextures = getOrLoadOilDrumExplosionFrameTextures({
		textureLoader: params.textureLoader,
		logger: params.logger,
	});
	const state = getOilDrumSpriteState(params.sprite);
	state.oilDrumExplosionFrameTextures = frameTextures;

	const usableExplosionTextures = resolveOilDrumUsableExplosionFrameTextures(
		params.sprite,
	);
	applyOilDrumExplosionStartTexture(
		params.sprite,
		state,
		usableExplosionTextures[0],
		params.logger,
	);

	setOilDrumVisualState(params.sprite, 'exploding');
	resetOilDrumFireAnimation(params.sprite);
	resetOilDrumExplosionAnimation(params.sprite);
	params.logger?.info?.('oil.drum.explosion.visual.updated', {
		assetUrls: [...DEFAULT_OIL_DRUM_EXPLOSION_FRAME_ASSET_PATHS],
	});
}

function applyOilDrumExplosionStartTexture(
	sprite: THREE.Sprite,
	state: OilDrumSpriteState,
	explosionTexture: THREE.Texture | undefined,
	logger?: OilDrumLogger,
): void {
	if (!explosionTexture) {
		return;
	}
	const spriteMaterial = resolveOilDrumSpriteMaterial(sprite);
	if (!spriteMaterial) {
		return;
	}
	const currentTexture = spriteMaterial.map as THREE.Texture | null | undefined;
	if (currentTexture && !state.oilDrumDefaultTexture) {
		state.oilDrumDefaultTexture = currentTexture;
	}
	spriteMaterial.map = explosionTexture;
	spriteMaterial.needsUpdate = true;
	applyOilDrumFireScaleCompensation({
		sprite,
		defaultTexture: state.oilDrumDefaultTexture,
		fireTexture: explosionTexture,
		logger,
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

	applyOilDrumExplosionSprite({
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

export function advanceOilDrumBurnDamage(params: {
	health: OilDrumHealthState;
	sprite?: THREE.Sprite;
	deltaSeconds: number;
	damagePerSecond?: number;
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): OilDrumDamageResult {
	if (!canApplyOilDrumBurnDamage(params.health, params.sprite)) {
		return createNoDamageResult(params.health);
	}

	const elapsedWholeSeconds = resolveElapsedOilDrumBurnTicks(
		params.sprite,
		params.deltaSeconds,
	);

	if (elapsedWholeSeconds <= 0) {
		return createNoDamageResult(params.health);
	}

	const damagePerSecond = resolveOilDrumBurnDamagePerSecond(
		params.damagePerSecond,
	);
	const requestedDamage = elapsedWholeSeconds * damagePerSecond;
	const currentHealth = Math.max(
		0,
		params.health.currentHealth - requestedDamage,
	);
	const nextHealth = {
		currentHealth,
		maxHealth: params.health.maxHealth,
	};
	const damageApplied = params.health.currentHealth - currentHealth;
	const wasDestroyed = nextHealth.currentHealth <= 0;

	params.logger?.info?.('oil.drum.burn.damaged', {
		damageApplied,
		currentHealth: nextHealth.currentHealth,
		maxHealth: nextHealth.maxHealth,
		elapsedWholeSeconds,
	});

	applyOilDrumExplosionSprite({
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

function canApplyOilDrumBurnDamage(
	health: OilDrumHealthState,
	sprite?: THREE.Sprite,
): boolean {
	if (health.currentHealth <= 0) {
		return false;
	}
	if (resolveOilDrumVisualState(health) === 'fire') {
		return true;
	}
	if (sprite) {
		getOilDrumSpriteState(sprite).oilDrumBurnElapsedSeconds = 0;
	}
	return false;
}

function resolveElapsedOilDrumBurnTicks(
	sprite: THREE.Sprite | undefined,
	deltaSeconds: number,
): number {
	const normalizedDelta = Math.max(0, deltaSeconds);
	const elapsedBeforeTick = sprite
		? (getOilDrumSpriteState(sprite).oilDrumBurnElapsedSeconds ?? 0)
		: 0;
	const elapsedSeconds = elapsedBeforeTick + normalizedDelta;
	const elapsedWholeSeconds = Math.floor(elapsedSeconds);
	if (sprite) {
		getOilDrumSpriteState(sprite).oilDrumBurnElapsedSeconds =
			elapsedSeconds - elapsedWholeSeconds;
	}
	return elapsedWholeSeconds;
}

function resolveOilDrumBurnDamagePerSecond(
	damagePerSecond: number | undefined,
): number {
	return Math.max(
		1,
		Math.floor(damagePerSecond ?? DEFAULT_OIL_DRUM_BURN_DAMAGE_PER_SECOND),
	);
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

export function advanceOilDrumExplosionAnimation(params: {
	health: OilDrumHealthState;
	sprite?: THREE.Sprite;
	deltaSeconds: number;
	frameCount?: number;
	fps?: number;
	textureLoader?: OilDrumTextureLoaderLike;
	logger?: OilDrumLogger;
}): void {
	if (!canAdvanceOilDrumExplosionAnimation(params)) {
		return;
	}

	const sprite = params.sprite as THREE.Sprite;
	if (getOilDrumVisualState(sprite) !== 'exploding') {
		applyOilDrumExplosionSprite({
			wasDestroyed: true,
			sprite,
			textureLoader: params.textureLoader,
			logger: params.logger,
		});
	}

	const explosionAnimationState = resolveOilDrumExplosionAnimationState(
		sprite,
		params,
	);
	if (!explosionAnimationState) {
		applyDestroyedSprite({
			wasDestroyed: true,
			sprite,
			textureLoader: params.textureLoader,
			logger: params.logger,
		});
		return;
	}

	const { spriteMaterial, usableFrameTextures, frameCount, fps } =
		explosionAnimationState;
	const state = getOilDrumSpriteState(sprite);
	const elapsedSeconds =
		(state.oilDrumExplosionElapsedSeconds ?? 0) +
		Math.max(0, params.deltaSeconds);
	const frame = Math.min(frameCount - 1, Math.floor(elapsedSeconds * fps));

	state.oilDrumExplosionElapsedSeconds = elapsedSeconds;
	state.oilDrumExplosionFrame = frame;

	const nextTexture = usableFrameTextures[frame];
	if (spriteMaterial.map !== nextTexture) {
		spriteMaterial.map = nextTexture;
		spriteMaterial.needsUpdate = true;
	}

	if (frame >= frameCount - 1) {
		applyDestroyedSprite({
			wasDestroyed: true,
			sprite,
			textureLoader: params.textureLoader,
			logger: params.logger,
		});
	}
}

function canAdvanceOilDrumExplosionAnimation(params: {
	health: OilDrumHealthState;
	sprite?: THREE.Sprite;
}): boolean {
	if (!params.sprite) {
		return false;
	}
	if (params.health.currentHealth > 0) {
		return false;
	}
	return getOilDrumVisualState(params.sprite) !== 'destroyed';
}

function resolveOilDrumExplosionAnimationState(
	sprite: THREE.Sprite,
	params: {
		frameCount?: number;
		fps?: number;
	},
): {
	spriteMaterial: THREE.SpriteMaterial;
	usableFrameTextures: THREE.Texture[];
	frameCount: number;
	fps: number;
} | null {
	const spriteMaterial = sprite.material;
	if (!(spriteMaterial instanceof THREE.SpriteMaterial)) {
		return null;
	}
	const usableFrameTextures =
		resolveOilDrumUsableExplosionFrameTextures(sprite);
	if (usableFrameTextures.length === 0) {
		return null;
	}
	const requestedFrameCount = Math.max(
		1,
		Math.floor(
			params.frameCount ?? DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FRAME_COUNT,
		),
	);
	return {
		spriteMaterial,
		usableFrameTextures,
		frameCount: Math.min(requestedFrameCount, usableFrameTextures.length),
		fps: Math.max(1, params.fps ?? DEFAULT_OIL_DRUM_EXPLOSION_ANIMATION_FPS),
	};
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
