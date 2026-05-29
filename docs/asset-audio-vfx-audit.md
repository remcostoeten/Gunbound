# Audio and Attack Asset Audit

## Integrated in this pass

- UI SFX one-shots under `public/audio/ui/`.
- Action-aware UI routing in `src/lib/music-bus.ts`.
- Toast/error/modal cues in lobby/auth surfaces.
- Mobile-specific generated explosion sprite sheets under `public/explodes/generated/`.
- Renderer support for generated attack sheets with procedural VFX as fallback/extra glow.

## Still missing or worth sourcing

- Canonical Gunbound room SFX: ready/unready, room enter/leave, slot change, item shop-like confirm/deny.
- Canonical battle micro-SFX: aim tick, power-meter loop, invalid fire, miss, direct hit, self-hit, kill blow.
- Projectile flight loops by mobile/weapon. Current implementation has launch/impact identity, but not in-flight loops.
- Per-mobile SS startup stingers. The visual patterns exist, but the audio only distinguishes high-power/critical/sudden-death events.
- Result split: round win, match win, loss, draw, GP/gold reward, level-up. Current routing uses the available `win`, `lose`, `gold`, and `level-up` pack sounds but does not yet have separate reward sequencing.
- Map-specific music selection. The BGM set exists, but stage-to-map assignment should be explicit instead of just a stable random battle track.

## Source notes

- The Spriters Resource pack covers voices plus a few generic effects.
- The 101soundboards and Khinsider links are mostly BGM libraries.
- Pixabay is useful as a reference/source candidate for non-canonical UI one-shots, but direct file download was blocked from the shell. The committed UI files are original procedural replacements.

## Recommended next slice

1. Add a battle sound debugger panel that can trigger every cue by name.
2. Wire aim tick, invalid action, miss, kill blow, and reward sequence.
3. Add explicit map-to-track assignment.
4. Replace procedural UI WAVs with curated external assets only if their source URLs and license metadata are stored beside the files.
