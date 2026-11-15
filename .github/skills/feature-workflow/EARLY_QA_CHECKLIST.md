# Early Runtime QA Checklist

Run this immediately after first runtime integration (before cleaner/hardener):

1. Start game locally (`npm run dev`).
2. Verify the new behavior in-game for the happy path.
3. Verify one nearby negative path (outside trigger/range or disabled state).
4. Verify HUD/UI reflects gameplay state changes correctly.
5. Capture one short note in implementer checkpoints for what was manually validated.

This checkpoint is intentionally lightweight and is meant to catch gameplay semantics issues before expensive hardening runs.
