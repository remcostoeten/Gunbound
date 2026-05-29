import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const sampleRate = 44100;
const outDir = "public/audio/ui";

mkdirSync(outDir, { recursive: true });

const sounds = {
  "ui-click-soft.wav": [
    tone({ frequency: 920, duration: 0.055, volume: 0.18, type: "sine" }),
    noise({ duration: 0.035, volume: 0.035, cutoff: 0.35 })
  ],
  "ui-click-primary.wav": [
    tone({ frequency: 360, duration: 0.07, volume: 0.12, type: "triangle" }),
    tone({ frequency: 720, duration: 0.09, volume: 0.16, delay: 0.025, type: "sine" })
  ],
  "ui-confirm.wav": [
    tone({ frequency: 523.25, duration: 0.09, volume: 0.12, type: "triangle" }),
    tone({ frequency: 659.25, duration: 0.1, volume: 0.13, delay: 0.075, type: "triangle" }),
    tone({ frequency: 783.99, duration: 0.12, volume: 0.12, delay: 0.15, type: "sine" })
  ],
  "ui-select.wav": [
    tone({ frequency: 660, duration: 0.045, volume: 0.11, type: "square" }),
    tone({ frequency: 990, duration: 0.055, volume: 0.08, delay: 0.035, type: "sine" })
  ],
  "ui-open.wav": [
    sweep({ from: 280, to: 720, duration: 0.16, volume: 0.11, type: "triangle" }),
    tone({ frequency: 1080, duration: 0.06, volume: 0.06, delay: 0.115, type: "sine" })
  ],
  "ui-close.wav": [
    sweep({ from: 700, to: 260, duration: 0.13, volume: 0.11, type: "triangle" }),
    noise({ duration: 0.045, volume: 0.025, delay: 0.05, cutoff: 0.28 })
  ],
  "ui-notify.wav": [
    tone({ frequency: 880, duration: 0.09, volume: 0.11, type: "sine" }),
    tone({ frequency: 1174.66, duration: 0.12, volume: 0.11, delay: 0.08, type: "sine" })
  ],
  "ui-error.wav": [
    tone({ frequency: 220, duration: 0.11, volume: 0.13, type: "saw" }),
    tone({ frequency: 164.81, duration: 0.13, volume: 0.12, delay: 0.095, type: "square" })
  ],
  "ui-denied.wav": [
    noise({ duration: 0.05, volume: 0.04, cutoff: 0.18 }),
    tone({ frequency: 180, duration: 0.15, volume: 0.1, delay: 0.02, type: "triangle" })
  ]
};

for (const [file, layers] of Object.entries(sounds)) {
  writeFileSync(join(outDir, file), encodeWav(mix(layers)));
}

function tone({ frequency, duration, volume, delay = 0, type }) {
  const length = Math.ceil((duration + delay) * sampleRate);
  const data = new Float32Array(length);
  const delaySamples = Math.floor(delay * sampleRate);
  const durationSamples = Math.max(1, Math.floor(duration * sampleRate));

  for (let index = 0; index < durationSamples; index += 1) {
    const t = index / sampleRate;
    const phase = t * frequency;
    const envelope = percEnvelope(index / durationSamples);
    data[index + delaySamples] = oscillator(phase, type) * volume * envelope;
  }

  return data;
}

function sweep({ from, to, duration, volume, delay = 0, type }) {
  const length = Math.ceil((duration + delay) * sampleRate);
  const data = new Float32Array(length);
  const delaySamples = Math.floor(delay * sampleRate);
  const durationSamples = Math.max(1, Math.floor(duration * sampleRate));
  let phase = 0;

  for (let index = 0; index < durationSamples; index += 1) {
    const p = index / durationSamples;
    const frequency = from + (to - from) * easeOutCubic(p);
    phase += frequency / sampleRate;
    data[index + delaySamples] = oscillator(phase, type) * volume * percEnvelope(p);
  }

  return data;
}

function noise({ duration, volume, delay = 0, cutoff }) {
  const length = Math.ceil((duration + delay) * sampleRate);
  const data = new Float32Array(length);
  const delaySamples = Math.floor(delay * sampleRate);
  const durationSamples = Math.max(1, Math.floor(duration * sampleRate));
  let last = 0;

  for (let index = 0; index < durationSamples; index += 1) {
    const raw = Math.random() * 2 - 1;
    last = last + (raw - last) * cutoff;
    data[index + delaySamples] = last * volume * percEnvelope(index / durationSamples);
  }

  return data;
}

function oscillator(phase, type) {
  const p = phase - Math.floor(phase);
  if (type === "square") return p < 0.5 ? 1 : -1;
  if (type === "saw") return p * 2 - 1;
  if (type === "triangle") return 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25));
  return Math.sin(Math.PI * 2 * p);
}

function percEnvelope(progress) {
  const attack = Math.min(1, progress / 0.08);
  const decay = Math.pow(1 - progress, 1.9);
  return attack * decay;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function mix(layers) {
  const length = Math.max(...layers.map((layer) => layer.length));
  const output = new Float32Array(length);

  for (const layer of layers) {
    for (let index = 0; index < layer.length; index += 1) {
      output[index] += layer[index];
    }
  }

  let peak = 0;
  for (const sample of output) {
    peak = Math.max(peak, Math.abs(sample));
  }

  const gain = peak > 0.95 ? 0.95 / peak : 1;
  for (let index = 0; index < output.length; index += 1) {
    output[index] *= gain;
  }

  return output;
}

function encodeWav(samples) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + index * bytesPerSample);
  }

  return buffer;
}
