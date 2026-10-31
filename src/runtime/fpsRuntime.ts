import {
	DEFAULT_MOVE_SPEED,
	PLAYER_HEIGHT,
	getMovementDelta,
	updateLookAngles,
	type MovementKeys,
} from '../core/gameLogic';

export type MovementKeyCode = keyof MovementKeys;

const MOVEMENT_KEYS: ReadonlyArray<MovementKeyCode> = [
	'KeyW',
	'KeyA',
	'KeyS',
	'KeyD',
];

export type WallSpec = {
	x: number;
	y: number;
	z: number;
	w: number;
	h: number;
	d: number;
	kind: 'outer' | 'inner';
};

export const WORLD_WALLS: ReadonlyArray<WallSpec> = [
	{ x: 0, y: 2, z: -20, w: 40, h: 4, d: 1, kind: 'outer' },
	{ x: 0, y: 2, z: 20, w: 40, h: 4, d: 1, kind: 'outer' },
	{ x: -20, y: 2, z: 0, w: 1, h: 4, d: 40, kind: 'outer' },
	{ x: 20, y: 2, z: 0, w: 1, h: 4, d: 40, kind: 'outer' },
	{ x: 0, y: 2, z: 0, w: 12, h: 4, d: 1, kind: 'inner' },
	{ x: -8, y: 2, z: 8, w: 1, h: 4, d: 10, kind: 'inner' },
];

export function getWorldLayoutSummary(): {
	floorCount: number;
	outerWallCount: number;
	innerWallCount: number;
} {
	const outerWallCount = WORLD_WALLS.filter(
		(wall) => wall.kind === 'outer',
	).length;
	const innerWallCount = WORLD_WALLS.filter(
		(wall) => wall.kind === 'inner',
	).length;
	return {
		floorCount: 1,
		outerWallCount,
		innerWallCount,
	};
}

export function createInitialMovementKeys(): MovementKeys {
	return {
		KeyW: false,
		KeyA: false,
		KeyS: false,
		KeyD: false,
	};
}

export function isMovementKey(code: string): code is MovementKeyCode {
	return MOVEMENT_KEYS.includes(code as MovementKeyCode);
}

export function setMovementKeyState(
	keys: MovementKeys,
	code: string,
	isPressed: boolean,
): void {
	if (isMovementKey(code)) {
		keys[code] = isPressed;
	}
}

export function requestPointerLock(element: {
	requestPointerLock: () => void;
}): void {
	element.requestPointerLock();
}

export type LookState = {
	yaw: number;
	pitch: number;
};

type RotationLike = {
	set: (x: number, y: number, z: number, order?: 'YXZ') => void;
};

export function handleMouseMoveForLook(params: {
	pointerLockElement: unknown;
	rendererElement: unknown;
	yaw: number;
	pitch: number;
	movementX: number;
	movementY: number;
	cameraRotation: RotationLike;
}): LookState & { updated: boolean } {
	if (params.pointerLockElement !== params.rendererElement) {
		return { yaw: params.yaw, pitch: params.pitch, updated: false };
	}

	const updatedLook = updateLookAngles(
		params.yaw,
		params.pitch,
		params.movementX,
		params.movementY,
	);

	params.cameraRotation.set(updatedLook.pitch, updatedLook.yaw, 0, 'YXZ');
	return { ...updatedLook, updated: true };
}

export type Position3D = { x: number; y: number; z: number };

export function applyFrameMovement(params: {
	position: Position3D;
	keys: MovementKeys;
	yaw: number;
	dt: number;
	moveSpeed?: number;
	playerHeight?: number;
}): Position3D {
	const move = getMovementDelta(
		params.keys,
		params.yaw,
		params.dt,
		params.moveSpeed ?? DEFAULT_MOVE_SPEED,
	);

	return {
		x: params.position.x + move.x,
		y: params.playerHeight ?? PLAYER_HEIGHT,
		z: params.position.z + move.z,
	};
}

type CameraLike = {
	aspect: number;
	updateProjectionMatrix: () => void;
};

type RendererLike = {
	setSize: (width: number, height: number) => void;
};

export function applyViewportResize(
	camera: CameraLike,
	renderer: RendererLike,
	width: number,
	height: number,
): void {
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height);
}
