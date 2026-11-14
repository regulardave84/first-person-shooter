import { describe, expect, it } from 'vitest';
import {
	PLAYER_MAX_JUMP_OVER_ENTITY_HEIGHT,
	resolveHorizontalMovement,
} from '../../fpsRuntime';

describe('Acceptance: Entity jump-height blocking', () => {
	it('Equal-height entity blocks jump-over traversal', () => {
		const playerStart = { x: -2, y: 4.5, z: 0 };
		const entity = {
			x: 0,
			z: 0,
			radius: 0.75,
			minY: 0,
			maxY: PLAYER_MAX_JUMP_OVER_ENTITY_HEIGHT,
		};

		const resolved = resolveHorizontalMovement(
			playerStart,
			{ x: 2, y: 4.5, z: 0 },
			[],
			0.9,
			[entity],
		);

		expect(resolved.x).toBeLessThan(0);
		expect(resolved.z).toBeCloseTo(0);
	});

	it('Taller entity blocks jump-over traversal', () => {
		const playerStart = { x: -2, y: 5, z: 0 };
		const entity = {
			x: 0,
			z: 0,
			radius: 0.75,
			minY: 0,
			maxY: PLAYER_MAX_JUMP_OVER_ENTITY_HEIGHT + 0.5,
		};

		const resolved = resolveHorizontalMovement(
			playerStart,
			{ x: 2, y: 5, z: 0 },
			[],
			0.9,
			[entity],
		);

		expect(resolved.x).toBeLessThan(0);
		expect(resolved.z).toBeCloseTo(0);
	});

	it('Shorter entity can still be jumped over', () => {
		const playerStart = { x: -2, y: 4.5, z: 0 };
		const entity = {
			x: 0,
			z: 0,
			radius: 0.75,
			minY: 0,
			maxY: PLAYER_MAX_JUMP_OVER_ENTITY_HEIGHT - 0.5,
		};

		const resolved = resolveHorizontalMovement(
			playerStart,
			{ x: 2, y: 4.5, z: 0 },
			[],
			0.9,
			[entity],
		);

		expect(resolved.x).toBeCloseTo(2);
		expect(resolved.z).toBeCloseTo(0);
	});
});
