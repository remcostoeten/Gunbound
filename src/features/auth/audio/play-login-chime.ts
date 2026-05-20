/**
 * GunBound-style login chime: a short, cheerful arpeggio with a bell-like
 * sparkle on top. Pure Web Audio — no network, no assets.
 */
export function playLoginChime() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);

    // Bright arpeggio: C5 - E5 - G5 - C6 (classic "welcome" hop)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const t = now + i * 0.11;
      const dur = 0.32;

      // Main square-ish lead
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);

      // Bell harmonic two octaves up
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "sine";
      o2.frequency.setValueAtTime(freq * 2, t);
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.18, t + 0.008);
      g2.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
      o2.connect(g2).connect(master);
      o2.start(t);
      o2.stop(t + dur);
    });

    // Final shimmer chord stab (C major)
    const stabAt = now + notes.length * 0.11 + 0.02;
    [523.25, 659.25, 783.99].forEach((freq) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, stabAt);
      g.gain.setValueAtTime(0.0001, stabAt);
      g.gain.exponentialRampToValueAtTime(0.28, stabAt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, stabAt + 0.9);
      o.connect(g).connect(master);
      o.start(stabAt);
      o.stop(stabAt + 0.95);
    });

    setTimeout(() => ctx.close().catch(() => {}), 1800);
  } catch {
    // no-op
  }
}
