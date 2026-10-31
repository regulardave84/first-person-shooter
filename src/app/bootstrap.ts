import * as THREE from 'three';
import '../style.css';
import { DEFAULT_MOVE_SPEED, PLAYER_HEIGHT } from '../core/gameLogic';
import {
	WORLD_WALLS,
	applyFrameMovement,
	applyViewportResize,
	createInitialJumpState,
	createRuntimeLogger,
	createInitialMovementKeys,
	handleJumpInput,
	handlePointerLockChange,
	handleMouseMoveForLook,
	requestPointerLock,
	setMovementKeyState,
} from '../runtime/fpsRuntime';

function isDebugLoggingEnabled(search: string): boolean {
	const params = new URLSearchParams(search);
	return params.get('debugLogging') === '1';
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

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
	new THREE.MeshStandardMaterial({ color: 0x334155 }),
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x64748b });

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
let jumpState = createInitialJumpState();
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

let yaw = 0;
let pitch = 0;
const moveSpeed = DEFAULT_MOVE_SPEED;

document.addEventListener('keydown', (event) => {
	if (event.code === 'Space') {
		jumpState = handleJumpInput(jumpState, event.code);
		return;
	}
	setMovementKeyState(keys, event.code, true, runtimeLogger);
});

document.addEventListener('keyup', (event) => {
	if (event.code === 'Space') {
		return;
	}
	setMovementKeyState(keys, event.code, false, runtimeLogger);
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
	const nextPosition = applyFrameMovement({
		position: camera.position,
		keys,
		yaw,
		dt,
		moveSpeed,
		playerHeight: PLAYER_HEIGHT,
		logger: runtimeLogger,
		jumpState,
		groundY: PLAYER_HEIGHT,
	});
	camera.position.x = nextPosition.x;
	camera.position.y = nextPosition.y;
	camera.position.z = nextPosition.z;

	renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
	applyViewportResize(camera, renderer, window.innerWidth, window.innerHeight);
});
