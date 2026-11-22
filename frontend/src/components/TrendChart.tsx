import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "../theme";
import type { Granularity, TimePoint } from "../types";
import { formatCompact, periodFull, periodLabel } from "../utils";
import ChartTooltip from "./ChartTooltip";

interface Props {
  points: TimePoint[];
  granularity: Granularity;
  /** ISO date of a day to mark with a vertical line (day report page). */
  highlightDate?: string;
  height?: number;
}

export default function TrendChart({ points, granularity, highlightDate, height = 340 }: Props) {
  if (points.length === 0) return <p className="muted chart-empty">No data for this period.</p>;

  const data = points.map((p) => ({
    label: periodLabel(p.period_start, granularity),
    full: periodFull(p.period_start, granularity),
    admitted: p.admitted,
    deaths: p.deaths,
    avg7: p.admitted_avg7,
  }));
  const highlightLabel = highlightDate ? periodLabel(highlightDate, granularity) : undefined;
  const animate = data.length < 200;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLORS.axis }} minTickGap={28} />
        <YAxis yAxisId="left" tick={{ fontSize: 12, fill: COLORS.axis }} tickFormatter={formatCompact} width={44} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: COLORS.deaths }}
          allowDecimals={false}
          width={36}
        />
        <Tooltip content={<ChartTooltip />} />
        <Legend />
        {granularity === "day" ? (
          <>
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="admitted"
              name="Admissions"
              stroke={COLORS.admitted}
              fill={COLORS.admitted}
              fillOpacity={0.15}
              strokeWidth={2}
              isAnimationActive={animate}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avg7"
              name="7-day average"
              stroke={COLORS.average}
              strokeWidth={2}
              dot={false}
              isAnimationActive={animate}
            />
          </>
        ) : (
          <Bar
            yAxisId="left"
            dataKey="admitted"
            name="Admissions"
            fill={COLORS.admitted}
            radius={[4, 4, 0, 0]}
            isAnimationActive={animate}
          />
        )}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="deaths"
          name="Deaths"
          stroke={COLORS.deaths}
          strokeWidth={2}
          dot={false}
          isAnimationActive={animate}
        />
        {highlightLabel && (
          <ReferenceLine yAxisId="left" x={highlightLabel} stroke={COLORS.deaths} strokeDasharray="4 4" />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
