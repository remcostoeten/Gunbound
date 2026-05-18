import type { MatchEvent, MatchEventInput } from "@/features/game/types/events";

export function createMatchEvent(input: MatchEventInput): MatchEvent {
  return {
    id:
      String(input.round) +
      "-" +
      String(input.turn) +
      "-" +
      input.kind +
      "-" +
      String(input.text.length) +
      "-" +
      String(Math.abs(hashText(input.text))),
    round: input.round,
    turn: input.turn,
    kind: input.kind,
    text: input.text
  };
}

export function appendHistory(history: MatchEvent[], entries: MatchEvent[]): MatchEvent[] {
  const nextHistory = history.slice();
  let index = 0;

  while (index < entries.length) {
    nextHistory.push(entries[index]);
    index += 1;
  }

  if (nextHistory.length > 80) {
    return nextHistory.slice(nextHistory.length - 80);
  }

  return nextHistory;
}

export function createMatchEvents(entries: MatchEventInput[]): MatchEvent[] {
  const nextEntries: MatchEvent[] = [];
  let index = 0;

  while (index < entries.length) {
    nextEntries.push(createMatchEvent(entries[index]));
    index += 1;
  }

  return nextEntries;
}

export function appendMatchEventEntries(history: MatchEvent[], entries: MatchEventInput[]): MatchEvent[] {
  return appendHistory(history, createMatchEvents(entries));
}

function hashText(text: string): number {
  let hash = 0;
  let index = 0;

  while (index < text.length) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
    index += 1;
  }

  return hash;
}
