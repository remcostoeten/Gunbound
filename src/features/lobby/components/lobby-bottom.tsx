"use client";

import { LobbyChatPanel } from "./lobby-chat-panel";
import { LobbyActionButton } from "./lobby-action-button";
import type { LobbyChatMsg } from "../hooks/use-lobby-state";

type Props = {
  onBack: () => void;
  messages: LobbyChatMsg[];
  onSend: (text: string) => void;
  whisperTo: string | null;
  onClearWhisper: () => void;
};

export function LobbyBottom({ onBack, messages, onSend, whisperTo, onClearWhisper }: Props) {
  return (
    <div className="gb-bottom">
      <LobbyChatPanel
        messages={messages}
        onSend={onSend}
        whisperTo={whisperTo}
        onClearWhisper={onClearWhisper}
      />
      <div className="gb-bottom-actions">
        <LobbyActionButton label="Event"  glyph="🎟" tone="purple" />
        <LobbyActionButton label="Option" glyph="⚙" tone="blue" />
        <LobbyActionButton label="Back"   glyph="↩" tone="blue" onClick={onBack} />
      </div>
    </div>
  );
}
