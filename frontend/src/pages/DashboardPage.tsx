import { useState } from "react";
import { getByDivision, getDateRange, getMonthlyByYear, getSummary, getTimeseries, getWeekday } from "../api/stats";
import ChartCard from "../components/ChartCard";
import DateSearch from "../components/DateSearch";
import DivisionBarChart from "../components/DivisionBarChart";
import DivisionShareChart from "../components/DivisionShareChart";
import KpiCard from "../components/KpiCard";
import TrendChart from "../components/TrendChart";
import WeekdayChart from "../components/WeekdayChart";
import YearComparisonChart from "../components/YearComparisonChart";
import { DIVISIONS, type Division } from "../constants";
import { useAsync } from "../hooks/useAsync";
import type { DateRange, Granularity } from "../types";
import { addDays, formatDate, formatNumber, isValidIsoDate } from "../utils";

type Preset = "30" | "90" | "365" | "all" | "custom";

const PRESETS: { key: Exclude<Preset, "custom">; label: string }[] = [
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "1 year" },
  { key: "all", label: "All time" },
];

const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "year", label: "Yearly" },
];

const DEFAULT_GRANULARITY: Record<Preset, Granularity> = {
  "30": "day",
  "90": "day",
  "365": "week",
  all: "month",
  custom: "day",
};

function resolveRange(
  preset: Preset,
  bounds: DateRange | null,
  customFrom: string,
  customTo: string,
): { from: string; to: string } | null {
  if (!bounds || !bounds.min_date || !bounds.max_date) return null;
  const { min_date: min, max_date: max } = bounds;
  if (preset === "all") return { from: min, to: max };
  if (preset === "custom") {
    if (!isValidIsoDate(customFrom) || !isValidIsoDate(customTo) || customFrom > customTo) return null;
    return { from: customFrom, to: customTo };
  }
  const from = addDays(max, -(Number(preset) - 1));
  return { from: from < min ? min : from, to: max };
}

export default function DashboardPage() {
  const [division, setDivision] = useState<Division | "">("");
  const [preset, setPreset] = useState<Preset>("90");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("day");

  const boundsState = useAsync(() => getDateRange(), []);
  const bounds = boundsState.data;
  const range = resolveRange(preset, bounds, customFrom, customTo);
  const from = range?.from;
  const to = range?.to;
  const scope = division || "All divisions";

  const summary = useAsync(
    range ? () => getSummary({ division, date_from: range.from, date_to: range.to }) : null,
    [division, from, to],
  );
  const series = useAsync(
    range ? () => getTimeseries(granularity, { division, date_from: range.from, date_to: range.to }) : null,
    [division, from, to, granularity],
  );
  const byDivision = useAsync(
    range ? () => getByDivision({ date_from: range.from, date_to: range.to }) : null,
    [from, to],
  );
  const yearly = useAsync(() => getMonthlyByYear(division), [division]);
  const weekday = useAsync(
    range ? () => getWeekday({ division, date_from: range.from, date_to: range.to }) : null,
    [division, from, to],
  );

  function choosePreset(next: Preset) {
    setPreset(next);
    setGranularity(DEFAULT_GRANULARITY[next]);
  }

  const s = summary.data;

  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1>Dengue Dashboard</h1>
          <p className="muted">
            {scope}
            {range ? ` · ${formatDate(range.from)} – ${formatDate(range.to)}` : ""}
          </p>
        </div>
      </div>

      <DateSearch minDate={bounds?.min_date} maxDate={bounds?.max_date} />

      <div className="filterbar card">
        <label>
          Division
          <select value={division} onChange={(e) => setDivision(e.target.value as Division | "")}>
            <option value="">All divisions</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="field-label">Period</span>
          <div className="seg">
            {PRESETS.map((p) => (
              <button key={p.key} className={preset === p.key ? "active" : ""} onClick={() => choosePreset(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label>
          From
          <input
            type="date"
            value={preset === "custom" ? customFrom : (from ?? "")}
            min={bounds?.min_date ?? undefined}
            max={bounds?.max_date ?? undefined}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              if (preset !== "custom") {
                setCustomTo(to ?? "");
                choosePreset("custom");
              }
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={preset === "custom" ? customTo : (to ?? "")}
            min={bounds?.min_date ?? undefined}
            max={bounds?.max_date ?? undefined}
            onChange={(e) => {
              setCustomTo(e.target.value);
              if (preset !== "custom") {
                setCustomFrom(from ?? "");
                choosePreset("custom");
              }
            }}
          />
        </label>
      </div>

      {boundsState.error && <p className="alert">{boundsState.error}</p>}
      {bounds && !bounds.max_date && (
        <p className="muted">No data yet. Add reports from “Manage data” to see the dashboard.</p>
      )}
      {preset === "custom" && !range && bounds?.max_date && (
        <p className="hint">Choose a valid From and To date (From must not be after To).</p>
      )}

      <div className="kpis">
        <KpiCard
          label="Admissions"
          value={s ? formatNumber(s.admitted) : "…"}
          change={s ? s.admitted_change_pct : undefined}
          changeLabel="vs previous period"
          hint={s ? `${formatNumber(s.previous_admitted)} in the ${s.days} days before` : undefined}
          accent="blue"
        />
        <KpiCard
          label="Deaths"
          value={s ? formatNumber(s.deaths) : "…"}
          change={s ? s.deaths_change_pct : undefined}
          changeLabel="vs previous period"
          hint={s ? `${formatNumber(s.previous_deaths)} in the ${s.days} days before` : undefined}
          accent="red"
        />
        <KpiCard
          label="Fatality rate"
          value={s ? `${s.fatality_rate}%` : "…"}
          hint="deaths per 100 admissions"
          accent="amber"
        />
        <KpiCard
          label="Daily average"
          value={s ? formatNumber(s.avg_daily) : "…"}
          hint={s ? `over ${s.days} days` : undefined}
          accent="teal"
        />
        <KpiCard
          label="Peak day"
          value={s ? formatNumber(s.peak_admitted) : "…"}
          hint={s && s.peak_date ? formatDate(s.peak_date) : undefined}
          accent="slate"
        />
      </div>
      {summary.error && <p className="alert">{summary.error}</p>}

      <ChartCard
        title="Admissions and deaths over time"
        subtitle={`${scope} · ${GRANULARITIES.find((g) => g.key === granularity)?.label.toLowerCase()} view`}
        loading={series.loading}
        error={series.error}
        actions={
          <div className="seg">
            {GRANULARITIES.map((g) => (
              <button key={g.key} className={granularity === g.key ? "active" : ""} onClick={() => setGranularity(g.key)}>
                {g.label}
              </button>
            ))}
          </div>
        }
      >
        <TrendChart points={series.data ?? []} granularity={granularity} />
      </ChartCard>

      <div className="grid-2col">
        <ChartCard
          title="Year-over-year comparison"
          subtitle={`${scope} · admissions per month`}
          loading={yearly.loading}
          error={yearly.error}
        >
          <YearComparisonChart rows={yearly.data ?? []} />
        </ChartCard>

        <ChartCard
          title="Divisions ranked by admissions"
          subtitle={division ? `${division} highlighted` : "All divisions"}
          loading={byDivision.loading}
          error={byDivision.error}
        >
          <DivisionBarChart items={byDivision.data ?? []} selected={division || undefined} />
        </ChartCard>
      </div>

      <div className="grid-2col">
        <ChartCard
          title="Share of admissions by division"
          subtitle="Selected period"
          loading={byDivision.loading}
          error={byDivision.error}
        >
          <DivisionShareChart items={byDivision.data ?? []} />
        </ChartCard>

        <ChartCard
          title="Average admissions by weekday"
          subtitle={`${scope} · selected period`}
          loading={weekday.loading}
          error={weekday.error}
        >
          <WeekdayChart stats={weekday.data ?? []} />
        </ChartCard>
      </div>
    </div>
  );
}
