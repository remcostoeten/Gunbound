"use client";

import { useEffect, useState } from "react";
import { useGameState } from "@/features/game/hooks/use-game-state";
import { selectHistory, selectRound, selectSuddenDeathActive } from "@/features/game/store/selectors/history-selectors";

export function HistoryPanel(): React.JSX.Element {
  const history = useGameState(selectHistory);
  const round = useGameState(selectRound);
  const suddenDeathActive = useGameState(selectSuddenDeathActive);
  const [open, setOpen] = useState(true);
  const recentHistory = history.slice(Math.max(0, history.length - 5)).reverse();

  useEffect(function syncHistoryPanelDefault() {
    const media = window.matchMedia("(max-width: 1180px), (max-height: 760px)");
    const syncOpen = (): void => setOpen(!media.matches);
    syncOpen();
    media.addEventListener("change", syncOpen);
    return () => media.removeEventListener("change", syncOpen);
  }, []);

  return (
    <aside className={`history-panel${open ? " is-open" : " is-collapsed"}`}>
      <div className="history-panel-head">
        <button
          type="button"
          className="history-panel-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className="history-panel-title">Battle Log</span>
          <span className="history-panel-round">R{round}</span>
          <span className="history-panel-chevron" aria-hidden="true">{open ? "▾" : "▸"}</span>
        </button>
      </div>
      {open ? (
        <>
          {suddenDeathActive ? <div className="history-alert">Sudden Death Active</div> : null}
          <div className="history-list">
            {recentHistory.length === 0 ? (
              <p className="history-empty">Match events will appear here.</p>
            ) : (
              recentHistory.map(renderHistoryItem)
            )}
          </div>
        </>
      ) : null}
    </aside>
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
