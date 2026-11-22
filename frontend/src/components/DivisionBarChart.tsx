import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS } from "../theme";
import { formatCompact } from "../utils";
import ChartTooltip from "./ChartTooltip";

interface Item {
  division: string;
  admitted: number;
}

interface Props {
  items: Item[];
  /** Division to emphasise; the others are drawn lighter. */
  selected?: string;
}

export default function DivisionBarChart({ items, selected }: Props) {
  if (items.length === 0) return <p className="muted chart-empty">No data for this period.</p>;
  const data = items.map((d) => ({ division: d.division, admitted: d.admitted }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: COLORS.axis }} tickFormatter={formatCompact} />
        <YAxis type="category" dataKey="division" width={92} tick={{ fontSize: 12, fill: COLORS.axis }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="admitted" name="Admissions" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell
              key={d.division}
              fill={!selected || d.division === selected ? COLORS.admitted : COLORS.admittedSoft}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
