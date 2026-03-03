/** API client for dashboard backend */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface SummaryRow {
  date: string;
  session_start_overall_score: number;
  page_view_overall_score: number;
  view_item_overall_score: number;
  add_to_cart_overall_score: number;
  begin_checkout_overall_score: number;
  purchase_overall_score: number;
}

export const EVENTS = [
  "session_start",
  "page_view",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "purchase",
] as const;

/** Returns overall_score for the event (0–100, higher = better) */
export function qualityFromSummary(row: SummaryRow, event: string): number {
  const key = `${event}_overall_score` as keyof SummaryRow;
  const score = Number(row[key]) ?? 0;
  return Math.round(score * 10) / 10;
}

export async function fetchSummary(from: string, to: string): Promise<SummaryRow[]> {
  return fetchJson<SummaryRow[]>(`${API_BASE}/summary?from=${from}&to=${to}`);
}

export interface TopMissingRow {
  date: string;
  event_name: string;
  param_name: string;
  event_count: number;
  invalid_count: number;
  pct_missing: number;
}

export interface DashboardResponse {
  latest: SummaryRow | null;
  trend: SummaryRow[];
  previous: SummaryRow | null;
  topMissing?: TopMissingRow[];
}

export async function fetchDashboard(options: {
  days?: number;
  endDate?: string;
  from?: string;
  to?: string;
}): Promise<DashboardResponse> {
  const { days = 7, endDate, from, to } = options;
  const params = new URLSearchParams();

  if (from && to) {
    params.set("from", from);
    params.set("to", to);
  } else {
    params.set("days", String(days));
    if (endDate) params.set("to", endDate);
  }

  return fetchJson<DashboardResponse>(`${API_BASE}/dashboard?${params}`);
}

export async function fetchSummaryLatest(): Promise<SummaryRow | null> {
  return fetchJson<SummaryRow | null>(`${API_BASE}/summary/latest`);
}

export interface DrilldownRow {
  date: string;
  event_name: string;
  param_name: string;
  qa_status: string;
  event_count: number;
  invalid_count: number;
}

export async function fetchDrilldown(
  date: string,
  eventName: string
): Promise<DrilldownRow[]> {
  return fetchJson<DrilldownRow[]>(
    `${API_BASE}/drilldown?date=${date}&event_name=${encodeURIComponent(eventName)}`
  );
}

export interface ParamDetailRow {
  date: string;
  event_timestamp: number;
  event_name: string;
  param_name: string;
  qa_status: string;
  actual_value: string;
}

export async function fetchParamDetail(
  eventName: string,
  paramName: string,
  limit: number = 20,
  dateRange?: { from: string; to: string } | null
): Promise<ParamDetailRow[]> {
  const params = new URLSearchParams({
    event_name: eventName,
    param_name: paramName,
    limit: String(limit),
  });
  if (dateRange?.from) params.set("from", dateRange.from);
  if (dateRange?.to) params.set("to", dateRange.to);
  return fetchJson<ParamDetailRow[]>(`${API_BASE}/param-detail?${params}`);
}
