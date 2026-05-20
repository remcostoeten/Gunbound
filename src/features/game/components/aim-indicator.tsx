"use client";

import { createTurnGuide } from "@/features/game/engine/action-guide";
import { getWeaponIconPath } from "@/features/game/constants/weapon-icons";
import { useGameState } from "@/features/game/hooks/use-game-state";
import {
  selectCharging,
  selectPhase,
  selectPhaseTimer,
  selectPlayers,
  selectPower,
  selectTurn,
  selectTurnCount
} from "@/features/game/store/selectors/hud-selectors";

export function AimIndicator(): React.JSX.Element {
  const turn = useGameState(selectTurn);
  const players = useGameState(selectPlayers);
  const power = useGameState(selectPower);
  const charging = useGameState(selectCharging);
  const phase = useGameState(selectPhase);
  const phaseTimer = useGameState(selectPhaseTimer);
  const turnCount = useGameState(selectTurnCount);
  const player = players[turn - 1];
  const turnGuide = createTurnGuide(player, phase, charging, phaseTimer, power, turnCount);

  return (
    <div className={"aim-card tone-" + turnGuide.tone}>
      <div className="aim-card-top">
        <div className="aim-card-copy">
          <span className="aim-kicker">
            <img className="aim-title-badge" src={"/badges/badge-" + player.title.toLowerCase() + ".svg"} alt="" width={16} height={16} />
            {player.title} Command
          </span>
          <span className="aim-headline">{turnGuide.headline}</span>
        </div>
        <div className="aim-card-phase">
          <span className="aim-phase-label">{turnGuide.phaseLabel}</span>
          <span className="aim-phase-timer">{turnGuide.timerLabel}</span>
        </div>
      </div>

      <div className="aim-status-grid">
        <div className="aim-segment emphasis">
          <span className="aim-label">Angle</span>
          <span className="aim-value">{Math.round(player.mobile.angle)} deg</span>
        </div>
        <div className="aim-segment emphasis">
          <span className="aim-label">Power</span>
          <div className="meter">
            <div className="meter-fill" style={{ width: String(turnGuide.powerPercent) + "%" }} />
          </div>
          <span className="aim-meter-value">{String(turnGuide.powerPercent).padStart(2, "0")}%</span>
        </div>
        <div className="aim-segment">
          <span className="aim-label">Mobile</span>
          <span className="aim-value">{capitalize(player.mobile.type)}</span>
        </div>
        <div className="aim-segment">
          <span className="aim-label">Boost</span>
          <span className="aim-value">{getBoostLabel(player.mobile.doubleDamageTurns, player.mobile.specialCharges)}</span>
        </div>
      </div>

      <div className="aim-weapon-row">
        {turnGuide.weaponSlots.map(renderWeaponSlot)}
      </div>

      <div className="aim-command-row">
        {turnGuide.commands.map(renderCommand)}
      </div>
    </div>
  );
}

function renderWeaponSlot(slot: ReturnType<typeof createTurnGuide>["weaponSlots"][number]): React.JSX.Element {
  return (
    <div key={slot.slotLabel} className={getWeaponSlotClassName(slot.selected, slot.available)}>
      <span className="aim-shot-slot">{slot.slotLabel}</span>
      <span className="aim-shot-icon-frame" aria-hidden="true">
        <img
          className="aim-shot-icon"
          src={getWeaponIconPath(slot.mobileType, slot.weaponType)}
          alt=""
        />
      </span>
      <span className="aim-shot-copy">
        <span className="aim-shot-name">{slot.weaponLabel}</span>
        <span className="aim-shot-detail">{slot.detailLabel}</span>
      </span>
    </div>
  );
}

function renderCommand(command: ReturnType<typeof createTurnGuide>["commands"][number]): React.JSX.Element {
  return (
    <div key={command.keyLabel} className={"aim-command " + command.state}>
      <span className="aim-command-key">{command.keyLabel}</span>
      <span className="aim-command-action">{command.actionLabel}</span>
      <span className="aim-command-detail">{command.detailLabel}</span>
    </div>
  );
}

function getWeaponSlotClassName(selected: boolean, available: boolean): string {
  if (selected) {
    return "aim-shot-slot-card selected";
  }

  if (!available) {
    return "aim-shot-slot-card locked";
  }

  return "aim-shot-slot-card";
}

function getBoostLabel(doubleDamageTurns: number, specialCharges: number): string {
  if (doubleDamageTurns > 0) {
    return "Double";
  }

  if (specialCharges > 0) {
    return "Charge +" + String(specialCharges);
  }

  return "Normal";
}

function capitalize(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
