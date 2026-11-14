import * as THREE from 'three';
import '../style.css';
import {
	DEFAULT_WORLD_CEILING_COLOR,
	applyDefaultWorldCeilingSkybox,
} from './ceilingSkybox';
import {
	DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
	DEFAULT_WORLD_WALL_COLOR,
	applyDefaultWorldWallTexture,
	calculateWallTextureRepeatX,
	createWallGeometryForKind,
} from './wallTexture';
import {
	DEFAULT_WORLD_FLOOR_COLOR,
	applyDefaultWorldFloorTexture,
} from './floorTexture';
import {
	DEFAULT_OIL_DRUM_BURN_DAMAGE_PER_SECOND,
	DEFAULT_OIL_DRUM_BULLET_DAMAGE,
	advanceOilDrumBurnDamage,
	advanceOilDrumExplosionAnimation,
	advanceOilDrumFireAnimation,
	addDefaultOilDrumEntityToScene,
	applyOilDrumHit,
} from './oilDrumEntity';
import { initializeHealthHud } from './healthHud';
import { initializeWeaponHud, triggerWeaponHudRecoil } from './weaponHud';
import { DEFAULT_MOVE_SPEED, PLAYER_HEIGHT } from '../core/gameLogic';
import {
	PROJECTILE_COLOR,
	RUN_SPEED_MULTIPLIER,
	WORLD_WALLS,
	WORLD_PROJECTILE_COLLIDERS,
	advancePrimaryFireState,
	applyFrameMovement,
	applyViewportResize,
	createEntityCollider,
	createInitialPrimaryFireState,
	createInitialJumpState,
	createBulletFireSoundPlayer,
	createJumpSoundPlayer,
	createWalkingFootstepSoundPlayer,
	createRunningFootstepSoundPlayer,
	createOilDrumFireSoundPlayer,
	createOilDrumExplosionSoundPlayer,
	createInitialFootstepCadenceState,
	createInitialRunKeys,
	createRuntimeLogger,
	createInitialMovementKeys,
	handleJumpInput,
	handlePointerLockChange,
	handleMouseMoveForLook,
	isRunActive,
	resolvePlayerFootstepMode,
	advanceFootstepCadence,
	requestPointerLock,
	setRunKeyState,
	setMovementKeyState,
	playBulletFireSounds,
	setPrimaryFirePressedState,
	spawnProjectilesFromLook,
	stepProjectiles,
	type Position3D,
	type Projectile,
} from '../runtime/fpsRuntime';

function isDebugLoggingEnabled(search: string): boolean {
	const params = new URLSearchParams(search);
	return params.get('debugLogging') === '1';
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(DEFAULT_WORLD_CEILING_COLOR);

const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000,
);
camera.position.set(0, 1.6, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xbfd5ff, 0x3d2d1f, 0.8));

const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(8, 12, 4);
scene.add(sun);

const floor = new THREE.Mesh(
	new THREE.PlaneGeometry(60, 60),
	new THREE.MeshStandardMaterial({ color: DEFAULT_WORLD_FLOOR_COLOR }),
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

function addWall(
	x: number,
	y: number,
	z: number,
	w: number,
	h: number,
	d: number,
	kind: 'outer' | 'inner',
	material: THREE.MeshStandardMaterial,
) {
	const wall = new THREE.Mesh(
		createWallGeometryForKind(w, h, d, kind),
		material,
	);
	wall.position.set(x, y, z);
	scene.add(wall);
}

const runtimeLogger = createRuntimeLogger({
	enabled: isDebugLoggingEnabled(window.location.search),
	sink: (entry) => {
		if (entry.level === 'error') {
			console.error(`[runtime] ${entry.event}`, entry.context);
			return;
		}
		console.debug(`[runtime] ${entry.event}`, entry.context);
	},
});

const keys = createInitialMovementKeys();
const runKeys = createInitialRunKeys();
let jumpState = createInitialJumpState();
let primaryFireState = createInitialPrimaryFireState();
let activeProjectiles: Projectile[] = [];
const jumpSound = createJumpSoundPlayer();
const bulletFireSound = createBulletFireSoundPlayer();
const walkingFootstepSound = createWalkingFootstepSoundPlayer();
const runningFootstepSound = createRunningFootstepSoundPlayer();
const oilDrumFireSound = createOilDrumFireSoundPlayer();
const oilDrumExplosionSound = createOilDrumExplosionSoundPlayer();
let footstepCadenceState = createInitialFootstepCadenceState();
let hasOilDrumFireSoundPlayed = false;
let hasOilDrumExplosionSoundPlayed = false;

applyDefaultWorldCeilingSkybox(scene, {
	logger: {
		warn: (event, context) => runtimeLogger.warn(event, context),
	},
});

applyDefaultWorldFloorTexture(floor.material as THREE.MeshStandardMaterial, {
	logger: {
		warn: (event, context) => runtimeLogger.warn(event, context),
	},
});

for (const wall of WORLD_WALLS) {
	const wallMaterial = new THREE.MeshStandardMaterial({
		color: DEFAULT_WORLD_WALL_COLOR,
	});
	const primaryWallSpan = Math.max(wall.w, wall.d);
	const repeatX = calculateWallTextureRepeatX(primaryWallSpan);
	applyDefaultWorldWallTexture(wallMaterial, {
		repeatX,
		repeatY: DEFAULT_WORLD_WALL_TEXTURE_REPEAT_Y,
		logger: {
			warn: (event, context) => runtimeLogger.warn(event, context),
		},
	});

	addWall(
		wall.x,
		wall.y,
		wall.z,
		wall.w,
		wall.h,
		wall.d,
		wall.kind,
		wallMaterial,
	);
}

const oilDrumEntity = addDefaultOilDrumEntityToScene({
	scene,
	playerStartPosition: {
		x: camera.position.x,
		y: camera.position.y,
		z: camera.position.z,
	},
	logger: {
		warn: (event, context) => runtimeLogger.warn(event, context),
	},
});
const oilDrumBulletDamage = DEFAULT_OIL_DRUM_BULLET_DAMAGE;
const oilDrumBurnDamagePerSecond = DEFAULT_OIL_DRUM_BURN_DAMAGE_PER_SECOND;
let oilDrumHealth = oilDrumEntity.health;
let isOilDrumActive = true;

const weaponHud = initializeWeaponHud({
	logger: {
		warn: (event, context) => runtimeLogger.warn(event, context),
	},
});
initializeHealthHud();

let yaw = 0;
let pitch = 0;
let airborneRunSpeedMultiplier = 1;
const projectileVisuals = new Map<number, THREE.Line>();
const projectileMaterial = new THREE.LineBasicMaterial({
	color: PROJECTILE_COLOR,
});

function processPrimaryFireShots(shotCount: number): void {
	if (shotCount <= 0) {
		return;
	}

	triggerWeaponHudRecoil(weaponHud?.root ?? null);
	playBulletFireSounds(bulletFireSound, shotCount);
	const spawned = spawnProjectilesFromLook({
		state: primaryFireState,
		count: shotCount,
		origin: {
			x: camera.position.x,
			y: camera.position.y,
			z: camera.position.z,
		},
		yaw,
		pitch,
	});
	primaryFireState = spawned.state;
	activeProjectiles = [...activeProjectiles, ...spawned.projectiles];
}

function isPointerLockActive(): boolean {
	return document.pointerLockElement === renderer.domElement;
}

function toProjectileSegmentEndpoints(projectile: Projectile): {
	tail: Position3D;
	head: Position3D;
} {
	return {
		head: projectile.head,
		tail: {
			x: projectile.head.x - projectile.direction.x * projectile.length,
			y: projectile.head.y - projectile.direction.y * projectile.length,
			z: projectile.head.z - projectile.direction.z * projectile.length,
		},
	};
}

function upsertProjectileVisual(projectile: Projectile): void {
	const segment = toProjectileSegmentEndpoints(projectile);
	const points = [
		new THREE.Vector3(segment.tail.x, segment.tail.y, segment.tail.z),
		new THREE.Vector3(segment.head.x, segment.head.y, segment.head.z),
	];

	const existing = projectileVisuals.get(projectile.id);
	if (existing) {
		(existing.geometry as THREE.BufferGeometry).setFromPoints(points);
		return;
	}

	const geometry = new THREE.BufferGeometry().setFromPoints(points);
	const line = new THREE.Line(geometry, projectileMaterial);
	projectileVisuals.set(projectile.id, line);
	scene.add(line);
}

function removeProjectileVisual(projectileId: number): void {
	const visual = projectileVisuals.get(projectileId);
	if (!visual) {
		return;
	}
	projectileVisuals.delete(projectileId);
	scene.remove(visual);
	(visual.geometry as THREE.BufferGeometry).dispose();
}

function toOilDrumProjectileCollider() {
	const collider = oilDrumEntity.movementCollider;
	return createEntityCollider({
		x: collider.x,
		y: (collider.minY + collider.maxY) / 2,
		z: collider.z,
		w: collider.radius * 2,
		h: collider.maxY - collider.minY,
		d: collider.radius * 2,
	});
}

function handleProjectileImpacts(
	impacts: ReadonlyArray<{ projectileId: number; colliderKind: string }>,
): void {
	for (const impact of impacts) {
		removeProjectileVisual(impact.projectileId);

		if (!isOilDrumActive || impact.colliderKind !== 'entity') {
			continue;
		}

		const hit = applyOilDrumHit({
			health: oilDrumHealth,
			source: 'bullet',
			bulletDamage: oilDrumBulletDamage,
			sprite: oilDrumEntity.sprite,
			logger: {
				info: (event, context) => runtimeLogger.info(event, context),
			},
		});

		oilDrumHealth = hit.health;
		if (hit.health.currentHealth <= 0) {
			isOilDrumActive = false;
		}
		syncOilDrumAudioState();
	}
}

document.addEventListener('keydown', (event) => {
	if (event.code === 'Space') {
		const nextJumpState = handleJumpInput(jumpState, event.code);
		if (nextJumpState !== jumpState) {
			airborneRunSpeedMultiplier = isRunActive(runKeys)
				? RUN_SPEED_MULTIPLIER
				: 1;
			jumpSound.play();
			jumpState = nextJumpState;
		}
		return;
	}
	setMovementKeyState(keys, event.code, true, runtimeLogger);
	setRunKeyState(runKeys, event.code, true, runtimeLogger);
});

document.addEventListener('keyup', (event) => {
	if (event.code === 'Space') {
		return;
	}
	setMovementKeyState(keys, event.code, false, runtimeLogger);
	setRunKeyState(runKeys, event.code, false, runtimeLogger);
});

renderer.domElement.addEventListener('click', () => {
	requestPointerLock(renderer.domElement, runtimeLogger);
});

document.addEventListener('pointerlockchange', () => {
	handlePointerLockChange({
		pointerLockElement: document.pointerLockElement,
		rendererElement: renderer.domElement,
		logger: runtimeLogger,
	});

	if (!isPointerLockActive()) {
		primaryFireState = setPrimaryFirePressedState(
			primaryFireState,
			false,
			false,
		);
	}
});

document.addEventListener('mousedown', (event) => {
	if (event.button !== 0) {
		return;
	}
	primaryFireState = setPrimaryFirePressedState(
		primaryFireState,
		true,
		isPointerLockActive(),
	);
});

document.addEventListener('mouseup', (event) => {
	if (event.button !== 0) {
		return;
	}
	primaryFireState = setPrimaryFirePressedState(
		primaryFireState,
		false,
		isPointerLockActive(),
	);
});

document.addEventListener('mousemove', (event) => {
	const updatedLook = handleMouseMoveForLook({
		pointerLockElement: document.pointerLockElement,
		rendererElement: renderer.domElement,
		yaw,
		pitch,
		movementX: event.movementX,
		movementY: event.movementY,
		cameraRotation: camera.rotation,
		logger: runtimeLogger,
	});

	if (!updatedLook.updated) {
		return;
	}

	yaw = updatedLook.yaw;
	pitch = updatedLook.pitch;
});

const clock = new THREE.Clock();

function syncOilDrumAudioState(): void {
	const fireThresholdHealth = oilDrumHealth.maxHealth * 0.5;
	const isOilDrumOnFire =
		oilDrumHealth.currentHealth > 0 &&
		oilDrumHealth.currentHealth < fireThresholdHealth;
	const isOilDrumExploding = oilDrumHealth.currentHealth <= 0;

	if (isOilDrumOnFire && !hasOilDrumFireSoundPlayed) {
		oilDrumFireSound.play();
		hasOilDrumFireSoundPlayed = true;
	}
	if (!isOilDrumOnFire) {
		hasOilDrumFireSoundPlayed = false;
	}

	if (isOilDrumExploding && !hasOilDrumExplosionSoundPlayed) {
		oilDrumFireSound.stop();
		oilDrumExplosionSound.play();
		hasOilDrumExplosionSoundPlayed = true;
	}
	if (!isOilDrumExploding) {
		hasOilDrumExplosionSoundPlayed = false;
	}
}

function resolveMoveSpeedMultiplier(): number {
	if (!jumpState.isGrounded) {
		return airborneRunSpeedMultiplier;
	}

	return isRunActive(runKeys) ? RUN_SPEED_MULTIPLIER : 1;
}

function animate() {
	requestAnimationFrame(animate);

	const dt = clock.getDelta();
	const moveSpeedMultiplier = resolveMoveSpeedMultiplier();
	const nextPosition = applyFrameMovement({
		position: camera.position,
		keys,
		yaw,
		dt,
		moveSpeed: DEFAULT_MOVE_SPEED * moveSpeedMultiplier,
		playerHeight: PLAYER_HEIGHT,
		logger: runtimeLogger,
		jumpState,
		groundY: PLAYER_HEIGHT,
		entityColliders: [oilDrumEntity.movementCollider],
	});
	const horizontalMovementDelta = Math.hypot(
		nextPosition.x - camera.position.x,
		nextPosition.z - camera.position.z,
	);
	const footstepMode = resolvePlayerFootstepMode({
		isGrounded: jumpState.isGrounded,
		horizontalMovementDelta,
		runActive: isRunActive(runKeys),
	});
	footstepCadenceState = advanceFootstepCadence({
		state: footstepCadenceState,
		dt,
		mode: footstepMode,
		walkingPlayer: walkingFootstepSound,
		runningPlayer: runningFootstepSound,
	});
	if (jumpState.isGrounded) {
		airborneRunSpeedMultiplier = 1;
	}
	camera.position.x = nextPosition.x;
	camera.position.y = nextPosition.y;
	camera.position.z = nextPosition.z;

	const fireAdvance = advancePrimaryFireState({
		state: primaryFireState,
		dt,
		isPointerLockActive: isPointerLockActive(),
	});
	primaryFireState = fireAdvance.state;
	processPrimaryFireShots(fireAdvance.shotsToSpawn);

	const burnDamageResult = advanceOilDrumBurnDamage({
		health: oilDrumHealth,
		sprite: oilDrumEntity.sprite,
		deltaSeconds: dt,
		damagePerSecond: oilDrumBurnDamagePerSecond,
		logger: {
			info: (event, context) => runtimeLogger.info(event, context),
			warn: (event, context) => runtimeLogger.warn(event, context),
		},
	});
	oilDrumHealth = burnDamageResult.health;
	if (oilDrumHealth.currentHealth <= 0) {
		isOilDrumActive = false;
	}
	syncOilDrumAudioState();

	const projectileStep = stepProjectiles({
		projectiles: activeProjectiles,
		dt,
		worldColliders: WORLD_PROJECTILE_COLLIDERS,
		entityColliders: isOilDrumActive ? [toOilDrumProjectileCollider()] : [],
	});
	activeProjectiles = projectileStep.activeProjectiles;
	handleProjectileImpacts(projectileStep.impacts);
	advanceOilDrumFireAnimation({
		health: oilDrumHealth,
		sprite: oilDrumEntity.sprite,
		deltaSeconds: dt,
	});
	advanceOilDrumExplosionAnimation({
		health: oilDrumHealth,
		sprite: oilDrumEntity.sprite,
		deltaSeconds: dt,
		logger: {
			info: (event, context) => runtimeLogger.info(event, context),
			warn: (event, context) => runtimeLogger.warn(event, context),
		},
	});

	for (const projectile of activeProjectiles) {
		upsertProjectileVisual(projectile);
	}

	renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
	applyViewportResize(camera, renderer, window.innerWidth, window.innerHeight);
});
