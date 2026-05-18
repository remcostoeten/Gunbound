"use client";

import { useGameState } from "@/features/game/hooks/use-game-state";

export function HistoryPanel(): React.JSX.Element {
  const history = useGameState(selectHistory);
  const round = useGameState(selectRound);
  const suddenDeathActive = useGameState(selectSuddenDeathActive);
  const recentHistory = history.slice(Math.max(0, history.length - 8)).reverse();

  return (
    <div className="history-panel">
      <div className="history-panel-head">
        <span className="history-panel-title">Battle Log</span>
        <span className="history-panel-round">Round {round}</span>
      </div>
      {suddenDeathActive ? <div className="history-alert">Sudden Death Active</div> : null}
      <div className="history-list">
        {recentHistory.map(renderHistoryItem)}
      </div>
    </div>
  );
}

function renderHistoryItem(entry: ReturnType<typeof selectHistory>[number]): React.JSX.Element {
  return (
    <div key={entry.id} className="history-item">
      <span className="history-item-tag">{entry.kind}</span>
      <span className="history-item-text">{entry.text}</span>
    </div>
  );
}

function selectHistory(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>) {
  return state.history;
}

function selectRound(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>) {
  return state.round;
}

function selectSuddenDeathActive(state: ReturnType<typeof import("@/features/game/store/game-store").useGameStore.getState>) {
  return state.suddenDeathActive;
}
