import type { MatchEvent, MatchEventInput } from "@/features/game/types/events";

let historyEventCounter = 0;

export function resetHistoryEventCounter(): void {
  historyEventCounter = 0;
}

export function createMatchEvent(input: MatchEventInput): MatchEvent {
  historyEventCounter += 1;
  return {
    id:
      String(input.round) +
      "-" +
      String(input.turn) +
      "-" +
      input.kind +
      "-" +
      String(historyEventCounter),
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
    return ensureUniqueEventIds(nextHistory.slice(nextHistory.length - 80));
  }

  return ensureUniqueEventIds(nextHistory);
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

export function ensureUniqueEventIds(events: MatchEvent[]): MatchEvent[] {
  const usedIds = new Set<string>();
  let changed = false;

  const nextEvents = events.map((event) => {
    let id = event.id;
    let suffix = 1;

    while (usedIds.has(id)) {
      id = event.id + "~" + String(suffix);
      suffix += 1;
    }

    usedIds.add(id);

    if (id === event.id) return event;
    changed = true;
    return { ...event, id };
  });

  return changed ? nextEvents : events;
}
