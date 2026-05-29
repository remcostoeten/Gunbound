# Per-mobile explosion art — optional bespoke sprites

Explosions are **drawn procedurally** at runtime (`drawProceduralExplosion` in
`src/features/game/components/game-canvas.tsx`), keyed by each mobile's motif/palette
in `src/features/game/engine/mobile-attacks.ts`. No image assets are required — every
mobile already has a distinct impact.

This doc is only for upgrading a mobile to **bespoke sprite-sheet art** (e.g. matching the
original Gunbound frames). It contains: (1) image-gen prompts you can paste into an AI tool,
and (2) the 3-step wiring to swap a sheet in for the procedural version.

## How to generate good frames

AI image generators are weak at producing a single, evenly-spaced, transparent multi-frame
strip. Generate **one frame at a time** (or use a tool's sheet/spritesheet mode), then
assemble the frames left-to-right into one horizontal PNG with `scripts/prepare-mobile-asset.py`
or any sheet packer. Aim for **10–16 frames**, square frames (e.g. 128×128), fully
**transparent background**, centered burst.

Shared prompt prefix (paste before each mobile's line):

> Pixel-art explosion animation frame for a 2000s artillery game (Gunbound style),
> single centered burst on a fully transparent background, no ground, no text, no border,
> square 128×128, crisp hard-edged shading, additive/glowing highlights, frame {N} of 12
> showing the burst at {early flash / mid expansion / late dissipating smoke}.

Then append the per-mobile line below.

## Per-mobile prompts

| Mobile | SS name | Motif | Prompt suffix |
|---|---|---|---|
| **armor**  | Siege Barrage  | fire   | "a heavy orange-yellow fireball with thick black smoke, flying metal shell fragments and warm embers, palette #fff2b8 core / #ffb33d ring / #ff9f38 sparks." |
| **knight** | Sky Lance      | blade  | "a clean cyan-white energy slash burst with crossed blade arcs and sharp light streaks, palette #ffffff core / #9bdcff ring / #aee6ff edges." |
| **dragon** | Drake Descent  | fire   | "a fierce red-and-gold draconic flame bloom with curling fire tongues and crimson smoke, palette #ffe08a core / #ff412f ring / #ff4d35 sparks." |
| **snow**   | Avalanche      | frost  | "a white-blue frost shatter with radiating ice spikes, snow powder and pale sparkles, palette #ffffff core / #bdf4ff ring / #c9f7ff shards." |
| **trico**  | Triple Horn    | horn   | "a gold-and-violet pointed star burst (10–12 sharp points) like a spiked impact star, palette #fff0a0 core / #ffd84f ring / #d77fff accents." |
| **aduko**  | Thunder Spear  | spark  | "an electric green-cyan lightning detonation with jagged forking bolts radiating outward, palette #eaffe9 core / #9cff7e ring / #62e0ff bolts." |
| **mage**   | Arcane Split   | rune   | "a purple-cyan arcane rune burst with a glowing magic circle ring and scattered glyph sparks, palette #f7eaff core / #9b77ff ring / #58e3ff sparks." |
| **nak**    | Burrow Erupt   | dust   | "a brown earth eruption with a dust dome, flying dirt clods and drill debris, palette #ffe0a6 core / #c98b45 ring / #5f4636 debris." |
| **turtle** | Triad Shell    | shell  | "a green carapace-shard burst with chunky cracked shell fragments and a jade flash, palette #cafad7 core / #54d184 ring / #143d32 shards." |
| **frog**   | Skip Bombard   | bubble | "a lime-green goo splatter with expanding bubbles and dripping slime, palette #eaffb3 core / #7df36e ring / #4ee8c2 bubbles." |
| **sate**   | Sonar Storm    | sonar  | "a blue sonar detonation with several concentric expanding rings and a bright pulse core, palette #effbff core / #55c7ff ring / #68d0ff pulses." |

## Wiring a finished sheet in (3 steps)

1. Drop the assembled strip into `public/explodes/`, e.g. `public/explodes/armor-siege.png`.
2. Register it in `explosionSpriteSpecs` (top of `game-canvas.tsx`) with its frame count and
   pixel dimensions, and add the key to the `ExplosionSpriteSheet` union in
   `src/features/game/types/effects.ts`.
3. In `drawProceduralExplosion`, render the sheet for that motif instead of the procedural
   path — the sheet-drawing helper that shipped before (frame = `floor(progress * frames)`,
   additive `screen` blend) is preserved in git history; restore it and gate it on
   `sprite.style.motif === "<motif>"`, falling back to procedural for the rest. The 7 legacy
   sheets are still preloaded via `loadExplosionSprites`, so this path is ready to use.

The procedural renderer stays the default and the guaranteed-present fallback, so partial
art coverage (some mobiles bespoke, others procedural) works fine.
