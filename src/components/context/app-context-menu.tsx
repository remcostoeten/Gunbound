"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type AppContextMenuItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  destructive?: boolean;
  onSelect: () => void;
};

type Props = {
  children: ReactNode;
  label?: string;
  items: AppContextMenuItem[];
  className?: string;
};

export function AppContextMenu({ children, label, items, className }: Props) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className={`gb-context-menu${className ? ` ${className}` : ""}`}>
        {label && <ContextMenuLabel className="gb-context-menu-label">{label}</ContextMenuLabel>}
        {label && <ContextMenuSeparator className="gb-context-menu-separator" />}
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <ContextMenuItem
              key={item.id}
              className={`gb-context-menu-item${item.destructive ? " gb-context-menu-item-danger" : ""}`}
              disabled={item.disabled}
              onSelect={item.onSelect}
            >
              {Icon && <Icon className="gb-context-menu-icon" aria-hidden="true" />}
              <span>{item.label}</span>
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
