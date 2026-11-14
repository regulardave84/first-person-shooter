import { describe, expect, it } from 'vitest';
import {
	DEFAULT_OIL_DRUM_COLLIDER_HEIGHT,
	DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
	createOilDrumMovementCollider,
} from '../../app/oilDrumEntity';
import { resolveHorizontalMovement } from '../../fpsRuntime';

describe('Acceptance: Oil drum collision respects body and top blocking', () => {
	it('Player cannot pass through oil drum body at ground height', () => {
		const collider = createOilDrumMovementCollider({ x: 0, y: 1, z: 2 });
		const playerStart = { x: -2, y: 1.6, z: 2 };

		const resolved = resolveHorizontalMovement(
			playerStart,
			{ x: 2, y: 1.6, z: 2 },
			[],
			0.9,
			[collider],
		);

		expect(resolved.x).toBeLessThan(0);
		expect(resolved.z).toBeCloseTo(2);
	});

	it('Player cannot pass over oil drum when above top height', () => {
		const collider = createOilDrumMovementCollider({ x: 0, y: 1, z: 2 });
		const playerStart = { x: -2, y: collider.maxY + 0.3, z: 2 };

		const resolved = resolveHorizontalMovement(
			playerStart,
			{ x: 2, y: collider.maxY + 0.3, z: 2 },
			[],
			0.9,
			[collider],
		);

		expect(resolved.x).toBeLessThan(0);
		expect(resolved.z).toBeCloseTo(2);
	});

	it('Jump arc cannot tunnel through oil drum body in a single frame', () => {
		const collider = {
			x: 0,
			z: 2,
			radius: DEFAULT_OIL_DRUM_COLLIDER_RADIUS,
			minY: 0,
			maxY: DEFAULT_OIL_DRUM_COLLIDER_HEIGHT,
		};
		const playerStart = { x: -2, y: 1.6, z: 2 };

		const resolved = resolveHorizontalMovement(
			playerStart,
			{ x: 2, y: 2.6, z: 2 },
			[],
			0.9,
			[collider],
		);

		expect(resolved.x).toBeLessThan(0);
	});
});
