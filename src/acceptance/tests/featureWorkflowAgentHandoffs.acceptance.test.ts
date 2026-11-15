import { describe, expect, it, vi } from 'vitest';
import {
	getFeatureWorkflowAgentOrder,
	runFeatureWorkflowWithAgents,
} from '../../tools/featureWorkflowAgentHandoffs';

describe('Acceptance: Feature workflow runs dedicated phase agents with explicit handoffs', () => {
	it('Run specifier in a dedicated agent first', () => {
		expect(getFeatureWorkflowAgentOrder()).toEqual([
			'specifier',
			'implementer',
			'cleaner',
			'hardener',
		]);
	});

	it('Handoff from specifier to implementer with required artifacts', () => {
		const runImplementerAgent = vi.fn(() => ({
			status: 'passed' as const,
			handoff: {
				changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
				verificationSummary: 'lint/test/build pass',
				summary: 'implementer complete',
			},
		}));

		runFeatureWorkflowWithAgents({
			runSpecifierAgent: () => ({
				status: 'passed',
				handoff: {
					approvedAcceptanceArtifactPaths: [
						'src/acceptance/features/featureWorkflow.agentHandoffs.acceptance.feature',
					],
					summary: 'specifier complete',
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

		expect(runImplementerAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				approvedAcceptanceArtifactPaths: expect.arrayContaining([
					'src/acceptance/features/featureWorkflow.agentHandoffs.acceptance.feature',
				]),
			}),
		);
	});

	it('Run implementer then hand off to cleaner', () => {
		const runCleanerAgent = vi.fn(() => ({
			status: 'passed' as const,
			handoff: {
				mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
				summary: 'cleaner complete',
			},
		}));

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
			runCleanerAgent,
			runHardenerAgent: () => ({
				status: 'passed',
				handoff: { summary: 'hardener complete' },
			}),
		});

		expect(runCleanerAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
				verificationSummary: 'lint/test/build pass',
			}),
		);
	});

	it('Run cleaner then hand off to hardener', () => {
		const runHardenerAgent = vi.fn(() => ({
			status: 'passed' as const,
			handoff: { summary: 'hardener complete' },
		}));

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
					mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
					summary: 'cleaner complete',
				},
			}),
			runHardenerAgent,
		});

		expect(runHardenerAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				mutationScopeInputs: ['src/tools/featureWorkflowAgentHandoffs.ts'],
			}),
		);
	});

	it('Block downstream phases on failed handoff status', () => {
		const runImplementerAgent = vi.fn(() => ({
			status: 'failed' as const,
			handoff: {
				changedFiles: ['src/tools/featureWorkflowAgentHandoffs.ts'],
				verificationSummary: 'tests failed',
				summary: 'implementer failed',
			},
			reason: 'Scenario-to-test mapping mismatch',
		}));
		const runCleanerAgent = vi.fn();

		const result = runFeatureWorkflowWithAgents({
			runSpecifierAgent: () => ({
				status: 'passed',
				handoff: {
					approvedAcceptanceArtifactPaths: ['src/acceptance/features/a.acceptance.feature'],
					summary: 'specifier complete',
				},
			}),
			runImplementerAgent,
			runCleanerAgent,
			runHardenerAgent: () => ({
				status: 'passed',
				handoff: { summary: 'hardener complete' },
			}),
		});

		expect(result.finalStatus).toBe('failed');
		expect(result.blockingPhase).toBe('implementer');
		expect(result.blockingReason).toContain('Scenario-to-test mapping mismatch');
		expect(runCleanerAgent).not.toHaveBeenCalled();
	});

	it('Produce final chained workflow report', () => {
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
					mutationScore: 84,
					summary: 'hardener complete',
				},
			}),
		});

		expect(result.report).toEqual([
			expect.objectContaining({
				phase: 'specifier',
				status: 'passed',
				handoffSummary: 'specifier complete',
			}),
			expect.objectContaining({
				phase: 'implementer',
				status: 'passed',
				handoffSummary: 'implementer complete',
			}),
			expect.objectContaining({
				phase: 'cleaner',
				status: 'passed',
				handoffSummary: 'cleaner complete',
			}),
			expect.objectContaining({
				phase: 'hardener',
				status: 'passed',
				handoffSummary: 'hardener complete',
			}),
		]);
	});
});
