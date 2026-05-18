"use client";

import { getWindLabel } from "@/features/game/engine/wind";
import { useGameState } from "@/features/game/hooks/use-game-state";
import {
  selectBonusBoxes,
  selectPhase,
  selectPhaseDuration,
  selectPhaseTimer,
  selectPlayers,
  selectTurn,
  selectTurnCount,
  selectWind
} from "@/features/game/store/selectors/hud-selectors";

export function Hud(): React.JSX.Element {
  const players = useGameState(selectPlayers);
  const turn = useGameState(selectTurn);
  const wind = useGameState(selectWind);
  const phase = useGameState(selectPhase);
  const phaseTimer = useGameState(selectPhaseTimer);
  const phaseDuration = useGameState(selectPhaseDuration);
  const turnCount = useGameState(selectTurnCount);
  const bonusBoxes = useGameState(selectBonusBoxes);
  const currentPlayer = players[turn - 1];
  const landedBoxes = countLandedBoxes(bonusBoxes);

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-card">
          <span className="player-name">{players[0].name}</span>
          <div className="hud-player-identity">
            <span className={"hud-accent-chip accent-" + players[0].accent} />
            <span>{players[0].title}</span>
          </div>
          <div className="hud-player-row">
            <div className="hud-meta">
              <span>{capitalize(players[0].mobile.type)}</span>
              <span>Wins {players[0].score}</span>
            </div>
            <div className="hud-meta secondary">
              <span>HP</span>
              <span>
                {players[0].mobile.hp}/{players[0].mobile.maxHp}
              </span>
            </div>
            <div className="hp-bar">
              <div className={getHpClassName(players[0].mobile.hp, players[0].mobile.maxHp)} style={{ width: getHpWidth(players[0].mobile.hp, players[0].mobile.maxHp) }} />
            </div>
          </div>
        </div>
        <div className="hud-card wind-card">
          <span className="wind-label">Wind</span>
          <span className="wind-value">
            <span className="wind-glyph">{getWindGlyph(wind.x)}</span>
            <span>{getWindLabel(wind)}</span>
          </span>
          <div className="wind-meter">
            <div className="wind-meter-center" />
            <div className="wind-meter-pointer" style={{ left: getWindMeterLeft(wind.x) }} />
          </div>
        </div>
        <div className="hud-card right">
          <span className="player-name">{players[1].name}</span>
          <div className="hud-player-identity">
            <span className={"hud-accent-chip accent-" + players[1].accent} />
            <span>{players[1].title}</span>
          </div>
          <div className="hud-player-row">
            <div className="hud-meta">
              <span>{capitalize(players[1].mobile.type)}</span>
              <span>Wins {players[1].score}</span>
            </div>
            <div className="hud-meta secondary">
              <span>HP</span>
              <span>
                {players[1].mobile.hp}/{players[1].mobile.maxHp}
              </span>
            </div>
            <div className="hp-bar">
              <div className={getHpClassName(players[1].mobile.hp, players[1].mobile.maxHp)} style={{ width: getHpWidth(players[1].mobile.hp, players[1].mobile.maxHp) }} />
            </div>
          </div>
        </div>
      </div>
      <div className="hud-bottom">
        <div className="hud-card turn-card">
          <span className="turn-label">Current Turn</span>
          <span className="turn-value">
            {currentPlayer.title} {currentPlayer.name} / {capitalize(currentPlayer.mobile.type)}
          </span>
          <div className="turn-meta-row">
            <span>Phase {capitalize(phase)}</span>
            <span>
              {formatTimer(phaseTimer)} / {String(turnCount).padStart(2, "0")}
            </span>
          </div>
          <div className="phase-meter">
            <div className="phase-meter-fill" style={{ width: getPhaseWidth(phaseTimer, phaseDuration) }} />
          </div>
          <div className="turn-meta-row subtle">
            <span>Supply Boxes {landedBoxes}</span>
            <span>Charges {currentPlayer.mobile.specialCharges}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getHpWidth(hp: number, maxHp: number): string {
  return String(Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)))) + "%";
}

function getHpClassName(hp: number, maxHp: number): string {
  if (hp / maxHp <= 0.35) {
    return "hp-fill low";
  }

  return "hp-fill";
}

function getWindGlyph(horizontalWind: number): string {
  if (horizontalWind < -0.12) {
    return "< <";
  }

  if (horizontalWind > 0.12) {
    return "> >";
  }

  return "- -";
}

function getWindMeterLeft(horizontalWind: number): string {
  const normalized = Math.max(-0.75, Math.min(0.75, horizontalWind));
  const percentage = ((normalized + 0.75) / 1.5) * 100;
  return String(percentage) + "%";
}

function getPhaseWidth(phaseTimer: number, phaseDuration: number): string {
  if (phaseDuration <= 0) {
    return "0%";
  }

  const percentage = Math.max(0, Math.min(100, Math.round((phaseTimer / phaseDuration) * 100)));
  return String(percentage) + "%";
}

function formatTimer(value: number): string {
  return String(Math.max(0, Math.ceil(value))).padStart(2, "0");
}

function countLandedBoxes(
  bonusBoxes: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>["bonusBoxes"]
): number {
  let landed = 0;
  let index = 0;

  while (index < bonusBoxes.length) {
    if (bonusBoxes[index].landed) {
      landed += 1;
    }
    index += 1;
  }

  return landed;
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
