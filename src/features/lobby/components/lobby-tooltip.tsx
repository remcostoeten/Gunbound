"use client";

import type { ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ToolbarHint } from "../config/toolbar-hints";

type LobbyTooltipProps = {
  hint: ToolbarHint;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
};

export function LobbyTooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={120}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function LobbyTooltip({ hint, children, side = "top" }: LobbyTooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={10}
          collisionPadding={12}
          className="gb-tip"
          aria-label={`${hint.title}: ${hint.description}`}
        >
          <div className="gb-tip-head">
            <span className="gb-tip-title">{hint.title}</span>
            {hint.shortcut ? <span className="gb-tip-kbd">{hint.shortcut}</span> : null}
          </div>
          <p className="gb-tip-body">{hint.description}</p>
          <TooltipPrimitive.Arrow className="gb-tip-arrow" width={12} height={6} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
