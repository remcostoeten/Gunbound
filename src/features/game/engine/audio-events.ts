import type { GameState } from "@/features/game/types/state";
import type { MatchEvent } from "@/features/game/types/events";
import type { MobileType, PlayerId, WeaponType } from "@/features/game/types/shared";

export type AudioEventTracker = {
  previousScene: GameState["scene"];
  charging: boolean;
  projectileActive: boolean;
  turn: PlayerId | null;
  explosionTimer: number;
  historyLength: number;
  windBucket: number;
  lowHealthWarned: [boolean, boolean];
  previousBounces: number;
  previousWeapons: [WeaponType, WeaponType];
};

export type AudioCue =
  | { kind: "scene-playing-start" }
  | { kind: "scene-ended" }
  | { kind: "scene-returned-start" }
  | { kind: "wind-intensity-up"; bucket: number }
  | { kind: "low-health"; isCurrentTurn: boolean }
  | { kind: "shot-fire"; isSecondary: boolean; mobileType: MobileType; power: number }
  | { kind: "ricochet" }
  | { kind: "explosion-hit"; radius: number }
  | { kind: "explosion-terrain"; radius: number }
  | { kind: "turn-cue"; turn: PlayerId }
  | { kind: "charge-start"; power: number }
  | { kind: "charge-release"; power: number }
  | { kind: "weapon-switch" }
  | { kind: "history-move" }
  | { kind: "history-hit" }
  | { kind: "history-bonus" }
  | { kind: "history-round-end" };

export type DerivedAudioEvents = {
  tracker: AudioEventTracker;
  cues: AudioCue[];
};

export function createAudioEventTracker(): AudioEventTracker {
  return {
    previousScene: "start",
    charging: false,
    projectileActive: false,
    turn: null,
    explosionTimer: 0,
    historyLength: 0,
    windBucket: 0,
    lowHealthWarned: [false, false],
    previousBounces: 0,
    previousWeapons: ["primary", "primary"]
  };
}

export function deriveAudioEvents(state: GameState, tracker: AudioEventTracker): DerivedAudioEvents {
  const cues: AudioCue[] = [];
  const nextTracker: AudioEventTracker = {
    previousScene: tracker.previousScene,
    charging: tracker.charging,
    projectileActive: tracker.projectileActive,
    turn: tracker.turn,
    explosionTimer: tracker.explosionTimer,
    historyLength: tracker.historyLength,
    windBucket: tracker.windBucket,
    lowHealthWarned: [...tracker.lowHealthWarned] as [boolean, boolean],
    previousBounces: tracker.previousBounces,
    previousWeapons: [...tracker.previousWeapons] as [WeaponType, WeaponType]
  };

  if (state.scene === "playing" && tracker.previousScene === "start") {
    cues.push({ kind: "scene-playing-start" });
  }

  if (state.scene === "end" && tracker.previousScene !== "end") {
    cues.push({ kind: "scene-ended" });
  }

  if (state.scene === "start" && tracker.previousScene === "end") {
    cues.push({ kind: "scene-returned-start" });
  }

  if (state.scene === "playing") {
    appendWindCue(cues, state, tracker, nextTracker);
    appendLowHealthCues(cues, state, tracker, nextTracker);
    appendProjectileCues(cues, state, tracker, nextTracker);
    appendExplosionCue(cues, state, tracker);
    appendTurnCue(cues, state, tracker);
    appendChargeCues(cues, state, tracker);
    appendWeaponSwitchCue(cues, state, tracker, nextTracker);
    appendHistoryCues(cues, state.history, tracker.historyLength);
  }

  nextTracker.previousScene = state.scene;
  nextTracker.charging = state.charging;
  nextTracker.projectileActive = state.projectile !== null;
  nextTracker.turn = state.turn;
  nextTracker.explosionTimer = state.explosionVisual === null ? 0 : state.explosionVisual.timer;
  nextTracker.historyLength = state.history.length;

  return {
    tracker: nextTracker,
    cues
  };
}

function appendWindCue(cues: AudioCue[], state: GameState, tracker: AudioEventTracker, nextTracker: AudioEventTracker): void {
  const bucket = Math.min(3, Math.floor((Math.abs(state.wind.x) / 0.75) * 4));
  if (bucket > tracker.windBucket) {
    cues.push({ kind: "wind-intensity-up", bucket });
  }
  nextTracker.windBucket = bucket;
}

function appendLowHealthCues(cues: AudioCue[], state: GameState, tracker: AudioEventTracker, nextTracker: AudioEventTracker): void {
  let index = 0;
  while (index < state.players.length) {
    const ratio = state.players[index].mobile.hp / state.players[index].mobile.maxHp;
    if (ratio <= 0.35 && !tracker.lowHealthWarned[index]) {
      cues.push({
        kind: "low-health",
        isCurrentTurn: state.turn === state.players[index].id
      });
      nextTracker.lowHealthWarned[index] = true;
    } else if (ratio > 0.45) {
      nextTracker.lowHealthWarned[index] = false;
    }
    index += 1;
  }
}

function appendProjectileCues(cues: AudioCue[], state: GameState, tracker: AudioEventTracker, nextTracker: AudioEventTracker): void {
  if (state.projectile !== null && !tracker.projectileActive) {
    const owner = state.projectile.owner;
    cues.push({
      kind: "shot-fire",
      isSecondary: state.projectile.weapon !== "primary",
      mobileType: state.players[owner - 1]?.mobile.type || "armor",
      power: state.power
    });
  }

  if (state.projectile !== null && tracker.projectileActive) {
    if (state.projectile.bouncesLeft < tracker.previousBounces) {
      cues.push({ kind: "ricochet" });
    }
    nextTracker.previousBounces = state.projectile.bouncesLeft;
    return;
  }

  nextTracker.previousBounces = 0;
}

function appendExplosionCue(cues: AudioCue[], state: GameState, tracker: AudioEventTracker): void {
  if (state.explosionVisual === null || state.explosionVisual.timer <= tracker.explosionTimer) {
    return;
  }

  if (state.damagePopups.length > 0) {
    cues.push({
      kind: "explosion-hit",
      radius: state.explosionVisual.radius
    });
    return;
  }

  cues.push({
    kind: "explosion-terrain",
    radius: state.explosionVisual.radius
  });
}

function appendTurnCue(cues: AudioCue[], state: GameState, tracker: AudioEventTracker): void {
  if (state.turnAnnouncement !== null && state.turn !== tracker.turn) {
    cues.push({
      kind: "turn-cue",
      turn: state.turn
    });
  }
}

function appendChargeCues(cues: AudioCue[], state: GameState, tracker: AudioEventTracker): void {
  if (state.charging && !tracker.charging) {
    cues.push({
      kind: "charge-start",
      power: state.power
    });
  }

  if (!state.charging && tracker.charging) {
    cues.push({
      kind: "charge-release",
      power: state.power
    });
  }
}

function appendWeaponSwitchCue(cues: AudioCue[], state: GameState, tracker: AudioEventTracker, nextTracker: AudioEventTracker): void {
  const nextWeapons: [WeaponType, WeaponType] = [
    state.players[0].mobile.weapon,
    state.players[1].mobile.weapon
  ];

  if (nextWeapons[0] !== tracker.previousWeapons[0] || nextWeapons[1] !== tracker.previousWeapons[1]) {
    cues.push({ kind: "weapon-switch" });
  }

  nextTracker.previousWeapons = nextWeapons;
}

function appendHistoryCues(cues: AudioCue[], history: MatchEvent[], historyLength: number): void {
  let index = historyLength;
  while (index < history.length) {
    const entry = history[index];
    if (entry.kind === "move") {
      cues.push({ kind: "history-move" });
    }
    if (entry.kind === "hit") {
      cues.push({ kind: "history-hit" });
    }
    if (entry.kind === "bonus") {
      cues.push({ kind: "history-bonus" });
    }
    if (entry.kind === "round-end") {
      cues.push({ kind: "history-round-end" });
    }
    index += 1;
  }
}
