"use client";

import { getMobileAngleProfile, isTrueAngle } from "@/features/game/engine/aiming";
import { createTurnGuide } from "@/features/game/engine/action-guide";
import { getWeaponIconPath } from "@/features/game/constants/weapon-icons";
import { useGameState } from "@/features/game/hooks/use-game-state";
import { dispatchBattleInputCommand } from "@/features/game/multiplayer/battle-command-bus";
import { useGameStore } from "@/features/game/store/game-store";
import {
  selectCharging,
  selectBattleItemInventories,
  selectPhase,
  selectPhaseTimer,
  selectPlayers,
  selectPower,
  selectSelectedBattleItems,
  selectTurn,
  selectTurnCount,
  selectTurnMoveRemaining,
  selectWeather
} from "@/features/game/store/selectors/hud-selectors";

export function AimIndicator(): React.JSX.Element {
  const turn = useGameState(selectTurn);
  const players = useGameState(selectPlayers);
  const power = useGameState(selectPower);
  const charging = useGameState(selectCharging);
  const phase = useGameState(selectPhase);
  const phaseTimer = useGameState(selectPhaseTimer);
  const turnCount = useGameState(selectTurnCount);
  const turnMoveRemaining = useGameState(selectTurnMoveRemaining);
  const battleItemInventories = useGameState(selectBattleItemInventories);
  const selectedBattleItems = useGameState(selectSelectedBattleItems);
  const weather = useGameState(selectWeather);
  const player = players[turn - 1];
  const turnGuide = createTurnGuide(player, phase, charging, phaseTimer, power, turnCount, turnMoveRemaining, battleItemInventories[turn - 1], selectedBattleItems[turn - 1], weather);
  const angleProfile = getMobileAngleProfile(player.mobile.type);
  const trueAngleActive = isTrueAngle(player.mobile.type, player.mobile.angle);

  return (
    <div className={"aim-card tone-" + turnGuide.tone}>
      <div className="aim-card-header">
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

      <div className="aim-card-body">
        <div className="aim-status-grid">
          <div className="aim-segment emphasis">
            <span className="aim-label">Angle</span>
            <span className="aim-value">{Math.round(player.mobile.angle)}°</span>
            <span className="aim-angle-detail">
              {trueAngleActive
                ? "True +" + String(Math.round((angleProfile.trueAngleDamageScale - 1) * 100)) + "%"
                : String(angleProfile.min) + "-" + String(angleProfile.max) + " arc"}
            </span>
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

        <div className="aim-panel-section">
          <span className="aim-section-label">Shots</span>
          <div className="aim-weapon-row">
            {turnGuide.weaponSlots.map(renderWeaponSlot)}
          </div>
        </div>

        <div className="aim-panel-section">
          <span className="aim-section-label">Controls</span>
          <div className="aim-command-row">
            {turnGuide.commands.map(renderCommand)}
          </div>
          <div className="aim-touch-grid" aria-label="Touch controls">
            <button
              type="button"
              className="aim-touch-button"
              aria-label="Move left"
              onPointerDown={handleMoveLeftStart}
              onPointerUp={handleMoveLeftEnd}
              onPointerCancel={handleMoveLeftEnd}
              onPointerLeave={handleMoveLeftEnd}
              onKeyDown={handleMoveLeftKeyDown}
              onKeyUp={handleMoveLeftKeyUp}
            >
              <span className="aim-touch-key">A</span>
              <span>Left</span>
            </button>
            <button
              type="button"
              className="aim-touch-button"
              aria-label="Aim up"
              onPointerDown={handleAimUp}
              onPointerUp={handleAimUpEnd}
              onPointerCancel={handleAimUpEnd}
              onPointerLeave={handleAimUpEnd}
              onKeyDown={handleAimUpKeyDown}
              onKeyUp={handleAimUpKeyUp}
            >
              <span className="aim-touch-key">Up</span>
              <span>Aim</span>
            </button>
            <button
              type="button"
              className="aim-touch-button aim-touch-fire"
              aria-label="Hold to fire"
              onPointerDown={handleChargeStart}
              onPointerUp={handleChargeEnd}
              onPointerCancel={handleChargeEnd}
              onPointerLeave={handleChargeEnd}
              onKeyDown={handleChargeKeyDown}
              onKeyUp={handleChargeKeyUp}
            >
              <span className="aim-touch-key">Hold</span>
              <span>Fire</span>
            </button>
            <button
              type="button"
              className="aim-touch-button"
              aria-label="Move right"
              onPointerDown={handleMoveRightStart}
              onPointerUp={handleMoveRightEnd}
              onPointerCancel={handleMoveRightEnd}
              onPointerLeave={handleMoveRightEnd}
              onKeyDown={handleMoveRightKeyDown}
              onKeyUp={handleMoveRightKeyUp}
            >
              <span className="aim-touch-key">D</span>
              <span>Right</span>
            </button>
            <button
              type="button"
              className="aim-touch-button"
              aria-label="Aim down"
              onPointerDown={handleAimDown}
              onPointerUp={handleAimDownEnd}
              onPointerCancel={handleAimDownEnd}
              onPointerLeave={handleAimDownEnd}
              onKeyDown={handleAimDownKeyDown}
              onKeyUp={handleAimDownKeyUp}
            >
              <span className="aim-touch-key">Down</span>
              <span>Aim</span>
            </button>
            <button type="button" className="aim-touch-button" onClick={handleWeaponSwitch} aria-label="Switch weapon">
              <span className="aim-touch-key">Q</span>
              <span>Shot</span>
            </button>
            <button type="button" className="aim-touch-button" onClick={handleItemSwitch} aria-label="Switch item">
              <span className="aim-touch-key">E</span>
              <span>Item</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function handleMoveLeftStart(event: React.PointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "move", direction: -1 })) return;
  useGameStore.getState().setMoveKey(-1, true);
}

function handleMoveLeftEnd(event: React.PointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "move", direction: -1 })) return;
  useGameStore.getState().setMoveKey(-1, false);
}

function handleMoveLeftKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event) || event.repeat) return;
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "move", direction: -1 })) return;
  useGameStore.getState().setMoveKey(-1, true);
}

function handleMoveLeftKeyUp(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event)) return;
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "move", direction: -1 })) return;
  useGameStore.getState().setMoveKey(-1, false);
}

function handleMoveRightStart(event: React.PointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "move", direction: 1 })) return;
  useGameStore.getState().setMoveKey(1, true);
}

function handleMoveRightEnd(event: React.PointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "move", direction: 1 })) return;
  useGameStore.getState().setMoveKey(1, false);
}

function handleMoveRightKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event) || event.repeat) return;
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "move", direction: 1 })) return;
  useGameStore.getState().setMoveKey(1, true);
}

function handleMoveRightKeyUp(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event)) return;
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "move", direction: 1 })) return;
  useGameStore.getState().setMoveKey(1, false);
}

function handleAimUp(event: React.SyntheticEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "aim", key: "up", active: true })) return;
  useGameStore.getState().setAimKey("up", true);
}

function handleAimUpEnd(event: React.SyntheticEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "aim", key: "up", active: false })) return;
  useGameStore.getState().setAimKey("up", false);
}

function handleAimUpKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event) || event.repeat) return;
  handleAimUp(event);
}

function handleAimUpKeyUp(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event)) return;
  handleAimUpEnd(event);
}

function handleAimDown(event: React.SyntheticEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "aim", key: "down", active: true })) return;
  useGameStore.getState().setAimKey("down", true);
}

function handleAimDownEnd(event: React.SyntheticEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "aim", key: "down", active: false })) return;
  useGameStore.getState().setAimKey("down", false);
}

function handleAimDownKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event) || event.repeat) return;
  handleAimDown(event);
}

function handleAimDownKeyUp(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event)) return;
  handleAimDownEnd(event);
}

function handleWeaponSwitch(event: React.SyntheticEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "switch-weapon" })) return;
  useGameStore.getState().switchWeapon();
}

function handleItemSwitch(event: React.SyntheticEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "switch-item" })) return;
  useGameStore.getState().switchBattleItem();
}

function handleChargeStart(event: React.PointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  if (dispatchBattleInputCommand({ kind: "begin-charge" })) return;
  useGameStore.getState().beginCharge();
}

function handleChargeEnd(event: React.PointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  if (dispatchBattleInputCommand({ kind: "release-charge" })) return;
  useGameStore.getState().releaseCharge();
}

function handleChargeKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event) || event.repeat) return;
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "begin-charge" })) return;
  useGameStore.getState().beginCharge();
}

function handleChargeKeyUp(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (!isActivationKey(event)) return;
  event.preventDefault();
  if (dispatchBattleInputCommand({ kind: "release-charge" })) return;
  useGameStore.getState().releaseCharge();
}

function isActivationKey(event: React.KeyboardEvent<HTMLButtonElement>): boolean {
  return event.key === " " || event.key === "Enter";
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
