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
  session_start_pct_events_missing: number;
  session_start_pct_params_missing: number;
  page_view_pct_events_missing: number;
  page_view_pct_params_missing: number;
  view_item_pct_events_missing: number;
  view_item_pct_params_missing: number;
  add_to_cart_pct_events_missing: number;
  add_to_cart_pct_params_missing: number;
  begin_checkout_pct_events_missing: number;
  begin_checkout_pct_params_missing: number;
  purchase_pct_events_missing: number;
  purchase_pct_params_missing: number;
}

export const EVENTS = [
  "session_start",
  "page_view",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "purchase",
] as const;

/** Quality % = 100 - pct_events_missing */
export function qualityFromSummary(row: SummaryRow, event: string): number {
  const key = `${event}_pct_events_missing` as keyof SummaryRow;
  const missing = Number(row[key]) ?? 0;
  return Math.round((100 - missing) * 10) / 10;
}

export async function fetchSummary(from: string, to: string): Promise<SummaryRow[]> {
  return fetchJson<SummaryRow[]>(`${API_BASE}/summary?from=${from}&to=${to}`);
}

export async function fetchSummaryLatest(): Promise<SummaryRow | null> {
  try {
    return await fetchJson<SummaryRow>(`${API_BASE}/summary/latest`);
  } catch {
    return null;
  }
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
