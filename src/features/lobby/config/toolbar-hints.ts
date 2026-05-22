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
  create: {
    title: "Create",
    description: "Open a new room and invite friends to play.",
    shortcut: "P3",
  },
  fixtureData: {
    title: "Fixture data",
    description: "Show sample rooms and buddies for layout testing.",
  },
  emptyData: {
    title: "Empty data",
    description: "Hide fixture data and show only live lobby content.",
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
  mode: {
    title: "Game mode",
    description: "Current match format. Team modes coming later.",
  },
} as const satisfies Record<string, ToolbarHint>;
