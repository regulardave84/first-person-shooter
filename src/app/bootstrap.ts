import * as THREE from 'three';
import '../style.css';
import { DEFAULT_MOVE_SPEED, PLAYER_HEIGHT } from '../core/gameLogic';
import {
	WORLD_WALLS,
	applyFrameMovement,
	applyViewportResize,
	createInitialMovementKeys,
	handleMouseMoveForLook,
	requestPointerLock,
	setMovementKeyState,
} from '../runtime/fpsRuntime';

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

let yaw = 0;
let pitch = 0;
const moveSpeed = DEFAULT_MOVE_SPEED;

document.addEventListener('keydown', (event) => {
	setMovementKeyState(keys, event.code, true);
});

document.addEventListener('keyup', (event) => {
	setMovementKeyState(keys, event.code, false);
});

renderer.domElement.addEventListener('click', () => {
	requestPointerLock(renderer.domElement);
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
