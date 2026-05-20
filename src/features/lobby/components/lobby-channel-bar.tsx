"use client";

type Props = {
  channel: number;
  onSelect: (n: number) => void;
};

export function LobbyChannelBar({ channel, onSelect }: Props) {
  return (
    <div className="gb-channels" role="tablist" aria-label="Lobby channel">
      <span className="gb-ch-label" aria-hidden="true">CH.</span>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
        const active = channel === n;
        return (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`Channel ${n}${active ? " (current)" : ""}`}
            onClick={() => onSelect(n)}
            className={`gb-ch ${active ? "gb-ch-on" : ""}`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
