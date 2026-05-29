"use client";

import type { ReactNode } from "react";
import { worldWidth } from "@/features/game/constants/world";
import { useGameState } from "@/features/game/hooks/use-game-state";
import { selectPlayers, selectTurn } from "@/features/game/store/selectors/hud-selectors";

type Props = {
  hud: ReactNode;
  turnBanner: ReactNode;
  aimControls: ReactNode;
  statusLine: ReactNode;
  historyPanel: ReactNode;
};

export function BattleChrome({
  hud,
  turnBanner,
  aimControls,
  statusLine,
  historyPanel,
}: Props): React.JSX.Element {
  const players = useGameState(selectPlayers);
  const turn = useGameState(selectTurn);
  const activePlayer = players[turn - 1];
  const dockRight = activePlayer.mobile.position.x < worldWidth * 0.5;

  return (
    <div className="battle-chrome">
      <div className="battle-chrome-top">
        {hud}
        {turnBanner}
      </div>
      <div className="battle-chrome-foot">
        <div className={`battle-chrome-main${dockRight ? " battle-chrome-main--dock-right" : ""}`}>
          <div className="command-panel">
            {aimControls}
            {statusLine}
          </div>
        </div>
        {historyPanel}
      </div>
    </div>
  );
}
