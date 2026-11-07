/** Today's date as YYYY-MM-DD in the browser's local time. */
export function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** "2026-10-12" -> "12 Oct 2026" */
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB");
}
