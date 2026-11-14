import { describe, expect, it, vi } from 'vitest';
import {
	advanceFootstepCadence,
	createInitialFootstepCadenceState,
	resolvePlayerFootstepMode,
} from '../../fpsRuntime';

describe('Acceptance: Player footsteps while walking and running', () => {
	it('Running footsteps use the running asset while sprint input is active', () => {
		const walkingPlayer = { play: vi.fn(), stop: vi.fn() };
		const runningPlayer = { play: vi.fn(), stop: vi.fn() };
		const mode = resolvePlayerFootstepMode({
			isGrounded: true,
			horizontalMovementDelta: 0.02,
			runActive: true,
		});

		const cadenceState = advanceFootstepCadence({
			state: createInitialFootstepCadenceState(),
			dt: 0.016,
			mode,
			walkingPlayer,
			runningPlayer,
			runningStepIntervalSeconds: 0.25,
		});

		expect(mode).toBe('running');
		expect(cadenceState.lastMode).toBe('running');
		expect(runningPlayer.play).toHaveBeenCalledTimes(1);
		expect(walkingPlayer.play).not.toHaveBeenCalled();
	});

	it('Walking footsteps use the walking asset when sprint is not active', () => {
		const walkingPlayer = { play: vi.fn(), stop: vi.fn() };
		const runningPlayer = { play: vi.fn(), stop: vi.fn() };
		const mode = resolvePlayerFootstepMode({
			isGrounded: true,
			horizontalMovementDelta: 0.02,
			runActive: false,
		});

		const cadenceState = advanceFootstepCadence({
			state: createInitialFootstepCadenceState(),
			dt: 0.016,
			mode,
			walkingPlayer,
			runningPlayer,
			walkingStepIntervalSeconds: 0.45,
		});

		expect(mode).toBe('walking');
		expect(cadenceState.lastMode).toBe('walking');
		expect(walkingPlayer.play).toHaveBeenCalledTimes(1);
		expect(runningPlayer.play).not.toHaveBeenCalled();
	});

	it('Footsteps stop immediately when movement stops', () => {
		const walkingPlayer = { play: vi.fn(), stop: vi.fn() };
		const runningPlayer = { play: vi.fn(), stop: vi.fn() };
		let cadenceState = createInitialFootstepCadenceState();

		cadenceState = advanceFootstepCadence({
			state: cadenceState,
			dt: 0.016,
			mode: 'walking',
			walkingPlayer,
			runningPlayer,
		});
		expect(walkingPlayer.play).toHaveBeenCalledTimes(1);

		const idleMode = resolvePlayerFootstepMode({
			isGrounded: true,
			horizontalMovementDelta: 0,
			runActive: false,
		});
		cadenceState = advanceFootstepCadence({
			state: cadenceState,
			dt: 0.016,
			mode: idleMode,
			walkingPlayer,
			runningPlayer,
		});

		expect(idleMode).toBe('idle');
		expect(cadenceState).toEqual({
			secondsUntilNextStep: 0,
			lastMode: null,
		});
		expect(walkingPlayer.stop).toHaveBeenCalled();
		expect(runningPlayer.stop).toHaveBeenCalled();
	});
});
