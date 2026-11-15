import { describe, it } from 'vitest';
import { runScenario, type StepDefinitions } from '../../../specifier';

const stepDefinitions: StepDefinitions = {
	'Given the player fires a shot that intersects a solid wall': async (
		context,
	) => {
		void context;
	},
	'When the hit is resolved': async (context) => {
		void context;
	},
	'Then a bullet hole mark is created at the wall impact position': async (
		context,
	) => {
		void context;
	},
	'And the bullet hole uses the "bullet_hole.png" asset': async (context) => {
		void context;
	},
	'Given the player fires a shot that intersects the floor': async (context) => {
		void context;
	},
	'Then a bullet hole mark is created at the floor impact position': async (
		context,
	) => {
		void context;
	},
	'Given a destructible oil drum is active in the scene': async (context) => {
		void context;
	},
	'And the player fires a shot that intersects the oil drum': async (
		context,
	) => {
		void context;
	},
	'Then no bullet hole mark is created on the oil drum': async (context) => {
		void context;
	},
	'Given the player repeatedly hits walls and floors with bullets': async (
		context,
	) => {
		void context;
	},
	'When the total bullet hole count exceeds the configured maximum': async (
		context,
	) => {
		void context;
	},
	'Then the oldest bullet hole marks are removed first': async (context) => {
		void context;
	},
	'And newly created bullet hole marks continue to appear': async (context) => {
		void context;
	},
	'Given the player fires a shot that does not intersect wall or floor geometry':
		async (context) => {
			void context;
		},
	'When the shot is resolved': async (context) => {
		void context;
	},
	'Then no bullet hole mark is created': async (context) => {
		void context;
	},
};

describe('Acceptance: Bullet holes appear on impacted world surfaces', () => {
	const Wall_impact_spawns_a_bullet_hole_decal_steps = [
		{
			keyword: 'Given',
			text: 'the player fires a shot that intersects a solid wall',
		},
		{ keyword: 'When', text: 'the hit is resolved' },
		{
			keyword: 'Then',
			text: 'a bullet hole mark is created at the wall impact position',
		},
		{
			keyword: 'And',
			text: 'the bullet hole uses the "bullet_hole.png" asset',
		},
	] as const;

	it('Wall impact spawns a bullet hole decal', async () => {
		await runScenario(
			Wall_impact_spawns_a_bullet_hole_decal_steps,
			stepDefinitions,
			{},
		);
	});

	const Floor_impact_spawns_a_bullet_hole_decal_steps = [
		{
			keyword: 'Given',
			text: 'the player fires a shot that intersects the floor',
		},
		{ keyword: 'When', text: 'the hit is resolved' },
		{
			keyword: 'Then',
			text: 'a bullet hole mark is created at the floor impact position',
		},
		{
			keyword: 'And',
			text: 'the bullet hole uses the "bullet_hole.png" asset',
		},
	] as const;

	it('Floor impact spawns a bullet hole decal', async () => {
		await runScenario(
			Floor_impact_spawns_a_bullet_hole_decal_steps,
			stepDefinitions,
			{},
		);
	});

	const Oil_drum_impact_does_not_spawn_a_bullet_hole_mark_steps = [
		{
			keyword: 'Given',
			text: 'a destructible oil drum is active in the scene',
		},
		{
			keyword: 'And',
			text: 'the player fires a shot that intersects the oil drum',
		},
		{ keyword: 'When', text: 'the hit is resolved' },
		{
			keyword: 'Then',
			text: 'no bullet hole mark is created on the oil drum',
		},
	] as const;

	it('Oil drum impact does not spawn a bullet hole mark', async () => {
		await runScenario(
			Oil_drum_impact_does_not_spawn_a_bullet_hole_mark_steps,
			stepDefinitions,
			{},
		);
	});

	const Repeated_wall_and_floor_hits_accumulate_bullet_holes_up_to_a_safe_cap_steps = [
		{
			keyword: 'Given',
			text: 'the player repeatedly hits walls and floors with bullets',
		},
		{
			keyword: 'When',
			text: 'the total bullet hole count exceeds the configured maximum',
		},
		{
			keyword: 'Then',
			text: 'the oldest bullet hole marks are removed first',
		},
		{
			keyword: 'And',
			text: 'newly created bullet hole marks continue to appear',
		},
	] as const;

	it('Repeated wall and floor hits accumulate bullet holes up to a safe cap', async () => {
		await runScenario(
			Repeated_wall_and_floor_hits_accumulate_bullet_holes_up_to_a_safe_cap_steps,
			stepDefinitions,
			{},
		);
	});

	const Non_hit_shots_do_not_create_bullet_holes_steps = [
		{
			keyword: 'Given',
			text: 'the player fires a shot that does not intersect wall or floor geometry',
		},
		{ keyword: 'When', text: 'the shot is resolved' },
		{ keyword: 'Then', text: 'no bullet hole mark is created' },
	] as const;

	it('Non-hit shots do not create bullet holes', async () => {
		await runScenario(
			Non_hit_shots_do_not_create_bullet_holes_steps,
			stepDefinitions,
			{},
		);
	});
});
