export function playThud() {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = "sine";
    o1.frequency.setValueAtTime(160, now);
    o1.frequency.exponentialRampToValueAtTime(40, now + 0.18);
    g1.gain.setValueAtTime(0.6, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    o1.connect(g1).connect(ctx.destination);
    o1.start(now); o1.stop(now + 0.26);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const n = ctx.createBufferSource();
    n.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.25, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    n.connect(ng).connect(ctx.destination);
    n.start(now);
    setTimeout(() => ctx.close(), 400);
  } catch {}
}
