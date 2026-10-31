import { describe, expect, it, vi } from 'vitest';
import {
	applyFrameMovement,
	applyViewportResize,
	createInitialMovementKeys,
	getWorldLayoutSummary,
	handleMouseMoveForLook,
	isMovementKey,
	requestPointerLock,
	setMovementKeyState,
} from './fpsRuntime';

describe('fpsRuntime helpers', () => {
	it('validates movement key codes', () => {
		expect(isMovementKey('KeyW')).toBe(true);
		expect(isMovementKey('KeyA')).toBe(true);
		expect(isMovementKey('KeyS')).toBe(true);
		expect(isMovementKey('KeyD')).toBe(true);
		expect(isMovementKey('Space')).toBe(false);
	});

	it('creates and updates movement key state', () => {
		const keys = createInitialMovementKeys();
		expect(keys).toEqual({ KeyW: false, KeyA: false, KeyS: false, KeyD: false });

		setMovementKeyState(keys, 'KeyW', true);
		setMovementKeyState(keys, 'KeyD', true);
		expect(keys.KeyW).toBe(true);
		expect(keys.KeyD).toBe(true);

		setMovementKeyState(keys, 'Space', true);
		expect(keys).toEqual({ KeyW: true, KeyA: false, KeyS: false, KeyD: true });
	});

	it('requests pointer lock on the provided element', () => {
		const element = { requestPointerLock: vi.fn() };
		requestPointerLock(element);
		expect(element.requestPointerLock).toHaveBeenCalledTimes(1);
	});

	it('updates look only while pointer lock is active', () => {
		const rendererElement = { id: 'renderer' };
		const cameraRotation = {
			set: vi.fn<(x: number, y: number, z: number, order?: 'YXZ') => void>(),
		};

		const ignored = handleMouseMoveForLook({
			pointerLockElement: { id: 'other' },
			rendererElement,
			yaw: 1,
			pitch: 0.2,
			movementX: 100,
			movementY: 100,
			cameraRotation,
		});
		expect(ignored).toEqual({ yaw: 1, pitch: 0.2, updated: false });
		expect(cameraRotation.set).not.toHaveBeenCalled();

		const updated = handleMouseMoveForLook({
			pointerLockElement: rendererElement,
			rendererElement,
			yaw: 0,
			pitch: 0,
			movementX: 50,
			movementY: -25,
			cameraRotation,
		});
		expect(updated.updated).toBe(true);
		expect(updated.yaw).toBeCloseTo(-0.1);
		expect(updated.pitch).toBeCloseTo(0.05);
		expect(cameraRotation.set).toHaveBeenCalledWith(
			updated.pitch,
			updated.yaw,
			0,
			'YXZ',
		);
	});

	it('applies movement and locks height each frame', () => {
		const keys = createInitialMovementKeys();
		keys.KeyW = true;

		const moved = applyFrameMovement({
			position: { x: 0, y: -100, z: 0 },
			keys,
			yaw: 0,
			dt: 1,
			moveSpeed: 2,
			playerHeight: 1.6,
		});

		expect(moved.z).toBeCloseTo(-2);
		expect(moved.y).toBe(1.6);
	});

	it('uses default movement speed and player height when omitted', () => {
		const keys = createInitialMovementKeys();
		keys.KeyW = true;

		const moved = applyFrameMovement({
			position: { x: 0, y: -100, z: 0 },
			keys,
			yaw: 0,
			dt: 1,
		});

		expect(moved.z).toBeCloseTo(-5);
		expect(moved.y).toBe(1.6);
	});

	it('updates camera and renderer on viewport resize', () => {
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

	it('returns world layout summary', () => {
		expect(getWorldLayoutSummary()).toEqual({
			floorCount: 1,
			outerWallCount: 4,
			innerWallCount: 2,
		});
	});
});
