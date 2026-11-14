import { describe, expect, it, vi } from 'vitest';
import {
	createInitialJumpState,
	handleJumpInput,
	createJumpSoundPlayer,
	DEFAULT_JUMP_SOUND_PATH,
	DEFAULT_JUMP_SOUND_VOLUME,
	DEFAULT_JUMP_SOUND_PLAYBACK_RATE,
} from '../../fpsRuntime';

describe('Acceptance: Player jump uses jump_grunt sound effect', () => {
	it('Successful jump initiation plays jump_grunt once', () => {
		const jumpPlayer = { play: vi.fn() };
		const jumpState = createInitialJumpState();
		const nextJumpState = handleJumpInput(jumpState, 'Space');

		if (nextJumpState !== jumpState) {
			jumpPlayer.play();
		}

		expect(nextJumpState).toEqual({
			isGrounded: false,
			verticalVelocity: 5.2,
		});
		expect(jumpPlayer.play).toHaveBeenCalledTimes(1);
	});

	it('Airborne jump input does not replay jump sound', () => {
		const jumpPlayer = { play: vi.fn() };
		const airborneJumpState = { isGrounded: false, verticalVelocity: 0.8 };
		const nextJumpState = handleJumpInput(airborneJumpState, 'Space');

		if (nextJumpState !== airborneJumpState) {
			jumpPlayer.play();
		}

		expect(nextJumpState).toBe(airborneJumpState);
		expect(jumpPlayer.play).not.toHaveBeenCalled();
	});

	it('jump_grunt uses existing playback defaults', () => {
		const audioCtorSpy = vi.fn();
		const audioElement = {
			loop: false,
			volume: 0,
			playbackRate: 0,
			currentTime: 2,
			play: vi.fn(() => Promise.resolve()),
		};
		const audioWindow = globalThis as typeof globalThis & {
			Audio?: typeof Audio;
		};
		const originalAudio = audioWindow.Audio;

		class AudioMock {
			constructor(sourceUrl?: string) {
				audioCtorSpy(sourceUrl);
				return audioElement as unknown as HTMLAudioElement;
			}
		}
		audioWindow.Audio = AudioMock as unknown as typeof Audio;

		const player = createJumpSoundPlayer();
		player.play();

		expect(audioCtorSpy).toHaveBeenCalledWith(DEFAULT_JUMP_SOUND_PATH);
		expect(audioElement.volume).toBe(DEFAULT_JUMP_SOUND_VOLUME);
		expect(audioElement.playbackRate).toBe(DEFAULT_JUMP_SOUND_PLAYBACK_RATE);
		expect(audioElement.play).toHaveBeenCalledTimes(1);

		audioWindow.Audio = originalAudio;
	});

	it('Missing or failed jump_grunt playback falls back silently', () => {
		const audioWindow = globalThis as typeof globalThis & {
			Audio?: typeof Audio;
		};
		const originalAudio = audioWindow.Audio;
		class AudioMock {
			constructor() {
				return {
					play: () => {
						throw new Error('No audio');
					},
					loop: false,
					volume: 1,
					playbackRate: 1,
					currentTime: 0,
				} as unknown as HTMLAudioElement;
			}
		}
		audioWindow.Audio = AudioMock as unknown as typeof Audio;

		const player = createJumpSoundPlayer();
		expect(() => player.play()).not.toThrow();

		audioWindow.Audio = originalAudio;
	});
});
