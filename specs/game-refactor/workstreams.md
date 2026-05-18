# Workstreams

## Goal

This document breaks the refactor into subagent-friendly slices with:

- ownership boundaries
- dependency order
- write scopes
- validation commands
- handoff expectations

## Critical Path

The critical path is:

1. constants/types split
2. factories/builders extraction
3. store logic extraction
4. UI selector cleanup

UI work that depends only on selectors can run in parallel after the state interfaces stabilize.

## Workstream Matrix

### WS-01 Constants And Type Decomposition

Owner:

- one agent focused only on `constants/` and `types/`

Primary write scope:

- `src/features/game/constants/*`
- `src/features/game/types/*`
- import sites that must be updated to compile

Responsibilities:

- extract runtime constants out of `types/game.ts`
- split domain types by concern
- ensure type-only imports where applicable
- leave compatibility exports temporarily if needed

Do not change:

- gameplay behavior
- UI structure

Validation:

- `NODE_ENV=production npm run build`

Completion criteria:

- no runtime constants left in the main type aggregation file
- imports compile cleanly

### WS-02 Builders And Factories

Owner:

- one agent focused on construction helpers

Primary write scope:

- `src/features/game/factories/*`
- call sites in `store/game-store.ts`
- `engine/physics.ts` only if projectile creation needs rebasing

Responsibilities:

- move object construction into pure helpers
- standardize construction of mobiles, players, rounds, events, announcements, bonuses

Do not change:

- gameplay outcomes
- UI

Validation:

- `NODE_ENV=production npm run build`

Completion criteria:

- store no longer manually builds large entity objects inline

### WS-03 Movement And Gravity Domain Extraction

Owner:

- one agent responsible for traversal and terrain settling

Primary write scope:

- `src/features/game/engine/movement.ts`
- `src/features/game/engine/gravity.ts`
- `src/features/game/store/game-store.ts`

Responsibilities:

- extract slope traversal logic
- extract post-crater falling/settling logic
- keep behavior deterministic

Do not change:

- combat damage formulas
- history schema

Validation:

- `NODE_ENV=production npm run build`
- manual smoke test: move across slopes, terrain collapse, falling after crater

Completion criteria:

- store delegates movement/gravity logic to pure helpers

### WS-04 Combat, Weapons, And Round Damage Events

Owner:

- one agent responsible for projectile/combat behavior

Primary write scope:

- `src/features/game/engine/weapons.ts`
- `src/features/game/engine/physics.ts`
- `src/features/game/store/game-store.ts`
- optionally `types/combat.ts`

Responsibilities:

- formalize per-mobile weapon profiles
- keep projectile stepping deterministic
- ensure hit application produces structured events

Do not change:

- lobby
- HUD layout

Validation:

- `NODE_ENV=production npm run build`
- manual smoke test: verify each mobile’s weapon profile still feels distinct

Completion criteria:

- projectile creation and damage application use extracted combat helpers

### WS-05 Round Lifecycle And Match Events

Owner:

- one agent focused on round transitions and history/event flow

Primary write scope:

- `src/features/game/store/game-store.ts`
- `src/features/game/engine/rounds.ts`
- `src/features/game/types/events.ts`
- `src/features/game/factories/create-match-event.ts`
- `src/features/game/factories/create-round-state.ts`

Responsibilities:

- extract round transition logic
- extract sudden death timing
- stabilize event append patterns
- preserve history across rounds

Do not change:

- sprite rendering
- audio

Validation:

- `NODE_ENV=production npm run build`
- manual smoke test: round win, next round start, final match end

Completion criteria:

- round progression lives outside the core Zustand body as pure helpers

### WS-06 Selector And UI State Surface Cleanup

Owner:

- one agent focused on UI read paths only

Primary write scope:

- `src/features/game/store/selectors/*`
- `src/features/game/components/*`

Responsibilities:

- extract repeated selectors out of components
- consume new split state/types cleanly
- keep UI bound to stable domain surfaces

Do not change:

- gameplay logic

Validation:

- `NODE_ENV=production npm run build`

Completion criteria:

- components use shared selectors for HUD/history/round info where useful

## Parallelization Guidance

### Safe parallel pairs

- WS-01 and WS-06 can overlap once type names are agreed up front
- WS-03 and WS-04 can overlap if they do not both rewrite the same sections of `game-store.ts` at the same time
- WS-02 can run early and unblock the others

### Unsafe overlap

Avoid running these at the same time without strong coordination:

- WS-03 and WS-05 both heavily editing round/turn flow in `game-store.ts`
- WS-02 and WS-05 both relocating round-state builders simultaneously

## Suggested Agent Ownership

### Agent A

Own:

- WS-01

Reason:

- low behavioral risk
- high unblock value

### Agent B

Own:

- WS-02

Reason:

- construction extraction creates common primitives used by later work

### Agent C

Own:

- WS-03

Reason:

- movement/gravity can be isolated if builders already exist

### Agent D

Own:

- WS-04

Reason:

- weapons/projectiles already form a natural subdomain

### Agent E

Own:

- WS-05

Reason:

- round lifecycle is the most orchestration-heavy and should be handled in one coherent pass

### Agent F

Own:

- WS-06

Reason:

- UI cleanup can land last against stabilized state shapes

## Merge Order

Recommended merge order:

1. WS-01
2. WS-02
3. WS-03 and WS-04
4. WS-05
5. WS-06

## Handoff Checklist For Any Agent

Before an agent marks its work complete, it should state:

1. Which files it owned.
2. Which files it touched outside its owned scope and why.
3. What behavior changed versus what was purely structural.
4. Whether `NODE_ENV=production npm run build` passed.
5. Any blocker left for the next agent.

## Persistence Notes For Later Agents

When introducing persistence later, do not store raw Zustand state as the primary source of truth.

Prefer:

- match metadata row
- round metadata rows
- append-only match event rows
- optional periodic snapshots for resume/recovery

If TimescaleDB is introduced later, the likely first persisted artifact should be `MatchEvent`, because the event model already maps cleanly to time-series ingestion.
