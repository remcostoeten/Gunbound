export function playEngine() {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(80, now);
    o.frequency.exponentialRampToValueAtTime(520, now + 0.7);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.35, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1200;
    o.connect(lp).connect(g).connect(ctx.destination);
    o.start(now); o.stop(now + 0.8);
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}
