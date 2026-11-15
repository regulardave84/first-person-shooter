import { describe, expect, it } from 'vitest';
import {
	classifyAcceptanceTestArtifactFromFileName,
	classifyFeatureArtifactFromFileName,
	findDuplicateAcceptedFeatureTitles,
	findNormalizedNameCollisions,
	parseFeatureTitle,
	validateAcceptanceArtifacts,
} from './tools/acceptanceArtifactChecker';

describe('acceptanceArtifactChecker', () => {
	it('classifies feature files by accepted and proposed suffixes', () => {
		expect(
			classifyFeatureArtifactFromFileName('playerJump.acceptance.feature'),
		).toEqual({
			kind: 'accepted-feature',
			baseName: 'playerJump',
		});

		expect(
			classifyFeatureArtifactFromFileName('playerJump.proposed.feature'),
		).toEqual({
			kind: 'proposed-feature',
			baseName: 'playerJump',
		});

		expect(classifyFeatureArtifactFromFileName('oil_drum_spawn.feature')).toEqual({
			kind: 'accepted-feature',
			baseName: 'oil_drum_spawn',
		});

		expect(classifyFeatureArtifactFromFileName('README.md')).toBeNull();
	});

	it('classifies acceptance test files', () => {
		expect(
			classifyAcceptanceTestArtifactFromFileName(
				'playerJump.acceptance.test.ts',
			),
		).toEqual({ kind: 'acceptance-test', baseName: 'playerJump' });
		expect(classifyAcceptanceTestArtifactFromFileName('playerJump.test.ts')).toBeNull();
	});

	it('parses a feature title from gherkin content', () => {
		const title = parseFeatureTitle(`
      # comment
      Feature: Player jump behavior
        Scenario: Example
    `);

		expect(title).toBe('Player jump behavior');
	});

	it('returns null when no valid feature title is present', () => {
		expect(parseFeatureTitle('Scenario: Missing feature')).toBeNull();
		expect(parseFeatureTitle('Feature:   ')).toBeNull();
	});

	it('finds normalized-name collisions only within the same artifact kind', () => {
		const collisions = findNormalizedNameCollisions([
			{
				filePath: 'src/acceptance/features/playerJump.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'playerJump',
			},
			{
				filePath: 'src/acceptance/features/player_jump.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'player_jump',
			},
			{
				filePath: 'src/acceptance/features/player_jump.proposed.feature',
				kind: 'proposed-feature',
				baseName: 'player_jump',
			},
		]);

		expect(collisions).toEqual([
			{
				kind: 'accepted-feature',
				normalizedKey: 'playerjump',
				filePaths: [
					'src/acceptance/features/player_jump.acceptance.feature',
					'src/acceptance/features/playerJump.acceptance.feature',
				],
			},
		]);
	});

	it('sorts multiple normalized-name collisions by kind and key', () => {
		const collisions = findNormalizedNameCollisions([
			{
				filePath: 'src/acceptance/tests/zeta_flow.acceptance.test.ts',
				kind: 'acceptance-test',
				baseName: 'zeta_flow',
			},
			{
				filePath: 'src/acceptance/tests/zetaFlow.acceptance.test.ts',
				kind: 'acceptance-test',
				baseName: 'zetaFlow',
			},
			{
				filePath: 'src/acceptance/features/alpha_feature.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'alpha_feature',
			},
			{
				filePath: 'src/acceptance/features/alphaFeature.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'alphaFeature',
			},
		]);

		expect(collisions).toEqual([
			{
				kind: 'acceptance-test',
				normalizedKey: 'zetaflow',
				filePaths: [
					'src/acceptance/tests/zeta_flow.acceptance.test.ts',
					'src/acceptance/tests/zetaFlow.acceptance.test.ts',
				],
			},
			{
				kind: 'accepted-feature',
				normalizedKey: 'alphafeature',
				filePaths: [
					'src/acceptance/features/alpha_feature.acceptance.feature',
					'src/acceptance/features/alphaFeature.acceptance.feature',
				],
			},
		]);
	});

	it('finds duplicate accepted feature titles case-insensitively', () => {
		const duplicates = findDuplicateAcceptedFeatureTitles([
			{
				filePath: 'src/acceptance/features/a.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'a',
				content: 'Feature: Player Jump\n\nScenario: One',
			},
			{
				filePath: 'src/acceptance/features/b.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'b',
				content: 'Feature:  player   jump\n\nScenario: Two',
			},
			{
				filePath: 'src/acceptance/features/c.proposed.feature',
				kind: 'proposed-feature',
				baseName: 'c',
				content: 'Feature: player jump',
			},
		]);

		expect(duplicates).toEqual([
			{
				normalizedTitle: 'player jump',
				entries: [
					{
						filePath: 'src/acceptance/features/a.acceptance.feature',
						title: 'Player Jump',
					},
					{
						filePath: 'src/acceptance/features/b.acceptance.feature',
						title: 'player   jump',
					},
				],
			},
		]);
	});

	it('ignores duplicate titles from proposed features and enforces deterministic title ordering', () => {
		const duplicates = findDuplicateAcceptedFeatureTitles([
			{
				filePath: 'src/acceptance/features/b.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'b',
				content: 'Feature: Shared title',
			},
			{
				filePath: 'src/acceptance/features/a.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'a',
				content: 'Feature: Shared title',
			},
			{
				filePath: 'src/acceptance/features/c.proposed.feature',
				kind: 'proposed-feature',
				baseName: 'c',
				content: 'Feature: Shared title',
			},
		]);

		expect(duplicates).toEqual([
			{
				normalizedTitle: 'shared title',
				entries: [
					{
						filePath: 'src/acceptance/features/a.acceptance.feature',
						title: 'Shared title',
					},
					{
						filePath: 'src/acceptance/features/b.acceptance.feature',
						title: 'Shared title',
					},
				],
			},
		]);
	});

	it('returns a failing validation result when collisions are detected', () => {
		const result = validateAcceptanceArtifacts([
			{
				filePath: 'src/acceptance/features/playerJump.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'playerJump',
				content: 'Feature: Player Jump',
			},
			{
				filePath: 'src/acceptance/features/player_jump.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'player_jump',
				content: 'Feature: Player Jump',
			},
		]);

		expect(result.passed).toBe(false);
		expect(result.normalizedNameCollisions).toHaveLength(1);
		expect(result.duplicateAcceptedFeatureTitles).toHaveLength(1);
	});

	it('returns a passing validation result when no collisions exist', () => {
		const result = validateAcceptanceArtifacts([
			{
				filePath: 'src/acceptance/features/playerJump.acceptance.feature',
				kind: 'accepted-feature',
				baseName: 'playerJump',
				content: 'Feature: Player Jump',
			},
			{
				filePath: 'src/acceptance/features/playerRun.proposed.feature',
				kind: 'proposed-feature',
				baseName: 'playerRun',
				content: 'Feature: Player Run',
			},
			{
				filePath: 'src/acceptance/tests/playerJump.acceptance.test.ts',
				kind: 'acceptance-test',
				baseName: 'playerJump',
			},
		]);

		expect(result).toEqual({
			passed: true,
			normalizedNameCollisions: [],
			duplicateAcceptedFeatureTitles: [],
		});
	});
});
