"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/features/game/store/game-store";

type AudioHandles = {
  context: AudioContext | null;
  gain: GainNode | null;
};

export function useSfx(): void {
  const audioRef = useRef<AudioHandles>({
    context: null,
    gain: null
  });
  const chargeStateRef = useRef(false);
  const projectileStateRef = useRef(false);
  const turnRef = useRef<1 | 2 | null>(null);
  const explosionTimerRef = useRef(0);
  const rafRef = useRef(0);
  useEffect(bindAudioBootstrap, []);
  useEffect(startPolling, []);

  function bindAudioBootstrap(): CleanupHandler {
    function unlockAudio(): void {
      ensureAudio(audioRef.current);
    }

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);

    return function cleanup(): void {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }

  function startPolling(): CleanupHandler {
    function frame(): void {
      syncAudioState(audioRef.current, chargeStateRef, projectileStateRef, turnRef, explosionTimerRef);
      rafRef.current = window.requestAnimationFrame(frame);
    }

    rafRef.current = window.requestAnimationFrame(frame);

    return function cleanup(): void {
      window.cancelAnimationFrame(rafRef.current);
    };
  }
}

type CleanupHandler = {
  (): void;
};

function ensureAudio(handles: AudioHandles): void {
  if (handles.context !== null && handles.gain !== null) {
    if (handles.context.state === "suspended") {
      void handles.context.resume();
    }
    return;
  }

  const context = new window.AudioContext();
  const gain = context.createGain();
  gain.gain.value = 0.14;
  gain.connect(context.destination);
  handles.context = context;
  handles.gain = gain;
}

function syncAudioState(
  handles: AudioHandles,
  chargeStateRef: React.MutableRefObject<boolean>,
  projectileStateRef: React.MutableRefObject<boolean>,
  turnRef: React.MutableRefObject<1 | 2 | null>,
  explosionTimerRef: React.MutableRefObject<number>
): void {
  const state = useGameStore.getState();
  const context = handles.context;
  const gain = handles.gain;

  if (context === null || gain === null) {
    return;
  }

  if (state.charging && !chargeStateRef.current) {
    playChargeStart(context, gain);
  }

  if (!state.charging && chargeStateRef.current) {
    playChargeRelease(context, gain);
  }

  if (state.projectile !== null && !projectileStateRef.current) {
    playShotFire(context, gain, state.projectile.weapon === "secondary");
  }

  if (state.explosionVisual !== null && state.explosionVisual.timer > explosionTimerRef.current) {
    playExplosion(context, gain, state.explosionVisual.radius);
  }

  if (state.turnAnnouncement !== null && state.turn !== turnRef.current) {
    playTurnCue(context, gain, state.turn);
  }

  chargeStateRef.current = state.charging;
  projectileStateRef.current = state.projectile !== null;
  turnRef.current = state.turn;
  explosionTimerRef.current = state.explosionVisual === null ? 0 : state.explosionVisual.timer;
}

function playChargeStart(context: AudioContext, gain: GainNode): void {
  playOscillatorSweep(context, gain, 320, 620, 0.16, "square", 0.18);
}

function playChargeRelease(context: AudioContext, gain: GainNode): void {
  playOscillatorSweep(context, gain, 540, 420, 0.08, "triangle", 0.12);
}

function playShotFire(context: AudioContext, gain: GainNode, isSecondary: boolean): void {
  playOscillatorSweep(context, gain, isSecondary ? 220 : 300, isSecondary ? 90 : 120, 0.18, "sawtooth", 0.24);
  playNoiseBurst(context, gain, 0.08, 0.12);
}

function playExplosion(context: AudioContext, gain: GainNode, radius: number): void {
  playNoiseBurst(context, gain, 0.24, 0.28);
  playOscillatorSweep(context, gain, 150 + radius, 55, 0.28, "triangle", 0.2);
}

function playTurnCue(context: AudioContext, gain: GainNode, turn: 1 | 2): void {
  const base = turn === 1 ? 520 : 460;
  playTone(context, gain, base, 0.08, "triangle", 0.12, 0);
  playTone(context, gain, base * 1.22, 0.11, "triangle", 0.1, 0.09);
}

function playTone(
  context: AudioContext,
  gain: GainNode,
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  delay: number
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const start = context.currentTime + delay;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(volume, start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(envelope);
  envelope.connect(gain);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function playOscillatorSweep(
  context: AudioContext,
  gain: GainNode,
  startFrequency: number,
  endFrequency: number,
  duration: number,
  type: OscillatorType,
  volume: number
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const start = context.currentTime;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), end);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(volume, start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(envelope);
  envelope.connect(gain);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function playNoiseBurst(context: AudioContext, gain: GainNode, duration: number, volume: number): void {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const channel = buffer.getChannelData(0);
  let index = 0;

  while (index < channel.length) {
    channel[index] = (Math.random() * 2 - 1) * (1 - index / channel.length);
    index += 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const start = context.currentTime;
  const end = start + duration;

  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, start);
  envelope.gain.setValueAtTime(volume, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(gain);
  source.start(start);
  source.stop(end + 0.02);
}
