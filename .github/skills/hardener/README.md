# Hardener AI Skill

This directory contains the `hardener` AI skill configuration and usage notes.

- Skill definition: [SKILL.md](SKILL.md)

## What hardener does

The `hardener` skill is designed to:

- Analyze branch changes
- Run the full test suite first and stop on failures
- Run mutation tests after the full suite passes, scoped to implementation files changed on branch
- Improve/add tests when mutation score is below `80%`
- Repeat until mutation score is `>= 80%`

Use this skill when hardening test quality before merge.

## Hardener runbook (example)

Typical local sequence:

```bash
# 1) Check what changed
git status --short
git diff --name-only

# 2) Run full test suite gate
npm run test:all

# 3) Run mutation testing
npm run test:mutation:branch

# 4) If score < 80%, improve tests and repeat steps 2-3

# 5) Final sanity checks
npm run lint
npm run build
```

Optional: set a specific diff base branch for scope detection.

```bash
HARDENER_BASE_BRANCH=origin/main npm run test:mutation:branch
```

Tip: if mutation artifacts cause noisy test/lint results, remove generated folders before rerunning:

```bash
rm -rf .stryker-tmp reports/mutation
```
