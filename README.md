# Minimal Browser FPS (TypeScript + Vite + Three.js)

A minimal first-person browser game starter built with TypeScript, Vite, and Three.js.

## Features

- 3D scene with:
  - Floor
  - Outer walls
  - Inner walls
- First-person controls:
  - `W`, `A`, `S`, `D` to move
  - Mouse to look around
  - Pointer lock on click
- Simple on-screen HUD/instructions and a crosshair

## Tech Stack

- [Vite](https://vitejs.dev/) for dev server/build
- [TypeScript](https://www.typescriptlang.org/)
- [Three.js](https://threejs.org/)

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

## Controls

- Click in the game window to lock the mouse
- Move with `W`, `A`, `S`, `D`
- Look with the mouse
- Press `Esc` to unlock the mouse

## Project Structure

- `index.html` – app shell and overlay UI
- `src/main.ts` – scene setup, world geometry, controls, and game loop
- `src/style.css` – basic styling for HUD/crosshair
- `tsconfig.json` – TypeScript configuration
- `package.json` – scripts and dependencies

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

- This is intentionally minimal: no collision, gravity, jumping, or shooting yet.
- A natural next step is adding wall collision so the player cannot move through walls.
