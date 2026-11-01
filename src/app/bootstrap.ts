import * as THREE from 'three';
import '../style.css';
import {
	DEFAULT_WORLD_CEILING_COLOR,
	applyDefaultWorldCeilingSkybox,
} from './ceilingSkybox';
import {
	DEFAULT_WORLD_WALL_COLOR,
	applyDefaultWorldWallTexture,
} from './wallTexture';
import {
	DEFAULT_WORLD_FLOOR_COLOR,
	applyDefaultWorldFloorTexture,
} from './floorTexture';
import { DEFAULT_MOVE_SPEED, PLAYER_HEIGHT } from '../core/gameLogic';
import {
	PROJECTILE_COLOR,
	RUN_SPEED_MULTIPLIER,
	WORLD_WALLS,
	WORLD_PROJECTILE_COLLIDERS,
	advancePrimaryFireState,
	applyFrameMovement,
	applyViewportResize,
	createInitialPrimaryFireState,
	createInitialJumpState,
	createBulletFireSoundPlayer,
	createJumpSoundPlayer,
	createInitialRunKeys,
	createRuntimeLogger,
	createInitialMovementKeys,
	handleJumpInput,
	handlePointerLockChange,
	handleMouseMoveForLook,
	isRunActive,
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

const wallMaterial = new THREE.MeshStandardMaterial({
	color: DEFAULT_WORLD_WALL_COLOR,
});

function addWall(
	x: number,
	y: number,
	z: number,
	w: number,
	h: number,
	d: number,
) {
	const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial);
	wall.position.set(x, y, z);
	scene.add(wall);
}

for (const wall of WORLD_WALLS) {
	addWall(wall.x, wall.y, wall.z, wall.w, wall.h, wall.d);
}

const keys = createInitialMovementKeys();
const runKeys = createInitialRunKeys();
let jumpState = createInitialJumpState();
let primaryFireState = createInitialPrimaryFireState();
let activeProjectiles: Projectile[] = [];
const jumpSound = createJumpSoundPlayer();
const bulletFireSound = createBulletFireSoundPlayer();
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

applyDefaultWorldWallTexture(wallMaterial, {
	logger: {
		warn: (event, context) => runtimeLogger.warn(event, context),
	},
});

let yaw = 0;
let pitch = 0;
let airborneRunSpeedMultiplier = 1;
const projectileVisuals = new Map<number, THREE.Line>();
const projectileMaterial = new THREE.LineBasicMaterial({
	color: PROJECTILE_COLOR,
});

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

function animate() {
	requestAnimationFrame(animate);

	const dt = clock.getDelta();
	const moveSpeedMultiplier = jumpState.isGrounded
		? isRunActive(runKeys)
			? RUN_SPEED_MULTIPLIER
			: 1
		: airborneRunSpeedMultiplier;
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

	if (fireAdvance.shotsToSpawn > 0) {
		playBulletFireSounds(bulletFireSound, fireAdvance.shotsToSpawn);
		const spawned = spawnProjectilesFromLook({
			state: primaryFireState,
			count: fireAdvance.shotsToSpawn,
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

	const projectileStep = stepProjectiles({
		projectiles: activeProjectiles,
		dt,
		worldColliders: WORLD_PROJECTILE_COLLIDERS,
		entityColliders: [],
	});
	activeProjectiles = projectileStep.activeProjectiles;

	for (const impact of projectileStep.impacts) {
		removeProjectileVisual(impact.projectileId);
	}

	for (const projectile of activeProjectiles) {
		upsertProjectileVisual(projectile);
	}

	renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
	applyViewportResize(camera, renderer, window.innerWidth, window.innerHeight);
});
