export function chatTimestampToIso(micros: bigint): string {
  return new Date(Number(micros / BigInt(1000))).toISOString();
}

export function formatChatTimestamp(micros?: bigint): string | null {
  if (micros === undefined) return null;

  const date = new Date(Number(micros / BigInt(1000)));
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
