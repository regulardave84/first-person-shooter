export const PLAYER_COLLISION_RADIUS = 0.9;

export type WallSpec = {
	x: number;
	y: number;
	z: number;
	w: number;
	h: number;
	d: number;
	kind: 'outer' | 'inner';
};

export const WORLD_WALLS: ReadonlyArray<WallSpec> = [
	{ x: 0, y: 2, z: -20, w: 40, h: 4, d: 1, kind: 'outer' },
	{ x: 0, y: 2, z: 20, w: 40, h: 4, d: 1, kind: 'outer' },
	{ x: -20, y: 2, z: 0, w: 1, h: 4, d: 40, kind: 'outer' },
	{ x: 20, y: 2, z: 0, w: 1, h: 4, d: 40, kind: 'outer' },
	{ x: 0, y: 2, z: 0, w: 12, h: 4, d: 1, kind: 'inner' },
	{ x: -8, y: 2, z: 8, w: 1, h: 4, d: 10, kind: 'inner' },
];

export function getWorldLayoutSummary(): {
	floorCount: number;
	outerWallCount: number;
	innerWallCount: number;
} {
	const outerWallCount = WORLD_WALLS.filter(
		(wall) => wall.kind === 'outer',
	).length;
	const innerWallCount = WORLD_WALLS.filter(
		(wall) => wall.kind === 'inner',
	).length;
	return {
		floorCount: 1,
		outerWallCount,
		innerWallCount,
	};
}
