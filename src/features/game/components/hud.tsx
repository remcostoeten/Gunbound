"use client";

import { getWindLabel } from "@/features/game/engine/wind";
import { useGameState } from "@/features/game/hooks/use-game-state";
import {
  selectPlayers,
  selectTurn,
  selectWind
} from "@/features/game/store/selectors/hud-selectors";

export function Hud(): React.JSX.Element {
  const players = useGameState(selectPlayers);
  const turn = useGameState(selectTurn);
  const wind = useGameState(selectWind);
  const currentPlayer = players[turn - 1];

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-card">
          <span className="player-name">{players[0].name}</span>
          <div className="hud-player-identity">
            <img className="hud-accent-chip" src={"/badges/accent-" + players[0].accent + ".svg"} alt="" width={12} height={12} />
            <img className="hud-title-badge" src={"/badges/badge-" + players[0].title.toLowerCase() + ".svg"} alt="" width={16} height={16} />
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
            <img className="hud-accent-chip" src={"/badges/accent-" + players[1].accent + ".svg"} alt="" width={12} height={12} />
            <img className="hud-title-badge" src={"/badges/badge-" + players[1].title.toLowerCase() + ".svg"} alt="" width={16} height={16} />
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

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
