import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS } from "../theme";
import type { WeekdayStat } from "../types";
import ChartTooltip from "./ChartTooltip";

interface Props {
  stats: WeekdayStat[];
  /** Short weekday name to emphasise, e.g. "Mon". */
  highlight?: string;
}

export default function WeekdayChart({ stats, highlight }: Props) {
  if (stats.every((s) => s.days === 0)) return <p className="muted chart-empty">No data for this period.</p>;
  const data = stats.map((s) => ({ weekday: s.weekday, average: s.admitted_avg }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="weekday" tick={{ fontSize: 12, fill: COLORS.axis }} />
        <YAxis tick={{ fontSize: 12, fill: COLORS.axis }} width={44} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="average" name="Average admissions" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.weekday} fill={!highlight || d.weekday === highlight ? COLORS.admitted : COLORS.admittedSoft} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
