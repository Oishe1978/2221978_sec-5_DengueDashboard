import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { listReportsByDate } from "../api/reports";
import { getDateRange, getDayReport, getTimeseries, getWeekday } from "../api/stats";
import ChartCard from "../components/ChartCard";
import DateSearch from "../components/DateSearch";
import DivisionBarChart from "../components/DivisionBarChart";
import DivisionShareChart from "../components/DivisionShareChart";
import KpiCard from "../components/KpiCard";
import TrendChart from "../components/TrendChart";
import WeekdayChart from "../components/WeekdayChart";
import { useAuth } from "../auth/AuthContext";
import { DIVISIONS, type Division } from "../constants";
import { useAsync } from "../hooks/useAsync";
import type { DayReport, WeekdayStat } from "../types";
import {
  WEEKDAY_SHORT,
  addDays,
  formatDate,
  formatDateLong,
  formatNumber,
  isValidIsoDate,
  weekdayIndex,
} from "../utils";

/** Plain-English summary lines for the day. */
function buildInsights(report: DayReport, weekdayStats: WeekdayStat[] | null, date: string): string[] {
  const scope = report.division ?? "All divisions";
  const lines: string[] = [
    `On ${formatDateLong(date)}, ${scope} recorded ${formatNumber(report.admitted)} admissions and ` +
      `${formatNumber(report.deaths)} deaths (fatality rate ${report.fatality_rate}%).`,
  ];

  if (report.avg_prev_7_days !== null && report.change_vs_avg_pct !== null) {
    const pct = Math.abs(report.change_vs_avg_pct);
    lines.push(
      `That is ${pct}% ${report.change_vs_avg_pct >= 0 ? "above" : "below"} the average of the previous 7 days ` +
        `(${formatNumber(report.avg_prev_7_days)} per day).`,
    );
  }
  if (report.prev_day_admitted !== null && report.change_vs_prev_day_pct !== null) {
    const pct = Math.abs(report.change_vs_prev_day_pct);
    lines.push(
      `Compared with the day before (${formatNumber(report.prev_day_admitted)} admissions), it is ` +
        `${pct}% ${report.change_vs_prev_day_pct >= 0 ? "higher" : "lower"}.`,
    );
  }

  const all = report.divisions;
  const total = all.reduce((sum, d) => sum + d.admitted, 0);
  if (report.division) {
    const rank = all.findIndex((d) => d.division === report.division) + 1;
    const share = total ? ((report.admitted / total) * 100).toFixed(1) : "0.0";
    if (rank > 0) {
      lines.push(`${report.division} ranked ${rank} of ${all.length} divisions and made up ${share}% of all admissions that day.`);
    }
  } else if (all.length > 1) {
    const top = all[0];
    const bottom = all[all.length - 1];
    const topShare = total ? ((top.admitted / total) * 100).toFixed(1) : "0.0";
    lines.push(
      `${top.division} had the most admissions (${formatNumber(top.admitted)}, ${topShare}% of the total); ` +
        `${bottom.division} had the fewest (${formatNumber(bottom.admitted)}).`,
    );
  }

  const name = WEEKDAY_SHORT[weekdayIndex(date)];
  const stat = weekdayStats?.find((w) => w.weekday === name);
  if (stat && stat.days > 0) {
    lines.push(`Over the 90 days up to this date, ${name} averaged ${formatNumber(stat.admitted_avg)} admissions for ${scope}.`);
  }
  return lines;
}

export default function DayPage() {
  const { date = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const rawDivision = params.get("division") ?? "";
  const division: Division | "" = (DIVISIONS as readonly string[]).includes(rawDivision)
    ? (rawDivision as Division)
    : "";
  const valid = isValidIsoDate(date);
  const suffix = division ? `?division=${encodeURIComponent(division)}` : "";
  const scope = division || "All divisions";

  const bounds = useAsync(() => getDateRange(), []);
  const day = useAsync(valid ? () => getDayReport(date, division) : null, [date, division]);
  const series = useAsync(
    valid
      ? () => getTimeseries("day", { division, date_from: addDays(date, -15), date_to: addDays(date, 15) })
      : null,
    [date, division],
  );
  const weekday = useAsync(
    valid ? () => getWeekday({ division, date_from: addDays(date, -90), date_to: date }) : null,
    [date, division],
  );
  const records = useAsync(valid ? () => listReportsByDate(date, division || undefined) : null, [date, division]);

  const min = bounds.data?.min_date ?? null;
  const max = bounds.data?.max_date ?? null;
  const go = (target: string) => navigate(`/day/${target}${suffix}`);
  const report = day.data;
  const noData = day.error !== null && day.error.toLowerCase().includes("no data");

  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1>{valid ? formatDateLong(date) : "Day report"}</h1>
          <p className="muted">{scope}</p>
        </div>
        <div className="actions">
          <button className="btn" disabled={!valid || (min !== null && date <= min)} onClick={() => go(addDays(date, -1))}>
            ← Previous day
          </button>
          <button className="btn" disabled={!valid || (max !== null && date >= max)} onClick={() => go(addDays(date, 1))}>
            Next day →
          </button>
          <Link className="btn" to="/">Dashboard</Link>
        </div>
      </div>

      <DateSearch initialDate={valid ? date : ""} initialDivision={division} minDate={min} maxDate={max} />

      {!valid && <p className="alert">“{date}” is not a valid date. Use the format YYYY-MM-DD, for example 2026-10-12.</p>}
      {valid && noData && (
        <p className="alert">
          No data for {date}
          {min && max ? `. Data is available from ${min} to ${max}.` : "."}
        </p>
      )}
      {valid && day.error && !noData && <p className="alert">{day.error}</p>}

      {valid && report && (
        <>
          <div className="kpis">
            <KpiCard
              label="Admissions"
              value={formatNumber(report.admitted)}
              change={report.change_vs_avg_pct}
              changeLabel="vs 7-day average"
              accent="blue"
            />
            <KpiCard label="Deaths" value={formatNumber(report.deaths)} accent="red" />
            <KpiCard label="Fatality rate" value={`${report.fatality_rate}%`} hint="deaths per 100 admissions" accent="amber" />
            <KpiCard
              label="Previous 7-day average"
              value={report.avg_prev_7_days !== null ? formatNumber(report.avg_prev_7_days) : "–"}
              hint="admissions per day"
              accent="teal"
            />
            <KpiCard
              label="Previous day"
              value={report.prev_day_admitted !== null ? formatNumber(report.prev_day_admitted) : "–"}
              change={report.change_vs_prev_day_pct}
              changeLabel="today vs yesterday"
              accent="slate"
            />
          </div>

          <section className="card insights">
            <h2>Day summary</h2>
            <ul>
              {buildInsights(report, weekday.data, date).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <ChartCard
            title="Around this day"
            subtitle={`${scope} · 15 days before and after (dashed line = ${formatDate(date)})`}
            loading={series.loading}
            error={series.error}
          >
            <TrendChart points={series.data ?? []} granularity="day" highlightDate={date} height={320} />
          </ChartCard>

          <div className="grid-2col">
            <ChartCard
              title="Admissions by division"
              subtitle={division ? `${division} highlighted` : formatDate(date)}
            >
              <DivisionBarChart items={report.divisions} selected={division || undefined} />
            </ChartCard>
            <ChartCard title="Share of admissions" subtitle={formatDate(date)}>
              <DivisionShareChart items={report.divisions} />
            </ChartCard>
          </div>

          <div className="grid-2col">
            <ChartCard
              title="Weekday pattern"
              subtitle={`${scope} · 90 days up to ${formatDate(date)} (${WEEKDAY_SHORT[weekdayIndex(date)]} highlighted)`}
              loading={weekday.loading}
              error={weekday.error}
            >
              <WeekdayChart stats={weekday.data ?? []} highlight={WEEKDAY_SHORT[weekdayIndex(date)]} />
            </ChartCard>

            <ChartCard title="All records for this day" subtitle={`${formatDate(date)} · ${scope}`} loading={records.loading} error={records.error}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Division</th>
                      <th className="num">Admitted</th>
                      <th className="num">Deaths</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(records.data ?? []).map((r) => (
                      <tr key={r.id}>
                        <td>{r.division}</td>
                        <td className="num">{formatNumber(r.admitted)}</td>
                        <td className="num">{formatNumber(r.deaths)}</td>
                        <td className="actions">
                          {isAdmin && <Link className="btn btn-sm" to={`/reports/${r.id}/edit`}>Edit</Link>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
