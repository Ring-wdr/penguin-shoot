# Penguin Shoot Attempt Camera Transition Design

Date: 2026-07-08

## Goal

When relay mode advances to the next attempt, move the camera smoothly from the previous settled position to the next attempt's starting position so the penguin lands on the left side of the view instead of appearing after a hard camera jump.

## Approved Behavior

- On attempt transition, the simulation may reset the penguin immediately to the next cumulative start distance.
- The camera moves from its current `x` position to the normal target camera position for that penguin position.
- The target camera position continues to use the existing `calculateCameraTargetX` framing, preserving the current left-side penguin composition.
- The transition uses a short ease-out motion, around 520 ms.
- Player input is blocked while the transition is active so aiming does not compete with camera motion.
- If the user has `prefers-reduced-motion: reduce`, the camera snaps immediately.

## Implementation Notes

- Keep camera motion in `src/render/world.ts`, close to the camera state it controls.
- Expose small render-world methods for starting and checking a camera transition.
- Keep `src/main.ts` responsible for calling the transition after moving to the next attempt and for gating input while the transition is active.
- Test the pure interpolation/easing helpers and the main input gate.

## Verification

- Unit tests should cover ease-out interpolation and reduced-motion snap behavior.
- Main integration tests should cover that the next attempt blocks launching until the camera transition completes.
- Full verification remains `npm run test`, `npm run build`, and `npm run test:e2e`.
