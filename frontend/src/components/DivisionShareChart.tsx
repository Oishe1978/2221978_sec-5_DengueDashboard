import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { divisionColor } from "../theme";
import ChartTooltip from "./ChartTooltip";

interface Item {
  division: string;
  admitted: number;
}

export default function DivisionShareChart({ items }: { items: Item[] }) {
  const data = items.filter((d) => d.admitted > 0).map((d) => ({ division: d.division, admitted: d.admitted }));
  if (data.length === 0) return <p className="muted chart-empty">No data for this period.</p>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="admitted" nameKey="division" innerRadius={60} outerRadius={105} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.division} fill={divisionColor(d.division)} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
