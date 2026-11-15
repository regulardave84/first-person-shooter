# Copilot Repository Instructions

## Default feature-delivery workflow

When a user asks to add, change, or extend a feature, follow this workflow in order:

1. **Create a feature branch for the work**
   - Create and switch to a new branch before making any implementation or acceptance-artifact changes.
   - Use a clear branch name derived from the feature intent.

2. **Run implementation-discovery questions (before specifier)**
   - Ask targeted questions about implementation preferences before creating any implementation plan or acceptance artifacts.
   - Cover at least architecture shape, UX expectations (if applicable), and constraints/trade-offs.
   - Wait for user answers (or explicit permission to use defaults) before creating acceptance criteria files.

3. **Run `specifier` skill**
   - Convert user requirements into Gherkin acceptance criteria.
   - Persist the acceptance criteria in a `.feature` file.
   - Ask for explicit user approval before proceeding.

4. **Run `implementer` skill**
   - Use only approved Gherkin as the implementation contract.
   - Create/update tests mapped to each scenario.
   - Implement production code to satisfy those tests.
   - Write checkpoints in `.github/skills/implementer/IMPLEMENTER_CHECKPOINTS.md`.

5. **Run `cleaner` skill**
   - Review and clean up implementation changes.
   - Use CRAP analysis and safe refactors.
   - Preserve behavior and re-verify quality gates.

6. **Run `hardener` skill**
   - Run mutation testing only when implementation source code changed.
   - If no implementation source code changed, skip mutation testing and report the skip reason.
   - Improve tests for survivors until mutation score is at least 80% (or report blocked with evidence).

7. **Run manual QA handoff in-game**
   - When implementation is considered complete, run the game for the user so they can manually test behavior.
   - Wait for explicit user approval after manual testing before any final git/PR actions.

8. **After approval, perform git/PR completion automatically**
   - Commit the branch with a clear conventional commit message.
   - Push the feature branch to origin.
   - Create a pull request targeting `main`.
   - Merge the pull request into `main` after required checks pass.
   - Update local `main` and push `main` to origin.

## Quality gates per feature request

Before final handoff, ensure these pass unless blocked by user-approved exceptions:

- `npm run lint`
- `npm run test:all`
- `npm run build`
- `npm run test:mutation:branch` (hardener target: >= 80%, only when implementation source code changed)

## Terminal polling cadence for long-running tasks

- When waiting for long-running terminal work (for example mutation testing), poll terminal output every 5 minutes by default unless the user requests a different cadence.

## Change-control rules

- Do not modify approved acceptance Gherkin without explicit user permission.
- Keep scenario-to-test traceability explicit.
- Prefer minimal, style-consistent changes.
- Report outputs by phase (specifier, implementer, cleaner, hardener), including any blockers.
