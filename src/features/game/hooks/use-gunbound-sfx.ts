"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/features/game/store/game-store";

type AudioPool = {
  context: AudioContext | null;
  gain: GainNode | null;
  musicGain: GainNode | null;
  bgMusic: HTMLAudioElement | null;
  sounds: Record<string, HTMLAudioElement>;
};

const SOUND_PATHS: Record<string, string> = {
  "super-shot": "/sounds/super-shot.mp3",
  great: "/sounds/great.mp3",
  "muy-bien": "/sounds/muy-bien.mp3",
  adios: "/sounds/adios.mp3",
  bien: "/sounds/bien.mp3",
  hola: "/sounds/hola.mp3",
  gracias: "/sounds/gracias.mp3",
  ayuda: "/sounds/ayuda.mp3",
  "dios-mio": "/sounds/dios-mio.mp3",
  noobie: "/sounds/noobie.mp3",
};

export function useGunboundSfx(): void {
  const poolRef = useRef<AudioPool>({
    context: null,
    gain: null,
    musicGain: null,
    bgMusic: null,
    sounds: {},
  });
  const prevSceneRef = useRef<string>("");
  const lobbyStartedRef = useRef(false);
  const chargeStateRef = useRef(false);
  const projectileStateRef = useRef(false);
  const turnRef = useRef<1 | 2 | null>(null);
  const explosionTimerRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    function unlockAudio(): void {
      ensureAudio(poolRef.current);
      initSounds(poolRef.current);
    }
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    function frame(): void {
      syncAudioState(poolRef.current, prevSceneRef, lobbyStartedRef, chargeStateRef, projectileStateRef, turnRef, explosionTimerRef);
      rafRef.current = window.requestAnimationFrame(frame);
    }
    rafRef.current = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafRef.current);
      stopMusic(poolRef.current);
    };
  }, []);

  useEffect(() => {
    function onInteraction(): void {
      const pool = poolRef.current;
      if (!lobbyStartedRef.current && pool.sounds["super-shot"]) {
        startLobbyMusic(pool);
        lobbyStartedRef.current = true;
      }
    }
    window.addEventListener("pointerdown", onInteraction, { once: true });
    window.addEventListener("keydown", onInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
    };
  }, []);

  function initSounds(pool: AudioPool): void {
    if (Object.keys(pool.sounds).length > 0) return;
    for (const [key, path] of Object.entries(SOUND_PATHS)) {
      const audio = new Audio(path);
      audio.preload = "auto";
      pool.sounds[key] = audio;
    }
  }
}

function ensureAudio(pool: AudioPool): void {
  if (pool.context !== null && pool.gain !== null) {
    if (pool.context.state === "suspended") {
      void pool.context.resume();
    }
    return;
  }

  const context = new window.AudioContext();
  const gain = context.createGain();
  gain.gain.value = 0.14;
  gain.connect(context.destination);

  const musicGain = context.createGain();
  musicGain.gain.value = 0.08;
  musicGain.connect(context.destination);

  pool.context = context;
  pool.gain = gain;
  pool.musicGain = musicGain;
}

function stopMusic(pool: AudioPool): void {
  if (pool.bgMusic) {
    pool.bgMusic.pause();
    pool.bgMusic.currentTime = 0;
  }
}

function startLobbyMusic(pool: AudioPool): void {
  if (pool.bgMusic) {
    pool.bgMusic.pause();
    pool.bgMusic = null;
  }
  const audio = new Audio("/sounds/lounge.mp3");
  audio.loop = true;
  audio.volume = 0.12;
  audio.play().catch(() => {});
  pool.bgMusic = audio;
}

function playSfx(pool: AudioPool, name: string): void {
  if (!pool.sounds[name]) return;
  const clone = pool.sounds[name].cloneNode() as HTMLAudioElement;
  clone.volume = name === "super-shot" ? 0.3 : 0.25;
  clone.play().catch(() => {});
}

function syncAudioState(
  pool: AudioPool,
  prevSceneRef: React.MutableRefObject<string>,
  lobbyStartedRef: React.MutableRefObject<boolean>,
  chargeStateRef: React.MutableRefObject<boolean>,
  projectileStateRef: React.MutableRefObject<boolean>,
  turnRef: React.MutableRefObject<1 | 2 | null>,
  explosionTimerRef: React.MutableRefObject<number>
): void {
  const state = useGameStore.getState();
  const context = pool.context;
  const gain = pool.gain;

  if (context === null || gain === null) return;

  if (state.scene === "playing" && prevSceneRef.current === "start") {
    stopMusic(pool);
    playSfx(pool, "super-shot");
  }

  if (state.scene === "end" && prevSceneRef.current !== "end") {
    playSfx(pool, "adios");
  }

  if (state.scene === "start" && prevSceneRef.current === "end") {
    if (!lobbyStartedRef.current) {
      startLobbyMusic(pool);
      lobbyStartedRef.current = true;
    }
  }

  prevSceneRef.current = state.scene;

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
