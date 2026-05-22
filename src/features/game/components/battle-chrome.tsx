"use client";

import type { ReactNode } from "react";

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
  return (
    <div className="battle-chrome">
      <div className="battle-chrome-top">
        {hud}
        {turnBanner}
      </div>
      <div className="battle-chrome-foot">
        <div className="battle-chrome-main">
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
