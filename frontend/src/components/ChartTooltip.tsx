interface Entry {
  name?: string;
  value?: number | string | null;
  color?: string;
  payload?: { full?: string; fill?: string };
}

interface Props {
  active?: boolean;
  payload?: Entry[];
  label?: string | number;
}

/** One tooltip style for every chart. */
export default function ChartTooltip({ active, payload, label }: Props) {
  if (!active || !payload || payload.length === 0) return null;
  const title = payload[0].payload?.full ?? String(label ?? "");
  return (
    <div className="tooltip">
      <div className="tooltip-title">{title}</div>
      {payload.map((entry, i) => (
        <div className="tooltip-row" key={`${entry.name}-${i}`}>
          <span className="dot" style={{ background: entry.color ?? entry.payload?.fill }} />
          <span>{entry.name}</span>
          <strong>
            {typeof entry.value === "number" ? entry.value.toLocaleString("en-US") : (entry.value ?? "–")}
          </strong>
        </div>
      ))}
    </div>
  );
}
