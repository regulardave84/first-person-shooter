import { describe, expect, it } from 'vitest';
import { DEFAULT_MOVE_SPEED, PLAYER_HEIGHT } from './gameLogic';
import {
	RUN_SPEED_MULTIPLIER,
	applyFrameMovement,
	createInitialJumpState,
	createInitialMovementKeys,
	createInitialRunKeys,
	handleJumpInput,
	isRunActive,
	setRunKeyState,
	type MovementKeyCode,
} from './fpsRuntime';

function applyStep(params: {
	movementKey?: MovementKeyCode;
	yaw?: number;
	position?: { x: number; y: number; z: number };
	runActive?: boolean;
	dt?: number;
}): { x: number; y: number; z: number } {
	const keys = createInitialMovementKeys();
	if (params.movementKey) {
		keys[params.movementKey] = true;
	}

	const moveSpeed =
		DEFAULT_MOVE_SPEED * (params.runActive ? RUN_SPEED_MULTIPLIER : 1);

	return applyFrameMovement({
		position: params.position ?? { x: 0, y: PLAYER_HEIGHT, z: -10 },
		keys,
		yaw: params.yaw ?? 0,
		dt: params.dt ?? 0.2,
		moveSpeed,
		playerHeight: PLAYER_HEIGHT,
		groundY: PLAYER_HEIGHT,
	});
}

function simulateJumpDistance(params: {
	movementKey: MovementKeyCode;
	takeoffRunActive: boolean;
}): { distance: number; maxHeight: number } {
	const keys = createInitialMovementKeys();
	keys[params.movementKey] = true;
	const jumpState = handleJumpInput(createInitialJumpState(), 'Space');
	const start = { x: 0, y: PLAYER_HEIGHT, z: -10 };
	let position = { ...start };
	let maxHeight = position.y;
	const runMultiplierAtTakeoff = params.takeoffRunActive
		? RUN_SPEED_MULTIPLIER
		: 1;

	for (let i = 0; i < 600; i += 1) {
		position = applyFrameMovement({
			position,
			keys,
			yaw: 0,
			dt: 1 / 120,
			moveSpeed: DEFAULT_MOVE_SPEED * runMultiplierAtTakeoff,
			playerHeight: PLAYER_HEIGHT,
			groundY: PLAYER_HEIGHT,
			jumpState,
		});
		maxHeight = Math.max(maxHeight, position.y);
		if (jumpState.isGrounded && i > 0) {
			break;
		}
	}

	return {
		distance: Math.hypot(position.x - start.x, position.z - start.z),
		maxHeight,
	};
}

describe('Acceptance: Player running with Shift hold', () => {
	it('Holding Shift while moving doubles player movement speed', () => {
		const walkForward = applyStep({ movementKey: 'KeyW', runActive: false });
		const runForward = applyStep({ movementKey: 'KeyW', runActive: true });
		const walkBackward = applyStep({ movementKey: 'KeyS', runActive: false });
		const runBackward = applyStep({ movementKey: 'KeyS', runActive: true });
		const walkStrafe = applyStep({ movementKey: 'KeyD', runActive: false });
		const runStrafe = applyStep({ movementKey: 'KeyD', runActive: true });

		expect(Math.abs(runForward.z + 10)).toBeCloseTo(
			2 * Math.abs(walkForward.z + 10),
		);
		expect(Math.abs(runBackward.z + 10)).toBeCloseTo(
			2 * Math.abs(walkBackward.z + 10),
		);
		expect(Math.abs(runStrafe.x)).toBeCloseTo(2 * Math.abs(walkStrafe.x));
	});

	it('Releasing Shift while moving restores normal movement speed', () => {
		const runKeys = createInitialRunKeys();
		setRunKeyState(runKeys, 'ShiftLeft', true);
		expect(isRunActive(runKeys)).toBe(true);

		const runStep = applyStep({
			movementKey: 'KeyW',
			runActive: isRunActive(runKeys),
		});

		setRunKeyState(runKeys, 'ShiftLeft', false);
		expect(isRunActive(runKeys)).toBe(false);

		const walkStep = applyStep({
			movementKey: 'KeyW',
			runActive: isRunActive(runKeys),
		});
		expect(Math.abs(runStep.z + 10)).toBeGreaterThan(Math.abs(walkStep.z + 10));
	});

	it('Holding Shift without movement input does not move the player', () => {
		const runKeys = createInitialRunKeys();
		setRunKeyState(runKeys, 'ShiftLeft', true);
		expect(isRunActive(runKeys)).toBe(true);

		const result = applyStep({ runActive: isRunActive(runKeys) });
		expect(result).toEqual({ x: 0, y: PLAYER_HEIGHT, z: -10 });
	});

	it('Either Shift key can enable run speed while held', () => {
		const runKeys = createInitialRunKeys();

		setRunKeyState(runKeys, 'ShiftLeft', true);
		expect(isRunActive(runKeys)).toBe(true);

		setRunKeyState(runKeys, 'ShiftLeft', false);
		setRunKeyState(runKeys, 'ShiftRight', true);
		expect(isRunActive(runKeys)).toBe(true);
	});

	it('Jumping while running carries at least 10% farther with the same jump height', () => {
		const walkJump = simulateJumpDistance({
			movementKey: 'KeyW',
			takeoffRunActive: false,
		});
		const runJump = simulateJumpDistance({
			movementKey: 'KeyW',
			takeoffRunActive: true,
		});

		expect(runJump.distance).toBeGreaterThanOrEqual(walkJump.distance * 1.1);
		expect(runJump.maxHeight).toBeCloseTo(walkJump.maxHeight, 5);
	});
});
