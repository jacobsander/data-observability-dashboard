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

export interface TopMissingRow {
  date: string;
  event_name: string;
  param_name: string;
  event_count: number;
  invalid_count: number;
  pct_missing: number;
}

export interface SessionsPurchasesRow {
  date: string;
  ga4_property: string;
  session_count: number;
  purchase_count: number;
}

export interface DashboardResponse {
  latest: SummaryRow | null;
  trend: SummaryRow[];
  previous: SummaryRow | null;
  topMissing?: TopMissingRow[];
  clientServerDiscrepancy?: SessionsPurchasesRow[];
}

export async function fetchDashboard(options: {
  days?: number;
  endDate?: string;
  from?: string;
  to?: string;
  ga4Property?: string[];
}): Promise<DashboardResponse> {
  const { days = 7, endDate, from, to, ga4Property } = options;
  const params = new URLSearchParams();

  if (from && to) {
    params.set("from", from);
    params.set("to", to);
  } else {
    params.set("days", String(days));
    if (endDate) params.set("to", endDate);
  }
  if (ga4Property?.length) {
    params.set("ga4_property", ga4Property.join(","));
  }

  return fetchJson<DashboardResponse>(`${API_BASE}/dashboard?${params}`);
}

export interface DrilldownRow {
  date: string;
  event_name: string;
  param_name: string;
  qa_status: string;
  event_count: number;
  invalid_count: number;
}

export interface RawEventCountResponse {
  from: string;
  to: string;
  event_name: string;
  counts: Record<string, number>;
}

export async function fetchDrilldown(
  date: string,
  eventName: string,
  ga4Property?: string[]
): Promise<DrilldownRow[]> {
  const params = new URLSearchParams({
    date,
    event_name: eventName,
  });
  if (ga4Property?.length) params.set("ga4_property", ga4Property.join(","));
  return fetchJson<DrilldownRow[]>(`${API_BASE}/drilldown?${params}`);
}

export async function fetchRawEventCount(options: {
  from: string;
  to: string;
  eventName: string;
  ga4Property?: string[];
}): Promise<RawEventCountResponse> {
  const params = new URLSearchParams({
    from: options.from,
    to: options.to,
    event_name: options.eventName,
  });
  if (options.ga4Property?.length) params.set("ga4_property", options.ga4Property.join(","));
  return fetchJson<RawEventCountResponse>(`${API_BASE}/raw-event-count?${params}`);
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
  dateRange?: { from: string; to: string } | null,
  ga4Property?: string[]
): Promise<ParamDetailRow[]> {
  const params = new URLSearchParams({
    event_name: eventName,
    param_name: paramName,
    limit: String(limit),
  });
  if (dateRange?.from) params.set("from", dateRange.from);
  if (dateRange?.to) params.set("to", dateRange.to);
  if (ga4Property?.length) params.set("ga4_property", ga4Property.join(","));
  return fetchJson<ParamDetailRow[]>(`${API_BASE}/param-detail?${params}`);
}

// Marketing data quality (BigQuery stg_marketing_audit__unpacked)
export type { MarketingOverview, PlatformDetailResponse, PlatformId } from "./api/marketing";
export async function fetchMarketingOverview(options?: {
  from?: string;
  to?: string;
  days?: number;
}): Promise<import("./api/marketing").MarketingOverview> {
  const params = new URLSearchParams();
  if (options?.from && options?.to) {
    params.set("from", options.from);
    params.set("to", options.to);
  } else {
    params.set("days", String(options?.days ?? 7));
  }
  return fetchJson<import("./api/marketing").MarketingOverview>(
    `${API_BASE}/marketing/overview?${params}`
  );
}

export async function fetchPlatformDetail(
  platformId: import("./api/marketing").PlatformId,
  options?: { from?: string; to?: string; days?: number }
): Promise<import("./api/marketing").PlatformDetailResponse | null> {
  const params = new URLSearchParams();
  if (options?.from && options?.to) {
    params.set("from", options.from);
    params.set("to", options.to);
  } else {
    params.set("days", String(options?.days ?? 7));
  }
  const res = await fetch(`${API_BASE}/marketing/platform/${platformId}?${params}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}
