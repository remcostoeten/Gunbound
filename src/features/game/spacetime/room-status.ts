export const ROOM_STATUS = {
  WAITING: "waiting",
  STARTING: "starting",
  IN_MATCH: "in_match",
  ENDED: "ended"
} as const;

export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];
