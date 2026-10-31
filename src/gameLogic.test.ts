import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MOVE_SPEED,
  MAX_PITCH,
  clampPitch,
  getMovementDelta,
  updateLookAngles,
  type MovementKeys,
} from './gameLogic';

describe('clampPitch()', () => {
  it('uses the expected MAX_PITCH constant', () => {
    expect(MAX_PITCH).toBeCloseTo(Math.PI / 2 - 0.01, 10);
  });

  it('clamps pitch to max range', () => {
    expect(clampPitch(999)).toBe(MAX_PITCH);
    expect(clampPitch(-999)).toBe(-MAX_PITCH);
  });

  it('keeps values inside range unchanged', () => {
    expect(clampPitch(0.25)).toBe(0.25);
  });
});

describe('updateLookAngles()', () => {
  it('updates yaw and pitch using mouse movement', () => {
    const result = updateLookAngles(0, 0, 50, -25, 0.002);
    expect(result.yaw).toBeCloseTo(-0.1);
    expect(result.pitch).toBeCloseTo(0.05);
  });

  it('clamps pitch after update', () => {
    const result = updateLookAngles(0, 0, 0, -100000, 0.002);
    expect(result.pitch).toBe(MAX_PITCH);
  });
});

describe('getMovementDelta()', () => {
  const speed = DEFAULT_MOVE_SPEED;
  const dt = 0.5;

  function makeKeys(partial: Partial<MovementKeys>): MovementKeys {
    return {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      ...partial,
    };
  }

  it('moves forward on -Z axis when yaw is 0', () => {
    const move = getMovementDelta(makeKeys({ KeyW: true }), 0, dt, speed);
    expect(move.x).toBeCloseTo(0);
    expect(move.z).toBeCloseTo(-speed * dt);
  });

  it('moves backward on +Z axis when yaw is 0 and pressing S', () => {
    const move = getMovementDelta(makeKeys({ KeyS: true }), 0, dt, speed);
    expect(move.x).toBeCloseTo(0);
    expect(move.z).toBeCloseTo(speed * dt);
  });

  it('returns no movement when no keys are pressed', () => {
    const move = getMovementDelta(makeKeys({}), 0, dt, speed);
    expect(move).toEqual({ x: 0, z: 0 });
  });

  it('moves left on -X axis when looking 90 degrees right and pressing W', () => {
    const move = getMovementDelta(makeKeys({ KeyW: true }), Math.PI / 2, dt, speed);
    expect(move.x).toBeCloseTo(-speed * dt);
    expect(move.z).toBeCloseTo(0);
  });

  it('normalizes diagonal movement to avoid speed boost', () => {
    const move = getMovementDelta(makeKeys({ KeyW: true, KeyD: true }), 0, dt, speed);
    const magnitude = Math.hypot(move.x, move.z);
    expect(magnitude).toBeCloseTo(speed * dt);
  });

  it('moves left with A and right with D at yaw 0', () => {
    const left = getMovementDelta(makeKeys({ KeyA: true }), 0, dt, speed);
    expect(left.x).toBeCloseTo(-speed * dt);
    expect(left.z).toBeCloseTo(0);

    const right = getMovementDelta(makeKeys({ KeyD: true }), 0, dt, speed);
    expect(right.x).toBeCloseTo(speed * dt);
    expect(right.z).toBeCloseTo(0);
  });

  it('applies correct right-vector Z sign for strafing at non-zero yaw', () => {
    const yaw = Math.PI / 4;

    const left = getMovementDelta(makeKeys({ KeyA: true }), yaw, dt, speed);
    expect(left.x).toBeLessThan(0);
    expect(left.z).toBeGreaterThan(0);

    const right = getMovementDelta(makeKeys({ KeyD: true }), yaw, dt, speed);
    expect(right.x).toBeGreaterThan(0);
    expect(right.z).toBeLessThan(0);
  });

  it('returns no movement when opposite directions cancel out', () => {
    const move = getMovementDelta(makeKeys({ KeyW: true, KeyS: true }), 0, dt, speed);
    expect(move).toEqual({ x: 0, z: 0 });
  });
});
