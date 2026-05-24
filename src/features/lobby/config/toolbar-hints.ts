export type ToolbarHint = {
  title: string;
  description: string;
  shortcut?: string;
};

export const TOOLBAR_HINTS = {
  back: {
    title: "Back",
    description: "Leave the lobby and return to the previous screen.",
  },
  waiting: {
    title: "Waiting",
    description: "Join the matchmaking queue to find a random opponent.",
  },
  cancelQueue: {
    title: "Cancel",
    description: "Stop searching and leave the matchmaking queue.",
  },
  quickjoin: {
    title: "Quickjoin",
    description: "Jump into the first open room with a free slot.",
  },
  soloPractice: {
    title: "Solo Practice",
    description: "Practice against a local bot without waiting for another player.",
  },
  create: {
    title: "Create",
    description: "Open a new room and invite friends to play.",
    shortcut: "P3",
  },
  myInfo: {
    title: "My Info",
    description: "View your profile, stats, and account details.",
  },
  rankings: {
    title: "Rankings",
    description: "Browse the global leaderboard and top players.",
  },
  friend: {
    title: "Inbox",
    description: "Friend requests and room invites. Pending items show a badge.",
  },
  roomSearch: {
    title: "Room number",
    description: "Join a specific room by entering its code.",
  },
  fullscreen: {
    title: "Fullscreen",
    description: "Enter browser fullscreen mode.",
  },
  exitFullscreen: {
    title: "Exit fullscreen",
    description: "Leave browser fullscreen and restore the window.",
  },
  mode: {
    title: "Game mode",
    description: "Current match format. Team modes coming later.",
  },
} as const satisfies Record<string, ToolbarHint>;
