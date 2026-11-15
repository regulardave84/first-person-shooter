export type MockCall = (...args: unknown[]) => unknown;

export function createOneShotPlayerMock(play: MockCall) {
	return { play };
}

export function createLoopingPlayerMock(play: MockCall, stop: MockCall) {
	return { play, stop };
}
