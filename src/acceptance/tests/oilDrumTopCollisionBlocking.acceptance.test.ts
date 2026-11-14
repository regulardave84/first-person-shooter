import { describe, expect, it } from 'vitest';
import {
	DEFAULT_OIL_DRUM_COLLIDER_HEIGHT,
	DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
} from '../../app/oilDrumEntity';
import {
	PLAYER_MAX_JUMP_OVER_ENTITY_HEIGHT,
	resolveHorizontalMovement,
} from '../../fpsRuntime';

describe('Acceptance: Oil drum top collision blocking', () => {
	it('Oil drum blocks forward jump-over near the top section', () => {
		const oilDrumCollider = {
			x: 0,
			z: 2,
			radius: DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
			minY: 0,
			maxY: DEFAULT_OIL_DRUM_COLLIDER_HEIGHT,
		};
		const playerStart = { x: -2, y: 4.5, z: 2 };

		const resolved = resolveHorizontalMovement(
			playerStart,
			{ x: 2, y: 4.5, z: 2 },
			[],
			0.9,
			[oilDrumCollider],
		);

		expect(resolved.x).toBeLessThan(0);
		expect(resolved.z).toBeCloseTo(2);
	});

	it('Oil drum collider height supports non-jumpable behavior', () => {
		expect(DEFAULT_OIL_DRUM_COLLIDER_HEIGHT).toBeGreaterThanOrEqual(
			PLAYER_MAX_JUMP_OVER_ENTITY_HEIGHT,
		);
	});
});
