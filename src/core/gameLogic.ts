export const LOOK_SENSITIVITY = 0.002;
export const MAX_PITCH = Math.PI / 2 - 0.01;
export const PLAYER_HEIGHT = 1.6;
export const DEFAULT_MOVE_SPEED = 5;
export const GRAVITY = 14;
export const JUMP_VELOCITY = 5.2;

export type MovementKeys = {
	KeyW: boolean;
	KeyA: boolean;
	KeyS: boolean;
	KeyD: boolean;
};

export type JumpState = {
	isGrounded: boolean;
	verticalVelocity: number;
};

export function createJumpState(): JumpState {
	return {
		isGrounded: true,
		verticalVelocity: 0,
	};
}

export function triggerJump(state: JumpState): JumpState {
	if (!state.isGrounded) {
		return state;
	}

	return {
		isGrounded: false,
		verticalVelocity: JUMP_VELOCITY,
	};
}

export function clampPitch(pitch: number, maxPitch = MAX_PITCH): number {
	return Math.max(-maxPitch, Math.min(maxPitch, pitch));
}

export function updateLookAngles(
	yaw: number,
	pitch: number,
	movementX: number,
	movementY: number,
	sensitivity = LOOK_SENSITIVITY,
): { yaw: number; pitch: number } {
	const nextYaw = yaw - movementX * sensitivity;
	const nextPitch = clampPitch(pitch - movementY * sensitivity);
	return { yaw: nextYaw, pitch: nextPitch };
}

export function getMovementDelta(
	keys: MovementKeys,
	yaw: number,
	dt: number,
	moveSpeed = DEFAULT_MOVE_SPEED,
): { x: number; z: number } {
	const forwardX = -Math.sin(yaw);
	const forwardZ = -Math.cos(yaw);

	const rightX = Math.cos(yaw);
	const rightZ = -Math.sin(yaw);

	let x = 0;
	let z = 0;

	if (keys.KeyW) {
		x += forwardX;
		z += forwardZ;
	}
	if (keys.KeyS) {
		x -= forwardX;
		z -= forwardZ;
	}
	if (keys.KeyA) {
		x -= rightX;
		z -= rightZ;
	}
	if (keys.KeyD) {
		x += rightX;
		z += rightZ;
	}

	const length = Math.hypot(x, z);
	if (length === 0) {
		return { x: 0, z: 0 };
	}

	const scale = (moveSpeed * dt) / length;
	return { x: x * scale, z: z * scale };
}
