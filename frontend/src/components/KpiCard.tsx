import { formatPct } from "../utils";

interface Props {
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
  changeLabel?: string;
  accent?: "blue" | "red" | "teal" | "amber" | "slate";
}

/** Up is bad (red), down is good (green): every metric here is a disease count. */
export default function KpiCard({ label, value, hint, change, changeLabel, accent = "blue" }: Props) {
  const direction = change === null || change === undefined || change === 0 ? "flat" : change > 0 ? "up" : "down";
  return (
    <div className={`kpi card kpi-${accent}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {change !== undefined && (
        <span className={`kpi-change ${direction}`}>
          {direction === "up" ? "▲ " : direction === "down" ? "▼ " : ""}
          {formatPct(change)}
          {changeLabel && <em> {changeLabel}</em>}
        </span>
      )}
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  );
}
