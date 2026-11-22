import type { Division } from "./constants";

export const COLORS = {
  admitted: "#2563eb",
  admittedSoft: "#bfdbfe",
  deaths: "#dc2626",
  average: "#f59e0b",
  grid: "#e5e7eb",
  axis: "#64748b",
};

export const DIVISION_COLORS: Record<Division, string> = {
  Dhaka: "#2563eb",
  Chattogram: "#0d9488",
  Barishal: "#f59e0b",
  Sylhet: "#7c3aed",
  Rajshahi: "#db2777",
  Rangpur: "#16a34a",
  Khulna: "#ea580c",
  Mymensingh: "#64748b",
};

/** Colour for a division name coming from the API (falls back to grey). */
export function divisionColor(name: string): string {
  return (DIVISION_COLORS as Record<string, string>)[name] ?? COLORS.axis;
}

/** Newest year gets the strongest colour. */
export function yearColor(index: number, count: number): string {
  const palette = ["#2563eb", "#0d9488", "#94a3b8", "#7c3aed", "#db2777"];
  return palette[(count - 1 - index) % palette.length];
}
