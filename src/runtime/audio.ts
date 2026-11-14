import type { RuntimeLogger } from './logger';

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

export const DEFAULT_RUNNING_FOOTSTEP_SOUND_PATH = new URL(
	'../assets/sounds/footsteps_running.wav',
	import.meta.url,
).href;

export const DEFAULT_BULLET_FIRE_SOUND_PATH = new URL(
	'../assets/sounds/pistol_shot.wav',
	import.meta.url,
).href;

export const DEFAULT_JUMP_SOUND_PATH = new URL(
	'../assets/sounds/jump_grunt.wav',
	import.meta.url,
).href;

export const DEFAULT_WALKING_FOOTSTEP_VOLUME = 0.2;
export const DEFAULT_RUNNING_FOOTSTEP_VOLUME = 0.2;
export const DEFAULT_BULLET_FIRE_VOLUME = 0.4;
export const DEFAULT_JUMP_SOUND_VOLUME = 1;
export const DEFAULT_JUMP_SOUND_PLAYBACK_RATE = 1;

export const DEFAULT_WALKING_FOOTSTEP_INTERVAL_SECONDS = 0.45;
export const DEFAULT_RUNNING_FOOTSTEP_INTERVAL_SECONDS = 0.3;

export const DEFAULT_FOOTSTEP_MOVEMENT_EPSILON = 0.0001;

export type WalkingFootstepSoundPlayer = {
	play: () => void;
	stop: () => void;
};

export type RunningFootstepSoundPlayer = WalkingFootstepSoundPlayer;

export type PlayerFootstepMode = 'idle' | 'walking' | 'running';

export type FootstepCadenceState = {
	secondsUntilNextStep: number;
	lastMode: Exclude<PlayerFootstepMode, 'idle'> | null;
};

function createFootstepSoundPlayer(logger: RuntimeLogger | undefined, config: {
	sourceUrl: string;
	volume: number;
}): WalkingFootstepSoundPlayer {
	const AudioElementCtor = resolveAudioCtor();

	if (!AudioElementCtor) {
		logger?.debug('audio.unavailable');
		return { play: () => {}, stop: () => {} };
	}

	const volume = clampVolume(config.volume);
	const audio = new AudioElementCtor(config.sourceUrl);
	audio.loop = false;
	audio.volume = volume;

	return {
		play: () => {
			try {
				audio.currentTime = 0;
				const playbackResult = audio.play();
				if (playbackResult && typeof playbackResult.catch === 'function') {
					playbackResult.catch((error: unknown) => {
						logger?.warn('footstep.sound.failed', {
							error:
								error instanceof Error ? error.message : 'unknown',
						});
					});
				}
				logger?.debug('footstep.sound.played', {
					sourceUrl: config.sourceUrl,
					volume,
				});
			} catch (error) {
				logger?.warn('footstep.sound.failed', {
					error: error instanceof Error ? error.message : 'unknown',
				});
			}
		},
		stop: () => {
			audio.pause();
			audio.currentTime = 0;
			logger?.debug('footstep.sound.stopped', { sourceUrl: config.sourceUrl });
		},
	};
}

export function createWalkingFootstepSoundPlayer(
	logger?: RuntimeLogger,
	config?: {
		sourceUrl?: string;
		volume?: number;
	},
): WalkingFootstepSoundPlayer {
	const sourceUrl = config?.sourceUrl ?? DEFAULT_WALKING_FOOTSTEP_SOUND_PATH;
	const volume = config?.volume ?? DEFAULT_WALKING_FOOTSTEP_VOLUME;
	return createFootstepSoundPlayer(logger, { sourceUrl, volume });
}

export function createRunningFootstepSoundPlayer(
	logger?: RuntimeLogger,
	config?: {
		sourceUrl?: string;
		volume?: number;
	},
): RunningFootstepSoundPlayer {
	const sourceUrl = config?.sourceUrl ?? DEFAULT_RUNNING_FOOTSTEP_SOUND_PATH;
	const volume = config?.volume ?? DEFAULT_RUNNING_FOOTSTEP_VOLUME;
	return createFootstepSoundPlayer(logger, { sourceUrl, volume });
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

export function createInitialFootstepCadenceState(): FootstepCadenceState {
	return {
		secondsUntilNextStep: 0,
		lastMode: null,
	};
}

export function resolvePlayerFootstepMode(params: {
	isGrounded: boolean;
	horizontalMovementDelta: number;
	runActive: boolean;
	movementEpsilon?: number;
}): PlayerFootstepMode {
	const movementEpsilon =
		params.movementEpsilon ?? DEFAULT_FOOTSTEP_MOVEMENT_EPSILON;
	if (!params.isGrounded || params.horizontalMovementDelta <= movementEpsilon) {
		return 'idle';
	}

	return params.runActive ? 'running' : 'walking';
}

export function advanceFootstepCadence(params: {
	state: FootstepCadenceState;
	dt: number;
	mode: PlayerFootstepMode;
	walkingPlayer: WalkingFootstepSoundPlayer;
	runningPlayer: RunningFootstepSoundPlayer;
	walkingStepIntervalSeconds?: number;
	runningStepIntervalSeconds?: number;
}): FootstepCadenceState {
	if (params.mode === 'idle') {
		params.walkingPlayer.stop();
		params.runningPlayer.stop();
		return createInitialFootstepCadenceState();
	}

	const stepIntervalSeconds =
		params.mode === 'running'
			? (params.runningStepIntervalSeconds ??
				DEFAULT_RUNNING_FOOTSTEP_INTERVAL_SECONDS)
			: (params.walkingStepIntervalSeconds ??
				DEFAULT_WALKING_FOOTSTEP_INTERVAL_SECONDS);

	const modeChanged = params.state.lastMode !== params.mode;
	const nextSecondsUntilStep = modeChanged
		? 0
		: params.state.secondsUntilNextStep - params.dt;

	if (nextSecondsUntilStep > 0) {
		return {
			secondsUntilNextStep: nextSecondsUntilStep,
			lastMode: params.mode,
		};
	}

	if (params.mode === 'running') {
		params.walkingPlayer.stop();
		params.runningPlayer.play();
	} else {
		params.runningPlayer.stop();
		params.walkingPlayer.play();
	}

	return {
		secondsUntilNextStep: stepIntervalSeconds,
		lastMode: params.mode,
	};
}

export function createJumpSoundPlayer(logger?: RuntimeLogger): {
	play: () => void;
} {
	const AudioElementCtor = resolveAudioCtor();

	if (!AudioElementCtor) {
		logger?.debug('audio.unavailable');
		return { play: () => {} };
	}

	const sourceUrl = DEFAULT_JUMP_SOUND_PATH;
	const volume = clampVolume(DEFAULT_JUMP_SOUND_VOLUME);
	const playbackRate = DEFAULT_JUMP_SOUND_PLAYBACK_RATE;
	const audio = new AudioElementCtor(sourceUrl);
	audio.loop = false;
	audio.volume = volume;
	audio.playbackRate = playbackRate;

	return {
		play: () => {
			try {
				audio.currentTime = 0;
				audio.playbackRate = playbackRate;
				const playbackResult = audio.play();
				if (playbackResult && typeof playbackResult.catch === 'function') {
					playbackResult.catch((error: unknown) => {
						logger?.warn('jump.sound.failed', {
							error:
								error instanceof Error ? error.message : 'unknown',
						});
					});
				}

				logger?.debug('jump.sound.played', {
					sourceUrl,
					volume,
					playbackRate,
				});
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
	const AudioElementCtor = resolveAudioCtor();

	if (!AudioElementCtor) {
		logger?.debug('audio.unavailable');
		return { play: () => {} };
	}

	const sourceUrl = DEFAULT_BULLET_FIRE_SOUND_PATH;
	const volume = clampVolume(DEFAULT_BULLET_FIRE_VOLUME);
	const audio = new AudioElementCtor(sourceUrl);
	audio.loop = false;
	audio.volume = volume;

	return {
		play: () => {
			try {
				audio.currentTime = 0;
				const playbackResult = audio.play();
				if (playbackResult && typeof playbackResult.catch === 'function') {
					playbackResult.catch((error: unknown) => {
						logger?.warn('bullet.sound.failed', {
							error:
								error instanceof Error ? error.message : 'unknown',
						});
					});
				}
				logger?.debug('bullet.sound.played', {
					sourceUrl,
					volume,
				});
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
