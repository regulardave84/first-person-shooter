import { describe, expect, it, vi } from 'vitest';
import {
	WORLD_WALLS,
	applyFrameMovement,
	applyViewportResize,
	createInitialMovementKeys,
	getWorldLayoutSummary,
	handleMouseMoveForLook,
	setMovementKeyState,
	requestPointerLock,
} from '../../fpsRuntime';
import {
	DEFAULT_MOVE_SPEED,
	PLAYER_HEIGHT,
	getMovementDelta,
} from '../../gameLogic';

describe('Acceptance: First person shooter current behavior', () => {
	it('Player can request pointer lock by clicking the game canvas', () => {
		const element = {
			requestPointerLock: vi.fn(),
		};

		requestPointerLock(element);
		expect(element.requestPointerLock).toHaveBeenCalledTimes(1);
	});

	it('Mouse movement is ignored when pointer lock is not active', () => {
		const cameraRotation = {
			set: vi.fn<(x: number, y: number, z: number, order?: 'YXZ') => void>(),
		};
		const result = handleMouseMoveForLook({
			pointerLockElement: { id: 'other' },
			rendererElement: { id: 'renderer' },
			yaw: 1,
			pitch: 0.25,
			movementX: 200,
			movementY: 120,
			cameraRotation,
		});

		expect(result).toEqual({ yaw: 1, pitch: 0.25, updated: false });
		expect(cameraRotation.set).not.toHaveBeenCalled();
	});

	it('Mouse movement updates camera look while pointer lock is active', () => {
		const rendererElement = { id: 'renderer' };
		const cameraRotation = {
			set: vi.fn<(x: number, y: number, z: number, order?: 'YXZ') => void>(),
		};

		const result = handleMouseMoveForLook({
			pointerLockElement: rendererElement,
			rendererElement,
			yaw: 0,
			pitch: 0,
			movementX: 50,
			movementY: -25,
			cameraRotation,
		});

		expect(result.updated).toBe(true);
		expect(result.yaw).toBeCloseTo(-0.1);
		expect(result.pitch).toBeCloseTo(0.05);
		expect(cameraRotation.set).toHaveBeenCalledWith(
			result.pitch,
			result.yaw,
			0,
			'YXZ',
		);
	});

	it('Movement keys are tracked from keyboard events', () => {
		const keys = createInitialMovementKeys();
		expect(keys).toEqual({
			KeyW: false,
			KeyA: false,
			KeyS: false,
			KeyD: false,
		});

		setMovementKeyState(keys, 'KeyW', true);
		expect(keys.KeyW).toBe(true);

		setMovementKeyState(keys, 'KeyW', false);
		expect(keys.KeyW).toBe(false);
	});

	it('Animation loop applies movement delta to camera position', () => {
		const keys = createInitialMovementKeys();
		keys.KeyW = true;

		const start = { x: 3, y: 999, z: 7 };
		const yaw = Math.PI / 4;
		const dt = 0.5;
		const expectedDelta = getMovementDelta(keys, yaw, dt, DEFAULT_MOVE_SPEED);

		const result = applyFrameMovement({
			position: start,
			keys,
			yaw,
			dt,
			moveSpeed: DEFAULT_MOVE_SPEED,
		});

		expect(result.x).toBeCloseTo(start.x + expectedDelta.x);
		expect(result.z).toBeCloseTo(start.z + expectedDelta.z);
	});

	it('Player height is locked every frame', () => {
		const keys = createInitialMovementKeys();

		const result = applyFrameMovement({
			position: { x: 0, y: -1000, z: 0 },
			keys,
			yaw: 0,
			dt: 0.016,
			moveSpeed: DEFAULT_MOVE_SPEED,
			playerHeight: PLAYER_HEIGHT,
		});

		expect(result.y).toBe(PLAYER_HEIGHT);
	});

	it('Window resize updates projection and renderer size', () => {
		const camera = {
			aspect: 1,
			updateProjectionMatrix: vi.fn(),
		};

		const renderer = {
			setSize: vi.fn<(width: number, height: number) => void>(),
		};

		applyViewportResize(camera, renderer, 1920, 1080);

		expect(camera.aspect).toBeCloseTo(1920 / 1080);
		expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
		expect(renderer.setSize).toHaveBeenCalledWith(1920, 1080);
	});

	it('Scene starts with expected world geometry layout', () => {
		const summary = getWorldLayoutSummary();

		expect(summary.floorCount).toBe(1);
		expect(summary.outerWallCount).toBe(4);
		expect(summary.innerWallCount).toBe(2);
		expect(WORLD_WALLS).toHaveLength(6);
	});
});
