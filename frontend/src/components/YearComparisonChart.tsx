import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS, yearColor } from "../theme";
import type { MonthsByYear } from "../types";
import { MONTH_SHORT, formatCompact } from "../utils";
import ChartTooltip from "./ChartTooltip";

export default function YearComparisonChart({ rows }: { rows: MonthsByYear[] }) {
  if (rows.length === 0) return <p className="muted chart-empty">No data yet.</p>;

  const data = MONTH_SHORT.map((month, i) => {
    const row: Record<string, string | number | null> = { month, full: month };
    rows.forEach((r) => {
      row[String(r.year)] = r.months[i] ?? null;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: COLORS.axis }} />
        <YAxis tick={{ fontSize: 12, fill: COLORS.axis }} tickFormatter={formatCompact} width={44} />
        <Tooltip content={<ChartTooltip />} />
        <Legend />
        {rows.map((r, i) => (
          <Line
            key={r.year}
            type="monotone"
            dataKey={String(r.year)}
            name={String(r.year)}
            stroke={yearColor(i, rows.length)}
            strokeWidth={2.5}
            dot={{ r: 2 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
