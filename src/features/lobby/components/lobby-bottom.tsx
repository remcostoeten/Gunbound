"use client";

import { LobbyChatPanel } from "./lobby-chat-panel";
import { LobbyActionButton } from "./lobby-action-button";
import type { LobbyChatMsg } from "../hooks/use-lobby-state";

type Props = {
  onBack: () => void;
  onOptions: () => void;
  messages: LobbyChatMsg[];
  onSend: (text: string) => void;
  whisperTo: string | null;
  onClearWhisper: () => void;
  onFriendRequestResponse: (requestId: bigint, accept: boolean) => void;
};

export function LobbyBottom({ onBack, onOptions, messages, onSend, whisperTo, onClearWhisper, onFriendRequestResponse }: Props) {
  return (
    <div className="gb-bottom">
      <LobbyChatPanel
        messages={messages}
        onSend={onSend}
        whisperTo={whisperTo}
        onClearWhisper={onClearWhisper}
        onFriendRequestResponse={onFriendRequestResponse}
      />
      <div className="gb-bottom-actions">
        <LobbyActionButton label="Event"  glyph="🎟" tone="purple" />
        <LobbyActionButton label="Option" glyph="⚙" tone="blue" onClick={onOptions} />
        <LobbyActionButton label="Back"   glyph="↩" tone="blue" onClick={onBack} />
      </div>
    </div>
  );
}
