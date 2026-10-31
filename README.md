# Minimal Browser FPS (TypeScript + Vite + Three.js)

A minimal first-person browser game starter built with TypeScript, Vite, and Three.js, with a built-in specifier workflow for acceptance-driven development.

## Features

- 3D scene with:
  - Floor
  - Outer walls
  - Inner walls
- First-person controls:
  - `W`, `A`, `S`, `D` to move
  - Mouse to look around
  - Pointer lock on click
- Movement constraints:
   - Solid wall collision with player radius
   - Jumping and gravity with grounded state handling
- Simple on-screen HUD/instructions and a crosshair
- Acceptance-first tooling helpers for:
   - Parsing Gherkin
   - Generating acceptance-test scaffolding
   - Generating unit-test scaffolding from approved acceptance criteria
   - Generating manual QA procedures

## Tech Stack

- [Vite](https://vitejs.dev/) for dev server/build
- [TypeScript](https://www.typescriptlang.org/)
- [Three.js](https://threejs.org/)
- [ESLint](https://eslint.org/) for code linting
- [Vitest](https://vitest.dev/) for unit tests
- [Stryker](https://stryker-mutator.io/) for mutation testing

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run locally (development)

```bash
npm run dev
```

Then open the URL shown in the terminal (typically `http://localhost:5173`).

### 3) Production build

```bash
npm run build
```

### 4) Preview production build

```bash
npm run preview
```

### 5) Lint the code

```bash
npm run lint
```

### 6) Auto-fix lint issues

```bash
npm run lint:fix
```

### 7) Run unit tests

```bash
npm run test
```

### 8) Run tests in watch mode

```bash
npm run test:watch
```

### 9) Run acceptance tests

```bash
npm run test:acceptance
```

### 10) Run unit + acceptance test suite

```bash
npm run test:all
```

### 11) Run acceptance tests in watch mode

```bash
npm run test:watch:acceptance
```

### 12) Generate test coverage report

```bash
npm run test:coverage
```

### 13) Run mutation tests (default Stryker config)

```bash
npm run test:mutation
```

### 14) Run branch-scoped hardener mutation workflow

```bash
npm run test:mutation:branch
```

### 15) Analyze CRAP score (complexity + coverage)

```bash
npm run cleaner
```

This generates a CRAP hotspot report at `reports/cleaner/CRAP_REPORT.md`.

### 16) Run architecture guardrails check

```bash
npm run architecture:check
```

This enforces source-file size limits and import-boundary rules and writes `reports/cleaner/ARCHITECTURE_GUARDRAILS_REPORT.md`.

## Controls

- Click in the game window to lock the mouse
- Move with `W`, `A`, `S`, `D`
- Look with the mouse
- Press `Esc` to unlock the mouse

## Project Structure

- `index.html` – app shell and overlay UI
- `src/main.ts` – minimal entrypoint that boots the app
- `src/app/bootstrap.ts` – scene wiring, controls registration, and animation loop orchestration
- `src/core/gameLogic.ts` – pure movement/look logic
- `src/runtime/fpsRuntime.ts` – runtime helpers for input, world layout, and per-frame updates
- `src/tools/specifier/` – split specifier modules (`gherkinParser`, `acceptanceGenerator`, `unitTestGenerator`, `qaProcedureGenerator`, `scenarioRunner`, `types`)
- `src/gameLogic.ts`, `src/fpsRuntime.ts`, `src/specifier.ts` – compatibility barrels for stable imports
- `src/*.test.ts` – unit tests (game logic, runtime helpers, and specifier tooling)
- `src/*.acceptance.feature` – approved acceptance criteria in Gherkin
- `src/*.acceptance*.ts` – acceptance tests and generated acceptance scaffolding
- `src/*.qa-procedure.md` – generated manual QA procedures from approved acceptance criteria
- `src/style.css` – basic styling for HUD/crosshair
- `eslint.config.js` – ESLint flat config for TypeScript/browser code
- `architecture-guardrails.policy.json` – architecture gate policy (file-size and boundary constraints)
- `vitest.config.ts` – Vitest configuration (excludes generated mutation artifacts)
- `stryker.conf.json` – Stryker mutation testing configuration
- `tsconfig.json` – TypeScript configuration
- `package.json` – scripts and dependencies

## Unit Testing

Unit tests currently cover:

- Core gameplay math (`src/gameLogic.ts` / `src/core/gameLogic.ts`):
   - Pitch clamping
   - Mouse look angle updates
   - Movement vector behavior and normalization
- Runtime helpers (`src/fpsRuntime.ts` / `src/runtime/fpsRuntime.ts`):
   - Input state updates
   - Pointer lock handling
   - Frame movement and viewport resize behavior
- Specifier tooling (`src/specifier.ts` / `src/tools/specifier/*`):
   - Gherkin parsing
   - Scenario execution
   - Acceptance/unit-test/QA-procedure generation

This keeps tests fast and deterministic while covering both gameplay behavior and the acceptance-first tooling pipeline.

## Quality Gates

The default quality gate sequence for feature delivery is:

```bash
npm run lint
npm run test:all
npm run build
npm run test:mutation:branch
```

Mutation testing target is at least 80% unless explicitly approved as blocked.

## Mutation Testing

Mutation testing is configured with Stryker to validate test strength.

- Default mutation run: `npm run test:mutation`
- Branch-scoped hardener run: `npm run test:mutation:branch`
- Branch hardener run executes full test-suite gate (`npm run test:all`) before mutation and blocks mutation when the suite fails
- Branch-scoped mutate targets are derived from changed implementation files under `src/`
- HTML report output: `reports/mutation/index.html`

Run branch-scoped mutation tests with:

```bash
npm run test:mutation:branch
```

## Main Components (How it Works)

1. **Scene Setup**
   - Creates a Three.js `Scene`, `PerspectiveCamera`, and `WebGLRenderer`.

2. **World Geometry**
   - Adds a floor plane and several box meshes as walls.

3. **Lighting**
   - Uses a hemisphere light and directional light so the scene is visible and readable.

4. **Input + Pointer Lock**
   - Tracks keyboard state for movement.
   - Uses pointer lock to capture mouse movement for FPS-style look.

5. **Animation Loop**
   - Runs every frame with `requestAnimationFrame`.
   - Updates movement using delta time and renders the scene.

## Notes

- Current gameplay includes wall collision, jumping, and gravity.
- Shooting/combat systems are not implemented yet.
- Project mission statement (intent, non-behavioral specs, UI guidelines): [MISSION_STATEMENT.md](MISSION_STATEMENT.md)
- Copilot default feature workflow instructions: [.github/copilot-instructions.md](.github/copilot-instructions.md)
- AI feature orchestration workflow docs: [.github/skills/feature-workflow/README.md](.github/skills/feature-workflow/README.md)
- AI hardening workflow docs: [.github/skills/hardener/README.md](.github/skills/hardener/README.md)
- AI specification workflow docs: [.github/skills/specifier/README.md](.github/skills/specifier/README.md)
- AI implementation workflow docs: [.github/skills/implementer/README.md](.github/skills/implementer/README.md)
- AI cleanup workflow docs: [.github/skills/cleaner/README.md](.github/skills/cleaner/README.md)

