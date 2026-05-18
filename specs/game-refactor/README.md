# Game Refactor Spec

## Purpose

This spec defines the next refactor of the browser Gunbound clone so future agents can execute work in parallel without colliding on the same files or inventing incompatible state shapes.

The immediate goals are:

1. Reduce coupling around `src/features/game/types/game.ts`.
2. Break `src/features/game/store/game-store.ts` into domain modules.
3. Preserve current gameplay while making movement, combat, rounds, and history easier to reason about.
4. Create a clean persistence seam for a later database-backed architecture.

This spec is intentionally written as an implementation handoff, not a high-level idea dump.

## Current Pain Points

### Type concentration

`src/features/game/types/game.ts` currently mixes:

- world constants
- core domain entities
- transient visuals
- UI/session state
- match event history

That is not a runtime performance problem, but it is a modularity problem because every domain imports the same file.

### Store concentration

`src/features/game/store/game-store.ts` currently owns:

- state shape
- match bootstrap
- phase timing
- movement logic
- gravity settling
- damage resolution
- sudden death
- round transition
- event history creation
- bonus spawning and pickup

This is the primary refactor target.

### Runtime/type mixing

Some modules import from `types/game.ts` for both types and runtime constants. That makes the file a central dependency instead of a pure type module.

## Refactor Goals

### Architectural goals

- Separate runtime constants from pure types.
- Separate domain state from visual/transient state.
- Extract state construction into factories/builders.
- Extract store logic into composable pure modules before touching Zustand wiring.
- Preserve deterministic behavior.
- Keep all files kebab-case.
- Keep function declarations only.

### Developer workflow goals

- Allow later agents to own disjoint write scopes.
- Make validation possible per workstream.
- Ensure unfinished work can still be picked up safely.

### Persistence goals

The future persistence model should be event-first:

- append-only match events
- round snapshots
- optional aggregate projections

This aligns well with a later TimescaleDB design, where time-series event ingestion and derived rollups are first-class.

## Target Structure

This is the target module shape after the refactor. It is a direction, not a demand that everything lands in one change.

```text
src/
  features/
    game/
      constants/
        world.ts
        gameplay.ts
      types/
        shared.ts
        entities.ts
        combat.ts
        effects.ts
        events.ts
        state.ts
      factories/
        create-mobile.ts
        create-player.ts
        create-projectile.ts
        create-bonus-box.ts
        create-turn-announcement.ts
        create-match-event.ts
        create-round-state.ts
      engine/
        movement.ts
        gravity.ts
        rounds.ts
        bonuses.ts
        weapons.ts
        physics.ts
        terrain.ts
        collision.ts
        wind.ts
      store/
        game-store.ts
        reducers/
          match-reducer.ts
          movement-reducer.ts
          combat-reducer.ts
          round-reducer.ts
          bonus-reducer.ts
          effects-reducer.ts
        selectors/
          hud-selectors.ts
          match-selectors.ts
          history-selectors.ts
```

## Refactor Strategy

### Principle 1: extract pure logic before moving Zustand wiring

Do not begin by splitting one large Zustand store into many ad hoc hooks. First extract pure functions that accept explicit inputs and return explicit outputs.

### Principle 2: move by domain, not by file size

Do not split files just because they are long. Split them because they mix unrelated responsibilities.

### Principle 3: preserve the event seam

Anything that matters to game progression should eventually produce a structured `MatchEvent`.

### Principle 4: avoid broad renames during behavior changes

If a workstream changes gameplay behavior, it should not also perform wide import churn unless the churn is required for that behavior.

## Domain Boundaries

### Shared primitives

Owns:

- vectors
- simple scalar IDs
- discriminated unions shared everywhere

Should not own:

- top-level game state
- visual effect state
- runtime constants

### Entities

Owns:

- `Mobile`
- `Player`
- `BonusBox`
- projectile/domain entity shapes

Should not own:

- HUD-specific or animation-only state unless the gameplay loop consumes it

### Effects

Owns:

- `ExplosionVisual`
- `DamagePopup`
- `TurnAnnouncement`

Should not own:

- round score
- weapon behavior

### Events

Owns:

- `MatchEventKind`
- `MatchEvent`
- future event payload extensions

This module becomes the bridge to later persistence.

### State

Owns:

- `GameState`
- state slices composed from the domain modules

Should mostly aggregate imported subtypes instead of redefining everything inline.

## Runtime Constants Extraction

Move these first:

- `worldWidth`
- `worldHeight`
- phase durations
- target score default
- sudden death turn default

Reason:

- constants are runtime values and should not live in a types module
- this reduces import pressure on type files

## Builder / Factory Extraction

The codebase already wants factory-style construction more than code generation.

Good candidates:

- `createMobile`
- `createPlayers`
- `createPlayersForRound`
- `createProjectile`
- `createTurnAnnouncement`
- `createMatchEvent`
- `buildNextRoundState`

These should become small, pure construction utilities with no store dependency.

## Store Refactor Plan

### Keep one Zustand store for now

Do not split into multiple Zustand stores in this pass. The game is single-screen, single-match, and tightly coupled enough that one store still makes sense.

### Extract pure reducers/helpers around it

The store should become mostly orchestration:

- read current state
- call pure domain helpers
- commit next state

The extracted modules should handle:

- movement traversal
- gravity settling
- combat application
- bonus spawn/drop/pickup
- round transition
- history append logic

## Future Persistence Seam

This refactor should keep the later TimescaleDB path open.

### Desired persistence model later

- `matches`
- `rounds`
- `match_events`
- optional `state_snapshots`

### Data shape guidance

Later persisted `MatchEvent` rows should ideally include:

- `match_id`
- `round`
- `turn`
- `tick`
- `event_kind`
- `player_id`
- `payload_json`
- `created_at`

### Why TimescaleDB can fit

TimescaleDB makes sense later if you want:

- append-only event ingestion
- replay or audit of matches
- longitudinal analytics on weapon balance, damage, round length, and player actions
- aggregation across many matches over time

Do not add database concerns to runtime modules yet. The goal now is to make the in-memory event seam stable enough that persistence can be layered on later.

## Acceptance Criteria

This refactor is considered successful when:

1. `types/game.ts` is no longer the central import hub for unrelated domains.
2. runtime constants are outside the type module.
3. gameplay construction helpers live in factories/builders.
4. `game-store.ts` is primarily orchestration, not a giant bucket of mixed logic.
5. round flow, movement, combat, and bonus logic are each testable as pure functions.
6. structured match history remains intact across turns and rounds.
7. build remains clean with `NODE_ENV=production npm run build`.

## Non-Goals

These are explicitly not part of this refactor unless a later spec says otherwise:

- backend implementation
- TimescaleDB integration
- multiplayer networking
- replacing Zustand
- major asset pipeline changes
- rewriting the renderer

## Recommended Execution Order

1. constants + type decomposition
2. factories/builders
3. event/history extraction
4. movement + gravity extraction
5. combat + weapon extraction
6. round lifecycle extraction
7. selector/UI cleanup

See `specs/game-refactor/workstreams.md` for the concrete parallel task map.
