import type { PlayerId } from "@/features/game/types/shared";

export type MatchEventKind =
  | "round-start"
  | "turn-start"
  | "move"
  | "shot"
  | "weapon-switch"
  | "hit"
  | "bonus"
  | "sudden-death"
  | "round-end";

export type MatchEventInput = {
  round: number;
  turn: PlayerId;
  kind: MatchEventKind;
  text: string;
};

export type MatchEvent = {
  id: string;
  round: number;
  turn: PlayerId;
  kind: MatchEventKind;
  text: string;
};
