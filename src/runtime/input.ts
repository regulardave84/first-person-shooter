import { updateLookAngles, type MovementKeys } from '../core/gameLogic';
import type { RuntimeLogger } from './logger';

export type MovementKeyCode = keyof MovementKeys;

const MOVEMENT_KEYS: ReadonlyArray<MovementKeyCode> = [
	'KeyW',
	'KeyA',
	'KeyS',
	'KeyD',
];

export type LookState = {
	yaw: number;
	pitch: number;
};

type RotationLike = {
	set: (x: number, y: number, z: number, order?: 'YXZ') => void;
};

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
	logger?: RuntimeLogger,
): void {
	if (isMovementKey(code)) {
		keys[code] = isPressed;
		logger?.debug('input.key.changed', { code, isPressed });
	}
}

export function requestPointerLock(
	element: {
		requestPointerLock: () => void;
	},
	logger?: RuntimeLogger,
): void {
	logger?.debug('pointerLock.requested');
	element.requestPointerLock();
}

export function handlePointerLockChange(params: {
	pointerLockElement: unknown;
	rendererElement: unknown;
	logger?: RuntimeLogger;
}): { isLocked: boolean } {
	const isLocked = params.pointerLockElement === params.rendererElement;
	params.logger?.debug(
		isLocked ? 'pointerLock.acquired' : 'pointerLock.released',
	);
	return { isLocked };
}

export function handleMouseMoveForLook(params: {
	pointerLockElement: unknown;
	rendererElement: unknown;
	yaw: number;
	pitch: number;
	movementX: number;
	movementY: number;
	cameraRotation: RotationLike;
	logger?: RuntimeLogger;
}): LookState & { updated: boolean } {
	if (params.pointerLockElement !== params.rendererElement) {
		params.logger?.debug('look.ignored.pointerLockInactive');
		return { yaw: params.yaw, pitch: params.pitch, updated: false };
	}

	const updatedLook = updateLookAngles(
		params.yaw,
		params.pitch,
		params.movementX,
		params.movementY,
	);

	params.cameraRotation.set(updatedLook.pitch, updatedLook.yaw, 0, 'YXZ');
	params.logger?.debug('look.updated', {
		movementX: params.movementX,
		movementY: params.movementY,
		yaw: updatedLook.yaw,
		pitch: updatedLook.pitch,
	});
	return { ...updatedLook, updated: true };
}
