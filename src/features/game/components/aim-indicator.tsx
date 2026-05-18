"use client";

import { useGameState } from "@/features/game/hooks/use-game-state";

export function AimIndicator(): React.JSX.Element {
  const turn = useGameState(selectTurn);
  const players = useGameState(selectPlayers);
  const power = useGameState(selectPower);
  const charging = useGameState(selectCharging);
  const phase = useGameState(selectPhase);
  const phaseTimer = useGameState(selectPhaseTimer);
  const player = players[turn - 1];
  const secondaryReady = player.mobile.specialCharges > 0;
  const powerWidth = charging ? Math.round(power * 100) : 0;
  const weaponLabel = player.mobile.weapon === "primary" ? "Arc Shot" : "Bounce Shot";
  const bonusLabel = player.mobile.doubleDamageTurns > 0 ? "Double" : secondaryReady ? "Charge +" : "Normal";

  return (
    <div className="aim-card">
      <div className="aim-segment">
        <span className="aim-label">Angle</span>
        <span className="aim-value">{Math.round(player.mobile.angle)} deg</span>
      </div>
      <div className="aim-segment">
        <span className="aim-label">Power</span>
        <div className="meter">
          <div className="meter-fill" style={{ width: String(powerWidth) + "%" }} />
        </div>
      </div>
      <div className="aim-segment">
        <span className="aim-label">Mobile</span>
        <span className="aim-value">{capitalize(player.mobile.type)}</span>
      </div>
      <div className="aim-segment">
        <span className="aim-label">Shot</span>
        <span className="aim-value">
          {weaponLabel} / {bonusLabel}
        </span>
      </div>
      <div className="aim-segment">
        <span className="aim-label">Phase</span>
        <span className="aim-value">
          {capitalize(phase)} / {String(Math.max(0, Math.ceil(phaseTimer))).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function selectTurn(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>): 1 | 2 {
  return state.turn;
}

function selectPlayers(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>) {
  return state.players;
}

function selectPower(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>): number {
  return state.power;
}

function selectCharging(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>): boolean {
  return state.charging;
}

function selectPhase(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>) {
  return state.phase;
}

function selectPhaseTimer(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>) {
  return state.phaseTimer;
}
