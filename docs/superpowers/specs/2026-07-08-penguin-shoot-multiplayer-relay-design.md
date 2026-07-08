# Penguin Shoot Multiplayer Relay Design

Date: 2026-07-08
Repository: https://github.com/Ring-wdr/penguin-shoot.git

## Goal

Add a local multi-attempt mode so several people can play one relay-style session on the same device. At game start, the user enters the number of attempts from 1 to 10. Each attempt launches one penguin, and the next attempt starts from the previous attempt's final distance. When all attempts finish, the game shows a ranked result table sorted by score descending.

The feature keeps the current full-screen canvas experience. Setup and results appear as DOM overlays on top of the game instead of replacing the app with a separate menu system.

## Player Experience

When the page opens, the game canvas is visible but blocked by a setup overlay. The overlay asks for the number of attempts and accepts numeric input from 1 through 10. Starting the session hides the overlay and begins `Attempt 1 / N`.

The player aims and launches as before. When the penguin settles, the game records that attempt's score. If more attempts remain, the next penguin starts from the previous final distance. For example, if attempt 1 finishes at 100 m and attempt 2 travels 60 m more, attempt 2's final score is 160 m.

After the final attempt settles, a result overlay appears. The table is sorted by final score descending and uses attempt numbers instead of player names.

## Screen Flow

1. Setup overlay:
   - Numeric input for attempts.
   - Valid range is 1 to 10.
   - Start button begins a session.
2. Gameplay:
   - HUD shows current distance, best distance, and current attempt progress.
   - Existing drag-to-launch controls stay unchanged.
   - Reset restarts the current attempt from that attempt's start distance.
3. Between attempts:
   - When an attempt settles, the result is recorded once.
   - If attempts remain, the game prepares the next attempt at the previous final distance.
4. Final results overlay:
   - Rows show rank, attempt number, start distance, added distance, and final score.
   - Rows are sorted by final score descending.
   - A play-again action returns to the setup overlay.

## Rules And Scoring

- Attempt count must be an integer from 1 to 10.
- Invalid, blank, or out-of-range input should be corrected to the nearest valid count before starting.
- Attempt labels are `Attempt 1`, `Attempt 2`, and so on.
- Each attempt has:
  - `attemptNumber`: 1-based attempt index.
  - `startDistance`: the cumulative distance where this attempt began.
  - `addedDistance`: distance traveled during this attempt.
  - `score`: final cumulative distance for ranking.
- The next attempt's `startDistance` is the previous attempt's `score`.
- Best distance continues to mean the best cumulative distance reached on this browser.

## Technical Architecture

The current code keeps simulation, rendering, input, and HUD concerns mostly separate. The multiplayer feature should preserve that shape by adding a session layer above the existing single-attempt simulation.

### Simulation Changes

`src/simulation/game.ts` should support a configurable cumulative start distance:

- `GameState` gains a `startDistance` or equivalent field.
- `createGameState` keeps its current default behavior with a 0 m start.
- `resetGame` accepts an optional start distance and places the penguin at that cumulative world distance.
- `state.distance` remains the cumulative score shown to the player and stored as best distance.
- Per-attempt added distance is calculated by the session layer as `score - startDistance`.
- `predictTrajectory` starts from the current state's position so the preview remains aligned with the penguin.

The default single-attempt API should remain backward compatible where practical so existing tests and callers do not need unrelated rewrites.

### Session Layer

Add `src/session/multiplayer.ts` for local session state and pure helpers:

- Parse and normalize attempt counts.
- Start a new session with the selected count.
- Record a settled attempt exactly once.
- Determine whether another attempt remains.
- Compute the next attempt's start distance.
- Produce a score-desc sorted result table.

This layer should not depend on Three.js or DOM APIs. It should be easy to test with plain unit tests.

### UI Changes

Extend the DOM in `index.html` with:

- A setup overlay for attempt count input and start action.
- A result overlay with the final ranking table.
- A small HUD field for attempt progress.

`src/ui/hud.ts` can be extended or paired with a small overlay helper module. UI code should keep DOM updates explicit and avoid embedding game rules that belong in the session layer.

### Main Loop Integration

`src/main.ts` coordinates the session and game state:

- On page load, show setup overlay and prevent launching until a session starts.
- On session start, reset the game at the session's current start distance.
- During gameplay, update HUD with attempt progress and current cumulative score.
- When the game reaches `settled`, save best distance and record the attempt once.
- If attempts remain, prepare the next attempt at the previous score.
- If no attempts remain, show the result overlay and block further launches until play-again starts a new session.

## Error Handling And Edge Cases

- Attempt input clamps to 1 through 10.
- Settled attempts must not be recorded repeatedly across animation frames.
- Reset during an attempt should reset only the current attempt, not erase prior completed attempts.
- Play again clears the session results and returns to setup.
- If `localStorage` is unavailable, best-distance fallback behavior remains unchanged.
- WebGL context loss behavior remains unchanged and should hide or disable session interactions if the game shuts down.

## Testing And Verification

Add focused unit coverage for:

- Attempt count normalization.
- Recording attempts with start, added, and final score.
- Next-attempt start distance calculation.
- Result sorting by final score descending.
- Preventing duplicate recording of a settled attempt.

Update existing simulation tests to cover:

- Default 0 m start behavior remains unchanged.
- Resetting to a non-zero start distance places the penguin at the right origin.
- Distance/score math stays consistent after a non-zero start.

Update browser smoke coverage to verify:

- The setup overlay appears at startup.
- Entering an attempt count starts the game.
- Launching and settling advances attempts or shows results.
- The result table appears after the configured number of attempts.

Manual verification should include `npm run test`, `npm run build`, and a Playwright or browser smoke test on desktop-sized and mobile-sized viewports.

## Out Of Scope

- Player names.
- Network multiplayer.
- Online leaderboards.
- Authentication.
- Persisting per-session result tables across page reloads.
- New character assets or major visual redesign.

## Approval Summary

The approved direction is the overlay-based local relay mode. Attempts are identified by attempt number only. Each new attempt starts from the previous attempt's final cumulative distance. Final results are shown in a table sorted by score descending.
