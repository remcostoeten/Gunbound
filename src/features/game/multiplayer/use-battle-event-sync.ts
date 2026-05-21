"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSpacetimeDB } from "spacetimedb/react";

import {
  setBattleInputHandler,
  type BattleInputCommand,
} from "@/features/game/multiplayer/battle-command-bus";
import {
  BATTLE_EVENT_KIND,
  parseBattleEventPayload,
  type BattleFirePayload,
  type BattleMovePayload,
  type BattleSwitchWeaponPayload,
} from "@/features/game/multiplayer/battle-events";
import { useGameStore } from "@/features/game/store/game-store";
import type { PlayerId } from "@/features/game/types/shared";
import type { RoomMemberView, useRoomSession } from "@/features/lobby/spacetime/use-room-session";

type RoomSession = ReturnType<typeof useRoomSession>;

type UseBattleEventSyncResult = {
  canControl: boolean;
  activePlayerName: string;
};

type BattleEventConnection = {
  reducers: {
    recordRoundEvent(input: {
      roundId: bigint;
      tick: bigint;
      kind: string;
      payload: string;
    }): Promise<void>;
    submitRoundStats(input: {
      roundId: bigint;
      damageDealt: number;
      shotsFired: number;
      directHits: number;
    }): Promise<void>;
    endRound(input: {
      roundId: bigint;
      winnerIdentity?: RoomMemberView["identity"];
    }): Promise<void>;
  };
};

export function useBattleEventSync(roomSession: RoomSession): UseBattleEventSyncResult {
  const connection = useSpacetimeDB();
  const identityHex = connection.identity?.toHexString();
  const scene = useGameStore((state) => state.scene);
  const turn = useGameStore((state) => state.turn);
  const winner = useGameStore((state) => state.winner);
  const history = useGameStore((state) => state.history);
  const activeMember = useMemo(
    () => getMemberForTurn(roomSession.members, turn),
    [roomSession.members, turn],
  );
  const canControl = Boolean(
    roomSession.activeRound &&
      activeMember &&
      identityHex &&
      activeMember.identityHex === identityHex,
  );
  const processedEventIds = useRef<Set<string>>(new Set());
  const submittedStatsRoundIds = useRef<Set<string>>(new Set());
  const endedRoundIds = useRef<Set<string>>(new Set());
  const pendingCommand = useRef(false);

  useEffect(() => {
    processedEventIds.current.clear();
    pendingCommand.current = false;
  }, [roomSession.activeRound?.id]);

  useEffect(() => {
    pendingCommand.current = false;
  }, [roomSession.roundEvents.length]);

  useEffect(() => {
    if (!roomSession.activeRound) return;
    if (scene !== "playing") return;

    for (const event of roomSession.roundEvents) {
      const eventId = event.id.toString();
      if (processedEventIds.current.has(eventId)) continue;
      const payload = parseBattleEventPayload(event.kind, event.payload);
      if (!payload) {
        processedEventIds.current.add(eventId);
        continue;
      }

      if (!applyBattlePayload(event.kind, payload)) break;
      processedEventIds.current.add(eventId);
    }
  }, [roomSession.activeRound, roomSession.roundEvents, scene]);

  useEffect(() => {
    const activeRound = roomSession.activeRound;
    if (!activeRound || scene !== "end") return;

    const roundIdKey = activeRound.id.toString();
    const connectionValue = connection.getConnection() as BattleEventConnection | null;
    if (!connectionValue) return;

    const self = roomSession.self;
    if (self && !submittedStatsRoundIds.current.has(roundIdKey)) {
      submittedStatsRoundIds.current.add(roundIdKey);
      const stats = computeStatsForMember(self, history);
      void connectionValue.reducers.submitRoundStats({
        roundId: activeRound.id,
        damageDealt: stats.damageDealt,
        shotsFired: stats.shotsFired,
        directHits: stats.directHits,
      });
    }

    if (!roomSession.isHost || endedRoundIds.current.has(roundIdKey)) return;
    endedRoundIds.current.add(roundIdKey);
    const winnerMember = winner ? getMemberForTurn(roomSession.members, winner) : undefined;
    window.setTimeout(() => {
      void connectionValue.reducers.endRound({
        roundId: activeRound.id,
        winnerIdentity: winnerMember?.identity,
      });
    }, 1000);
  }, [
    connection,
    history,
    roomSession.activeRound,
    roomSession.isHost,
    roomSession.members,
    roomSession.self,
    scene,
    winner,
  ]);

  useEffect(() => {
    if (!roomSession.room) {
      setBattleInputHandler(null);
      return () => setBattleInputHandler(null);
    }

    setBattleInputHandler((command) => {
      if (command.kind === "aim") {
        return !canControl;
      }
      if (command.kind === "begin-charge") {
        return !canControl;
      }
      if (!canControl) return true;
      if (pendingCommand.current) return true;
      pendingCommand.current = true;
      void recordCommand(
        command,
        roomSession,
        connection.getConnection() as BattleEventConnection | null,
      ).catch(() => {
        pendingCommand.current = false;
      });
      return true;
    });

    return () => setBattleInputHandler(null);
  }, [canControl, roomSession]);

  return {
    canControl,
    activePlayerName: activeMember?.name ?? "Opponent",
  };
}

async function recordCommand(
  command: BattleInputCommand,
  roomSession: RoomSession,
  connection: BattleEventConnection | null | undefined,
): Promise<void> {
  const activeRound = roomSession.activeRound;
  if (!activeRound || !connection) return;

  const state = useGameStore.getState();
  const currentPlayer = state.players[state.turn - 1];
  const tick = BigInt(roomSession.roundEvents.length + 1);

  if (command.kind === "move") {
    await recordRoundEvent(connection, activeRound.id, tick, BATTLE_EVENT_KIND.MOVE, {
      v: 1,
      turn: state.turn,
      direction: command.direction,
    } satisfies BattleMovePayload);
    return;
  }

  if (command.kind === "switch-weapon") {
    const nextWeapon = currentPlayer.mobile.weapon === "primary" ? "secondary" : "primary";
    await recordRoundEvent(connection, activeRound.id, tick, BATTLE_EVENT_KIND.SWITCH_WEAPON, {
      v: 1,
      turn: state.turn,
      weapon: nextWeapon,
    } satisfies BattleSwitchWeaponPayload);
    return;
  }

  if (command.kind === "release-charge") {
    await recordRoundEvent(connection, activeRound.id, tick, BATTLE_EVENT_KIND.FIRE, {
      v: 1,
      turn: state.turn,
      angle: currentPlayer.mobile.angle,
      power: state.power,
      weapon: currentPlayer.mobile.weapon,
    } satisfies BattleFirePayload);
  }
}

async function recordRoundEvent(
  connection: BattleEventConnection,
  roundId: bigint,
  tick: bigint,
  kind: string,
  payload: BattleMovePayload | BattleSwitchWeaponPayload | BattleFirePayload,
): Promise<void> {
  await connection.reducers.recordRoundEvent({
    roundId,
    tick,
    kind,
    payload: JSON.stringify(payload),
  });
}

function applyBattlePayload(kind: string, payload: ReturnType<typeof parseBattleEventPayload>): boolean {
  if (!payload) return true;
  const store = useGameStore.getState();
  if (store.turn !== payload.turn) return false;

  if (kind === BATTLE_EVENT_KIND.MOVE && "direction" in payload) {
    store.applyBattleMove(payload.direction);
    return true;
  }

  if (kind === BATTLE_EVENT_KIND.SWITCH_WEAPON && "weapon" in payload) {
    store.applyBattleWeaponSwitch(payload.weapon);
    return true;
  }

  if (kind === BATTLE_EVENT_KIND.FIRE && "angle" in payload) {
    store.applyBattleFire(payload);
    return true;
  }

  return true;
}

function getMemberForTurn(members: RoomMemberView[], turn: PlayerId): RoomMemberView | undefined {
  return [...members].sort((a, b) => a.slotIndex - b.slotIndex)[turn - 1];
}

function computeStatsForMember(
  member: RoomMemberView,
  history: ReturnType<typeof useGameStore.getState>["history"],
): { damageDealt: number; shotsFired: number; directHits: number } {
  let damageDealt = 0;
  let shotsFired = 0;
  let directHits = 0;

  for (const entry of history) {
    if (entry.turn !== member.slotIndex + 1) continue;
    if (entry.kind === "shot") {
      shotsFired += 1;
      continue;
    }
    if (entry.kind === "hit" && entry.text.startsWith(member.name + " hit ")) {
      directHits += 1;
      damageDealt += readTrailingDamage(entry.text);
    }
  }

  return { damageDealt, shotsFired, directHits };
}

function readTrailingDamage(text: string): number {
  const match = / for (\d+)\./.exec(text);
  return match ? Number(match[1]) : 0;
}
