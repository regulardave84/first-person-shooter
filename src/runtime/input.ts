import { updateLookAngles, type MovementKeys } from '../core/gameLogic';
import type { RuntimeLogger } from './logger';

export type MovementKeyCode = keyof MovementKeys;
export type RunKeyCode = 'ShiftLeft' | 'ShiftRight';
export type RunKeys = Record<RunKeyCode, boolean>;

export const RUN_SPEED_MULTIPLIER = 2;

const MOVEMENT_KEYS: ReadonlyArray<MovementKeyCode> = [
	'KeyW',
	'KeyA',
	'KeyS',
	'KeyD',
];

const RUN_KEYS: ReadonlyArray<RunKeyCode> = ['ShiftLeft', 'ShiftRight'];

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

export function createInitialRunKeys(): RunKeys {
	return {
		ShiftLeft: false,
		ShiftRight: false,
	};
}

export function isMovementKey(code: string): code is MovementKeyCode {
	return MOVEMENT_KEYS.includes(code as MovementKeyCode);
}

export function isRunKey(code: string): code is RunKeyCode {
	return RUN_KEYS.includes(code as RunKeyCode);
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

export function setRunKeyState(
	keys: RunKeys,
	code: string,
	isPressed: boolean,
	logger?: RuntimeLogger,
): void {
	if (isRunKey(code)) {
		keys[code] = isPressed;
		logger?.debug('input.run.changed', { code, isPressed });
	}
}

export function isRunActive(keys: RunKeys): boolean {
	return keys.ShiftLeft || keys.ShiftRight;
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
