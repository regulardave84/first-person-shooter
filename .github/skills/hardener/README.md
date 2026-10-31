# Hardener AI Skill

This directory contains the `hardener` AI skill configuration and usage notes.

- Skill definition: [SKILL.md](SKILL.md)

## What hardener does

The `hardener` skill is designed to:

- Analyze branch changes
- Run relevant tests first and stop on failures
- Run mutation tests after tests pass
- Improve/add tests when mutation score is below `80%`
- Repeat until mutation score is `>= 80%`

Use this skill when hardening test quality before merge.

## Hardener runbook (example)

Typical local sequence:

```bash
# 1) Check what changed
git status --short
git diff --name-only

# 2) Run relevant tests first (or full suite when broad changes)
npm run test

# 3) Run mutation testing
npm run test:mutation

# 4) If score < 80%, improve tests and repeat steps 2-3

# 5) Final sanity checks
npm run lint
npm run build
```

Tip: if mutation artifacts cause noisy test/lint results, remove generated folders before rerunning:

```bash
rm -rf .stryker-tmp reports/mutation
```
