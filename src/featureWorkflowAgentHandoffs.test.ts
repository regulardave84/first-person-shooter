import { describe, expect, it, vi } from 'vitest';
import {
	getFeatureWorkflowAgentOrder,
	runFeatureWorkflowWithAgents,
} from './tools/featureWorkflowAgentHandoffs';

describe('featureWorkflowAgentHandoffs', () => {
	it('returns specifier -> implementer -> cleaner -> hardener phase order', () => {
		expect(getFeatureWorkflowAgentOrder()).toEqual([
			'specifier',
			'implementer',
			'cleaner',
			'hardener',
		]);
	});

	it('runs each phase in order and returns a chained final report when all phases pass', () => {
		const result = runFeatureWorkflowWithAgents({
			runSpecifierAgent: () => ({
				status: 'passed',
				handoff: {
					approvedAcceptanceArtifactPaths: [
						'src/acceptance/features/featureWorkflow.agentHandoffs.acceptance.feature',
					],
					summary: 'specifier complete',
				},
			}),
			runImplementerAgent: (specifierHandoff) => ({
				status: 'passed',
				handoff: {
					changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
					verificationSummary: `contract locked from ${specifierHandoff.approvedAcceptanceArtifactPaths[0]}`,
					summary: 'implementer complete',
				},
			}),
			runCleanerAgent: () => ({
				status: 'passed',
				handoff: {
					mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
					summary: 'cleaner complete',
				},
			}),
			runHardenerAgent: () => ({
				status: 'passed',
				handoff: {
					mutationScore: 83.2,
					summary: 'hardener complete',
				},
			}),
		});

		expect(result.finalStatus).toBe('passed');
		expect(result.completedPhases).toEqual([
			'specifier',
			'implementer',
			'cleaner',
			'hardener',
		]);
		expect(result.report.map((entry) => entry.phase)).toEqual([
			'specifier',
			'implementer',
			'cleaner',
			'hardener',
		]);
	});

	it('blocks downstream phases when a phase reports blocked status', () => {
		const runCleanerAgent = vi.fn(() => ({
			status: 'blocked' as const,
			handoff: {
				mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
				summary: 'cleaner blocked',
			},
			reason: 'Dependency policy violation',
		}));
		const runHardenerAgent = vi.fn();

		const result = runFeatureWorkflowWithAgents({
			runSpecifierAgent: () => ({
				status: 'passed',
				handoff: {
					approvedAcceptanceArtifactPaths: ['src/acceptance/features/a.acceptance.feature'],
					summary: 'specifier complete',
				},
			}),
			runImplementerAgent: () => ({
				status: 'passed',
				handoff: {
					changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
					verificationSummary: 'lint/test/build pass',
					summary: 'implementer complete',
				},
			}),
			runCleanerAgent,
			runHardenerAgent,
		});

		expect(result.finalStatus).toBe('blocked');
		expect(result.blockingPhase).toBe('cleaner');
		expect(result.blockingReason).toContain('Dependency policy violation');
		expect(result.completedPhases).toEqual(['specifier', 'implementer']);
		expect(runCleanerAgent).toHaveBeenCalledTimes(1);
		expect(runHardenerAgent).not.toHaveBeenCalled();
	});

	it('requires approved acceptance artifacts in specifier handoff', () => {
		expect(() =>
			runFeatureWorkflowWithAgents({
				runSpecifierAgent: () => ({
					status: 'passed',
					handoff: {
						approvedAcceptanceArtifactPaths: [],
						summary: 'specifier complete',
					},
				}),
				runImplementerAgent: () => ({
					status: 'passed',
					handoff: {
						changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
						verificationSummary: 'lint/test/build pass',
						summary: 'implementer complete',
					},
				}),
				runCleanerAgent: () => ({
					status: 'passed',
					handoff: {
						mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
						summary: 'cleaner complete',
					},
				}),
				runHardenerAgent: () => ({
					status: 'passed',
					handoff: { summary: 'hardener complete' },
				}),
			}),
		).toThrow('approved acceptance artifact references');
	});

	it('rejects whitespace-only acceptance artifact references', () => {
		expect(() =>
			runFeatureWorkflowWithAgents({
				runSpecifierAgent: () => ({
					status: 'passed',
					handoff: {
						approvedAcceptanceArtifactPaths: ['   '],
						summary: 'specifier complete',
					},
				}),
				runImplementerAgent: () => ({
					status: 'passed',
					handoff: {
						changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
						verificationSummary: 'lint/test/build pass',
						summary: 'implementer complete',
					},
				}),
				runCleanerAgent: () => ({
					status: 'passed',
					handoff: {
						mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
						summary: 'cleaner complete',
					},
				}),
				runHardenerAgent: () => ({
					status: 'passed',
					handoff: { summary: 'hardener complete' },
				}),
			}),
		).toThrow('approved acceptance artifact references');
	});

	it('requires changed-files and verification summary in implementer handoff', () => {
		expect(() =>
			runFeatureWorkflowWithAgents({
				runSpecifierAgent: () => ({
					status: 'passed',
					handoff: {
						approvedAcceptanceArtifactPaths: ['src/acceptance/features/a.acceptance.feature'],
						summary: 'specifier complete',
					},
				}),
				runImplementerAgent: () => ({
					status: 'passed',
					handoff: {
						changedFiles: [],
						verificationSummary: '',
						summary: 'implementer complete',
					},
				}),
				runCleanerAgent: () => ({
					status: 'passed',
					handoff: {
						mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
						summary: 'cleaner complete',
					},
				}),
				runHardenerAgent: () => ({
					status: 'passed',
					handoff: { summary: 'hardener complete' },
				}),
			}),
		).toThrow('changed-files summary');
	});

	it('rejects whitespace-only verification summaries in implementer handoff', () => {
		expect(() =>
			runFeatureWorkflowWithAgents({
				runSpecifierAgent: () => ({
					status: 'passed',
					handoff: {
						approvedAcceptanceArtifactPaths: [
							'src/acceptance/features/a.acceptance.feature',
						],
						summary: 'specifier complete',
					},
				}),
				runImplementerAgent: () => ({
					status: 'passed',
					handoff: {
						changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
						verificationSummary: '  ',
						summary: 'implementer complete',
					},
				}),
				runCleanerAgent: () => ({
					status: 'passed',
					handoff: {
						mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
						summary: 'cleaner complete',
					},
				}),
				runHardenerAgent: () => ({
					status: 'passed',
					handoff: { summary: 'hardener complete' },
				}),
			}),
		).toThrow('verification summary');
	});

	it('requires mutation-scope inputs in cleaner handoff', () => {
		expect(() =>
			runFeatureWorkflowWithAgents({
				runSpecifierAgent: () => ({
					status: 'passed',
					handoff: {
						approvedAcceptanceArtifactPaths: ['src/acceptance/features/a.acceptance.feature'],
						summary: 'specifier complete',
					},
				}),
				runImplementerAgent: () => ({
					status: 'passed',
					handoff: {
						changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
						verificationSummary: 'lint/test/build pass',
						summary: 'implementer complete',
					},
				}),
				runCleanerAgent: () => ({
					status: 'passed',
					handoff: {
						mutationScopeInputs: [],
						summary: 'cleaner complete',
					},
				}),
				runHardenerAgent: () => ({
					status: 'passed',
					handoff: { summary: 'hardener complete' },
				}),
			}),
		).toThrow('mutation-scope inputs');
	});

	it('uses default blocking reason when specifier fails without explicit reason', () => {
		const runImplementerAgent = vi.fn();

		const result = runFeatureWorkflowWithAgents({
			runSpecifierAgent: () => ({
				status: 'failed',
				handoff: {
					approvedAcceptanceArtifactPaths: [
						'src/acceptance/features/a.acceptance.feature',
					],
					summary: 'specifier failed',
				},
			}),
			runImplementerAgent,
			runCleanerAgent: () => ({
				status: 'passed',
				handoff: {
					mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
					summary: 'cleaner complete',
				},
			}),
			runHardenerAgent: () => ({
				status: 'passed',
				handoff: { summary: 'hardener complete' },
			}),
		});

		expect(result.finalStatus).toBe('failed');
		expect(result.blockingPhase).toBe('specifier');
		expect(result.blockingReason).toBe(
			'Phase specifier reported a non-passed status.',
		);
		expect(result.completedPhases).toEqual([]);
		expect(result.report).toHaveLength(1);
		expect(runImplementerAgent).not.toHaveBeenCalled();
	});

	it('reports implementer blocking details and stops cleaner/hardener execution', () => {
		const runCleanerAgent = vi.fn();
		const runHardenerAgent = vi.fn();

		const result = runFeatureWorkflowWithAgents({
			runSpecifierAgent: () => ({
				status: 'passed',
				handoff: {
					approvedAcceptanceArtifactPaths: [
						'src/acceptance/features/a.acceptance.feature',
					],
					summary: 'specifier complete',
				},
			}),
			runImplementerAgent: () => ({
				status: 'blocked',
				handoff: {
					changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
					verificationSummary: 'blocked verification',
					summary: 'implementer blocked',
				},
			}),
			runCleanerAgent,
			runHardenerAgent,
		});

		expect(result.finalStatus).toBe('blocked');
		expect(result.blockingPhase).toBe('implementer');
		expect(result.blockingReason).toBe(
			'Phase implementer reported a non-passed status.',
		);
		expect(result.completedPhases).toEqual(['specifier']);
		expect(result.report).toHaveLength(2);
		expect(runCleanerAgent).not.toHaveBeenCalled();
		expect(runHardenerAgent).not.toHaveBeenCalled();
	});

	it('reports hardener failure and keeps completed phases traceable', () => {
		const result = runFeatureWorkflowWithAgents({
			runSpecifierAgent: () => ({
				status: 'passed',
				handoff: {
					approvedAcceptanceArtifactPaths: [
						'src/acceptance/features/a.acceptance.feature',
					],
					summary: 'specifier complete',
				},
			}),
			runImplementerAgent: () => ({
				status: 'passed',
				handoff: {
					changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
					verificationSummary: 'lint/test/build pass',
					summary: 'implementer complete',
				},
			}),
			runCleanerAgent: () => ({
				status: 'passed',
				handoff: {
					mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
					summary: 'cleaner complete',
				},
			}),
			runHardenerAgent: () => ({
				status: 'failed',
				handoff: {
					summary: 'hardener failed',
				},
			}),
		});

		expect(result.finalStatus).toBe('failed');
		expect(result.blockingPhase).toBe('hardener');
		expect(result.blockingReason).toBe(
			'Phase hardener reported a non-passed status.',
		);
		expect(result.completedPhases).toEqual([
			'specifier',
			'implementer',
			'cleaner',
		]);
		expect(result.report).toHaveLength(4);
	});
});
