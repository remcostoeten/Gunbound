"use client";

import { useEffect } from "react";
import { playUiSfx } from "@/lib/music-bus";
import type { IncomingFriendRequestView, IncomingRoomInviteView } from "../spacetime/use-lobby-friends";

type Props = {
  friendRequests: IncomingFriendRequestView[];
  roomInvites: IncomingRoomInviteView[];
  onClose: () => void;
  onFriendResponse: (requestId: bigint, accept: boolean) => void;
  onRoomInviteResponse: (invite: IncomingRoomInviteView, accept: boolean) => void;
};

export function LobbyInboxModal({
  friendRequests,
  roomInvites,
  onClose,
  onFriendResponse,
  onRoomInviteResponse,
}: Props) {
  const isEmpty = friendRequests.length === 0 && roomInvites.length === 0;

  useEffect(function playOpenCue(): void {
    playUiSfx(isEmpty ? "open" : "notify");
  }, [isEmpty]);

  return (
    <div className="gb-modal-back" onClick={onClose}>
      <div className="gb-modal gb-inbox-modal" onClick={(event) => event.stopPropagation()}>
        <div className="gb-modal-head">
          <span className="gb-modal-name">Inbox</span>
          <button className="gb-modal-x" onClick={onClose}>x</button>
        </div>
        <div className="gb-modal-body gb-inbox-body">
          {isEmpty ? (
            <div className="gb-empty gb-empty-buddy">
              <span className="gb-empty-title">Inbox empty</span>
              <span className="gb-empty-sub">Friend requests and room invites will appear here.</span>
            </div>
          ) : (
            <>
              {friendRequests.length > 0 && (
                <section className="gb-inbox-section">
                  <h3>Friend Requests</h3>
                  {friendRequests.map((request) => (
                    <div className="gb-inbox-item" key={request.id.toString()}>
                      <div>
                        <b>{request.requesterName}</b>
                        <span>wants to add you as a friend.</span>
                      </div>
                      <div className="gb-inbox-actions">
                        <button type="button" onClick={() => onFriendResponse(request.id, true)}>Accept</button>
                        <button type="button" onClick={() => onFriendResponse(request.id, false)}>Decline</button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {roomInvites.length > 0 && (
                <section className="gb-inbox-section">
                  <h3>Room Invites</h3>
                  {roomInvites.map((invite) => (
                    <div className="gb-inbox-item" key={invite.id.toString()}>
                      <div>
                        <b>{invite.requesterName}</b>
                        <span>invited you to room {invite.roomCode}.</span>
                      </div>
                      <div className="gb-inbox-actions">
                        <button type="button" onClick={() => onRoomInviteResponse(invite, true)}>Join</button>
                        <button type="button" onClick={() => onRoomInviteResponse(invite, false)}>Decline</button>
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
