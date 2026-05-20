# Changelog

## Unreleased

### Added — new mobile roster (Mage, Nak, Turtle, Frog, Sate)
- Five new playable mobiles wired through types, presentation, weapon profiles, factory, sprite sources, canvas cache, SFX router, and the mount debug view.
- Generated 64×64 4-frame sprite atlases from high-res source sheets via `scripts/prepare-mobile-asset.py`.

### Added — per-mobile muzzle anchors
- `getMuzzlePosition` in `physics.ts` now uses per-mobile cannon height fractions and reach distances instead of a shared offset, so shots spawn from the correct position on each sprite.

### Added — per-mobile projectile visuals
- `getProjectileStyle` in `game-canvas.tsx` extended with distinct colours for all 11 mobiles:
  Mage → violet, Nak → amber, Turtle → deep green, Frog → lime, Sate → steel blue.

### Added — Frog bounce-damage mechanic
- Frog primary now bounces (like secondary) and deals partial impact damage at every bounce point via `bonusExplosion` in `ProjectileStep`. Both weapons get multi-hit behaviour.

### Added — Mage secondary splitter
- Mage secondary generates a twin explosion on terrain impact: two smaller blasts offset ±22 px horizontally, each at 65 % damage and 80 % blast radius. Uses `weapon` field added to `ExplosionState`.

### Added — Nak burrowing mechanic
- Nak primary enters a 22-tick tunnel on first terrain contact (ignores collision while tunneling), then explodes when it exits. Tracked via `tunnelingTicks` on `ProjectileState`.

### Infrastructure
- GitHub repo created: https://github.com/remcostoeten/gunbound
- Topics: gunbound · nextjs · typescript · spacetimedb · multiplayer · canvas · game · artillery · turn-based

---

## TODO

- [ ] Audio — per-mobile fire sounds with distinct timbre (Mage airy, Frog wet ploop, Nak drill buzz)
- [ ] Aduko / Trico animated sprite sheets wired to generated atlases
- [ ] Snow mobile updated to new 8-frame source sheet
- [ ] Pink rider mount offset tuning via debug view
- [ ] Lady character sprite integrated as a third rider option
- [ ] SpacetimeDB multiplayer: reducer wiring for new MobileType members
- [ ] Mobile-specific passive traits (Turtle shell damage reduction, Nak underground immunity)
- [ ] Map pool expansion: at least one water/ocean map to favour Sate theming
- [ ] Replay system (record inputs per turn, replay from seed)
