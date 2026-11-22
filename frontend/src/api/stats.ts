import type { Division } from "../constants";
import type {
  DateRange,
  DayReport,
  DivisionStat,
  Granularity,
  MonthsByYear,
  Summary,
  TimePoint,
  WeekdayStat,
} from "../types";
import { query, request } from "./http";

const BASE = "/api/v1/stats";

export interface Scope {
  division?: Division | "";
  date_from?: string;
  date_to?: string;
}

export const getDateRange = () => request<DateRange>(`${BASE}/date-range`);

export const getSummary = (scope: Scope) => request<Summary>(`${BASE}/summary${query({ ...scope })}`);

export const getTimeseries = (granularity: Granularity, scope: Scope) =>
  request<TimePoint[]>(`${BASE}/timeseries${query({ granularity, ...scope })}`);

export const getByDivision = (scope: Pick<Scope, "date_from" | "date_to">) =>
  request<DivisionStat[]>(`${BASE}/by-division${query({ ...scope })}`);

export const getMonthlyByYear = (division?: Division | "") =>
  request<MonthsByYear[]>(`${BASE}/monthly-by-year${query({ division })}`);

export const getWeekday = (scope: Scope) => request<WeekdayStat[]>(`${BASE}/weekday${query({ ...scope })}`);

export const getDayReport = (date: string, division?: Division | "") =>
  request<DayReport>(`${BASE}/day/${date}${query({ division })}`);
