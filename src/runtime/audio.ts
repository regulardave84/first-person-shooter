import type { RuntimeLogger } from './logger';

type AudioContextCtor = typeof AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | undefined {
	return (
		(
			globalThis as typeof globalThis & {
				AudioContext?: AudioContextCtor;
				webkitAudioContext?: AudioContextCtor;
			}
		).AudioContext ??
		(
			globalThis as typeof globalThis & {
				AudioContext?: AudioContextCtor;
				webkitAudioContext?: AudioContextCtor;
			}
		).webkitAudioContext
	);
}

type AudioCtor = typeof Audio;

function resolveAudioCtor(): AudioCtor | undefined {
	return (globalThis as typeof globalThis & { Audio?: AudioCtor }).Audio;
}

function clampVolume(volume: number): number {
	if (!Number.isFinite(volume)) {
		return 0;
	}
	return Math.max(0, Math.min(1, volume));
}

export const DEFAULT_WALKING_FOOTSTEP_SOUND_PATH = new URL(
	'../assets/sounds/footsteps_walking.wav',
	import.meta.url,
).href;

export const DEFAULT_WALKING_FOOTSTEP_VOLUME = 0.2;

export type WalkingFootstepSoundPlayer = {
	play: () => void;
	stop: () => void;
};

export function createWalkingFootstepSoundPlayer(
	logger?: RuntimeLogger,
	config?: {
		sourceUrl?: string;
		volume?: number;
	},
): WalkingFootstepSoundPlayer {
	const AudioElementCtor = resolveAudioCtor();

	if (!AudioElementCtor) {
		logger?.debug('audio.unavailable');
		return { play: () => {}, stop: () => {} };
	}

	const sourceUrl = config?.sourceUrl ?? DEFAULT_WALKING_FOOTSTEP_SOUND_PATH;
	const volume = clampVolume(
		config?.volume ?? DEFAULT_WALKING_FOOTSTEP_VOLUME,
	);
	const audio = new AudioElementCtor(sourceUrl);
	audio.loop = true;
	audio.volume = volume;
	let isPlaying = false;

	return {
		play: () => {
			if (isPlaying) {
				return;
			}

			try {
				isPlaying = true;
				const playbackResult = audio.play();
				if (playbackResult && typeof playbackResult.catch === 'function') {
					playbackResult.catch((error: unknown) => {
						isPlaying = false;
						logger?.warn('footstep.sound.failed', {
							error:
								error instanceof Error ? error.message : 'unknown',
						});
					});
				}
				logger?.debug('footstep.sound.played', {
					sourceUrl,
					volume,
				});
			} catch (error) {
				isPlaying = false;
				logger?.warn('footstep.sound.failed', {
					error: error instanceof Error ? error.message : 'unknown',
				});
			}
		},
		stop: () => {
			if (!isPlaying) {
				return;
			}

			audio.pause();
			audio.currentTime = 0;
			isPlaying = false;
			logger?.debug('footstep.sound.stopped', { sourceUrl });
		},
	};
}

export function setWalkingFootstepSoundActive(
	player: WalkingFootstepSoundPlayer,
	isWalking: boolean,
): void {
	if (isWalking) {
		player.play();
		return;
	}

	player.stop();
}

export function createJumpSoundPlayer(logger?: RuntimeLogger): {
	play: () => void;
} {
	const AudioCtor = resolveAudioContextCtor();

	if (!AudioCtor) {
		logger?.debug('audio.unavailable');
		return { play: () => {} };
	}

	let audioContext: AudioContext | undefined;

	return {
		play: () => {
			try {
				const context = audioContext ?? new AudioCtor();
				audioContext = context;
				const startTime = context.currentTime;
				const oscillator = context.createOscillator();
				const gain = context.createGain();

				oscillator.type = 'square';
				oscillator.frequency.setValueAtTime(420, startTime);
				oscillator.frequency.exponentialRampToValueAtTime(
					180,
					startTime + 0.12,
				);

				gain.gain.setValueAtTime(0.0001, startTime);
				gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.01);
				gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15);

				oscillator.connect(gain);
				gain.connect(context.destination);
				oscillator.start(startTime);
				oscillator.stop(startTime + 0.16);

				logger?.debug('jump.sound.played', { startTime, frequency: 420 });
			} catch (error) {
				logger?.warn('jump.sound.failed', {
					error: error instanceof Error ? error.message : 'unknown',
				});
			}
		},
	};
}

export function createBulletFireSoundPlayer(logger?: RuntimeLogger): {
	play: () => void;
} {
	const AudioCtor = resolveAudioContextCtor();

	if (!AudioCtor) {
		logger?.debug('audio.unavailable');
		return { play: () => {} };
	}

	let audioContext: AudioContext | undefined;

	return {
		play: () => {
			try {
				const context = audioContext ?? new AudioCtor();
				audioContext = context;
				const startTime = context.currentTime;
				const oscillator = context.createOscillator();
				const gain = context.createGain();

				oscillator.type = 'square';
				oscillator.frequency.setValueAtTime(900, startTime);
				oscillator.frequency.exponentialRampToValueAtTime(
					680,
					startTime + 0.08,
				);

				gain.gain.setValueAtTime(0.0001, startTime);
				gain.gain.exponentialRampToValueAtTime(1, startTime + 0.005);
				gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09);

				oscillator.connect(gain);
				gain.connect(context.destination);
				oscillator.start(startTime);
				oscillator.stop(startTime + 0.1);

				logger?.debug('bullet.sound.played', { startTime, frequency: 900 });
			} catch (error) {
				logger?.warn('bullet.sound.failed', {
					error: error instanceof Error ? error.message : 'unknown',
				});
			}
		},
	};
}

export function playBulletFireSounds(
	player: { play: () => void },
	shotCount: number,
): void {
	const safeShotCount =
		Number.isFinite(shotCount) && shotCount > 0 ? Math.floor(shotCount) : 0;
	for (let i = 0; i < safeShotCount; i += 1) {
		player.play();
	}
}
