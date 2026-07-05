# Penguin Shoot Prototype Design

Date: 2026-07-05
Repository: https://github.com/Ring-wdr/penguin-shoot.git

## Goal

Build a fast, stable Three.js prototype of a 2.5D penguin launching game. The first version should make the core loop feel playable: drag the penguin backward, release to launch, watch it fly and bounce, record the traveled distance, then try again.

The prototype prioritizes launch feel, readable trajectory feedback, camera follow, landing feedback, and restart speed. It does not include obstacles, coins, upgrades, level progression, or complex rigid-body physics.

## Player Experience

The player starts directly in the game screen. A penguin sits on a launcher near the left side of an icy track. The player clicks or touches near the penguin, drags backward to set launch direction and power, then releases. The penguin launches in the opposite direction of the drag.

During aiming, the game shows a clear launch vector and dotted trajectory preview. During flight, the camera follows the penguin while a compact HUD shows current distance and best distance. When the penguin lands and slows down, the result is locked in and the player can restart immediately.

## Core Loop

1. Aim by dragging backward from the penguin.
2. Read the power, direction, and predicted arc.
3. Release to launch.
4. Watch the penguin fly, land, bounce, and slide.
5. Save the distance if it beats the previous best.
6. Reset and try again.

## Controls

Controls should feel like a mobile-friendly Angry Birds-style launch.

- Pointer input covers mouse, touch, and pen through browser pointer events.
- The drag start area is larger than the penguin mesh so mobile users do not need pixel-perfect input.
- Drag direction sets launch angle. Drag distance sets launch power.
- Launch power is clamped to a fixed maximum.
- The game area prevents page scrolling while the user is actively dragging to aim.
- A reset button is available in the HUD after launch and after settling.

## Camera And View

The game uses a 2.5D side view. Simulation happens mostly on an `x/y` plane: `x` is forward distance and `y` is height. The `z` axis is used only for visual depth, object thickness, and background composition.

The camera starts focused on the launcher. After launch, it follows the penguin horizontally while keeping the ground and forward path readable. The view should work on desktop and mobile browser sizes without requiring UI panels around the playfield.

## Visual Direction

The first prototype uses simple Three.js geometry rather than imported character assets.

- Penguin: simple sphere and capsule-like primitive composition with black, white, and orange materials.
- Launcher: compact icy slingshot structure with a visible elastic band while aiming.
- Ground: long icy track with distance markers.
- Background: sparse 3D snowfield and iceberg silhouettes for depth.
- Feedback: dotted arc preview while aiming, short landing impact effect, and result state in the HUD.

The game screen is the first screen. There is no landing page.

## Technical Architecture

Use Vite, TypeScript, and plain Three.js. Keep gameplay state outside Three.js objects. The render scene is an adapter over simulation state.

Recommended source layout:

- `src/main.ts`: app bootstrap, fixed update loop connection, lifecycle wiring.
- `src/simulation/`: launch state, penguin position and velocity, gravity, bounce, friction, distance calculation, state transitions.
- `src/render/`: Three.js renderer, scene, camera, lights, object factories, trajectory preview, resize handling.
- `src/input/`: pointer drag tracking, touch-safe drag behavior, aim vector calculation.
- `src/ui/`: DOM HUD, best distance persistence, reset button behavior.
- `src/styles.css`: full-screen canvas layout and compact HUD styling.

The first prototype should not add Rapier. A small deterministic 2D simulation is enough for launch, gravity, bounce, and friction. Rapier can be introduced later if the game adds obstacle collision or stacked structures.

## Game State

The prototype starts with three explicit states:

- `aiming`: penguin is at the launcher, input can update aim vector and trajectory preview.
- `flying`: simulation advances every frame, camera follows, distance updates live.
- `settled`: penguin has landed and slowed enough to finalize the run.

A reset returns the game to `aiming`, restores the penguin to the launcher, clears transient effects, and keeps the best distance.

## Data Flow

Pointer events update an input model. The input model produces an aim vector while the game is in `aiming`. On release, that aim vector becomes initial velocity in simulation state. Each animation frame advances simulation, then render reads simulation state and updates meshes, camera, trajectory visibility, and HUD text.

Best distance persists in `localStorage`. If storage is unavailable, the game should continue with an in-memory best score for the current session.

## Error Handling And Resilience

- Resize events update camera projection and renderer dimensions.
- WebGL context loss should show a lightweight DOM message if the browser emits the event.
- Pointer cancellation should clear active drag state without launching unexpectedly.
- `localStorage` reads and writes should be wrapped so private browsing or storage errors do not break gameplay.

## Testing And Verification

For the prototype, verification focuses on build and browser behavior:

- `npm run build` must complete successfully.
- Desktop browser smoke test: drag, release, flight, settle, best distance, reset.
- Mobile-width browser smoke test: touch-style drag does not scroll the page during aiming, HUD remains readable, reset is reachable.
- Visual sanity check: canvas is nonblank, camera follows the penguin, trajectory preview and distance markers are visible.

## Out Of Scope For First Prototype

- Imported GLB character assets.
- Rapier or full rigid-body physics.
- Obstacles, destructible structures, coins, upgrades, or missions.
- Multiplayer, leaderboards, backend services, or authentication.
- Complex menus, settings, or onboarding screens.

## Approval Summary

The approved direction is a distance-record prototype with a 2.5D side view and Angry Birds-style drag launch. The main success condition is a stable, replayable launch loop that feels good on both desktop and mobile browsers.
