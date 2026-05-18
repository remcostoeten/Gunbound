# Agent Instructions

## Purpose

This file defines the next modular presentation phase for the local Gunbound client after the gameplay refactor.

The priority is to improve feel without re-centralizing logic in `src/features/game/store/game-store.ts` or changing gameplay outcomes.

## Global Rules

- Preserve gameplay behavior.
- Keep files kebab-case.
- Use strict TypeScript.
- No `any`.
- Function declarations only.
- No code comments.
- Prefer type-only imports where possible.
- Do not do unrelated cleanup.
- Do not revert unrelated local changes.

## Presentation Architecture

- Keep gameplay state authoritative in the store.
- Move presentation-only logic into pure helpers under `src/features/game/engine/`.
- Add focused presentation types under `src/features/game/types/` when a domain surface needs to be shared.
- Let React components consume stable helpers instead of owning large inline effect or camera calculations.
- Prefer incremental compatibility over broad rewrites.

## Workstreams

### WS-07 Camera And Framing

Primary scope:

- `src/features/game/engine/camera.ts`
- `src/features/game/components/game-canvas.tsx`
- `src/features/game/types/presentation.ts` only if needed

Goals:

- extract camera target selection into pure helpers
- support player focus, projectile follow, impact framing, and overview framing
- support deterministic shake composition
- clamp camera movement within world bounds
- keep all camera changes presentation-only

Do not change:

- gameplay simulation
- damage formulas
- state transitions

Validation:

- `NODE_ENV=production npm run build`
- manual smoke test: turn start framing, projectile follow, explosion framing

### WS-08 Visual Effects Extraction

Primary scope:

- `src/features/game/engine/effects.ts`
- `src/features/game/components/game-canvas.tsx`
- optional focused factory files under `src/features/game/factories/`

Goals:

- move transient particle/effect spawning and ticking out of the canvas component
- standardize effect update inputs and outputs
- keep rendering data separate from gameplay state

Do not change:

- hit resolution
- history schema

Validation:

- `NODE_ENV=production npm run build`
- manual smoke test: muzzle flash, debris, dust, bounce sparks, smoke

### WS-09 Audio Event Pipeline

Primary scope:

- `src/features/game/engine/audio-events.ts`
- `src/features/game/hooks/use-gunbound-sfx.ts`

Goals:

- derive sound cues from stable gameplay and presentation events
- prevent duplicate or frame-dependent triggers
- make sound routing easier to extend

Do not change:

- match rules
- UI structure

Validation:

- `NODE_ENV=production npm run build`
- manual smoke test: charge, fire, bounce, hit, explosion, round end

### WS-10 Terrain Theme And Impact Polish

Primary scope:

- `src/features/game/engine/terrain.ts`
- `src/features/game/engine/terrain-theme.ts`
- `src/features/game/components/game-canvas.tsx`
- `src/features/game/constants/` if theme constants are needed

Goals:

- formalize terrain visual themes
- improve crater and impact presentation
- keep collision and terrain deformation logic unchanged

Do not change:

- terrain collision rules
- movement behavior

Validation:

- `NODE_ENV=production npm run build`
- manual smoke test: crater readability, impact response, theme consistency

### WS-11 Lobby And Character Presentation

Primary scope:

- `src/features/game/components/*`
- `src/app/globals.css`

Goals:

- improve character identity and match anticipation
- strengthen lobby feedback and turn-to-turn readability
- keep structure compatible with the existing UI surface

Do not change:

- lobby flow behavior
- store shape unless a presentation selector is needed

Validation:

- `NODE_ENV=production npm run build`
- manual smoke test: lobby start flow, end flow, HUD readability
