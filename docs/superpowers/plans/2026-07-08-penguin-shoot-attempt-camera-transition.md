# Penguin Shoot Attempt Camera Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smoothly move the camera to the next relay attempt start position so the penguin is framed on the left before the player launches.

**Architecture:** Add camera transition state to `src/render/world.ts`, expose methods for starting and querying the transition, and have `src/main.ts` block input while that transition is active.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright.

---

## Tasks

- [ ] Add pure camera interpolation tests and helpers in `src/render/world.test.ts` and `src/render/world.ts`.
- [ ] Add `transitionCameraToPenguin` and `isCameraTransitioning` to `RenderWorld`.
- [ ] Call the transition after advancing to the next relay attempt in `src/main.ts`.
- [ ] Add a `main.test.ts` integration test that blocks launch while the camera transition is active.
- [ ] Run `npm run test`, `npm run build`, and `npm run test:e2e`.
