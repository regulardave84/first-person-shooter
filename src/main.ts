import * as THREE from 'three';
import './style.css';

// --- Scene setup ---
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

// --- Lights ---
scene.add(new THREE.HemisphereLight(0xbfd5ff, 0x3d2d1f, 0.8));

const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(8, 12, 4);
scene.add(sun);

// --- World geometry (floor + walls) ---
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x334155 }),
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x64748b });

function addWall(x: number, y: number, z: number, w: number, h: number, d: number) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial);
  wall.position.set(x, y, z);
  scene.add(wall);
}

// Outer box walls
addWall(0, 2, -20, 40, 4, 1);
addWall(0, 2, 20, 40, 4, 1);
addWall(-20, 2, 0, 1, 4, 40);
addWall(20, 2, 0, 1, 4, 40);

// A couple of inner walls
addWall(0, 2, 0, 12, 4, 1);
addWall(-8, 2, 8, 1, 4, 10);

// --- Player state + controls ---
const keys: Record<string, boolean> = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
};

let yaw = 0;
let pitch = 0;
const moveSpeed = 5; // units / second

document.addEventListener('keydown', (event) => {
  if (event.code in keys) {
    keys[event.code] = true;
  }
});

document.addEventListener('keyup', (event) => {
  if (event.code in keys) {
    keys[event.code] = false;
  }
});

// Pointer lock for FPS-style mouse look
renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement) {
    return;
  }

  const sensitivity = 0.002;
  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;

  const maxPitch = Math.PI / 2 - 0.01;
  pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

  camera.rotation.set(pitch, yaw, 0, 'YXZ');
});

// --- Animation loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  // Movement is relative to where the player is looking (yaw only)
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

  const move = new THREE.Vector3();

  if (keys.KeyW) move.add(forward);
  if (keys.KeyS) move.sub(forward);
  if (keys.KeyA) move.sub(right);
  if (keys.KeyD) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(moveSpeed * dt);
    camera.position.add(move);
  }

  camera.position.y = 1.6;

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
