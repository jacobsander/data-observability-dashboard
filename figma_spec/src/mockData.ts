/**
 * Dummy data for the dashboard when running without the backend.
 * Uses events/params from config/eventsAndParams.ts.
 */

import { EVENTS_AND_PARAMS } from "./config/eventsAndParams";
import type { SummaryRow, DrilldownRow } from "./app/api";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function makeSummaryRow(date: string, overrides?: Partial<SummaryRow>): SummaryRow {
  const base: SummaryRow = {
    date,
    session_start_pct_events_missing: 0,
    session_start_pct_params_missing: 0,
    page_view_pct_events_missing: 0,
    page_view_pct_params_missing: 0,
    view_item_pct_events_missing: 0,
    view_item_pct_params_missing: 0,
    add_to_cart_pct_events_missing: 0,
    add_to_cart_pct_params_missing: 0,
    begin_checkout_pct_events_missing: 0,
    begin_checkout_pct_params_missing: 0,
    purchase_pct_events_missing: 0,
    purchase_pct_params_missing: 0,
  };
  return { ...base, ...overrides };
}

/** Returns 7 days of summary trend with some variation (session_start best, purchase worst) */
export function getMockSummaryRange(from: string, to: string): SummaryRow[] {
  const start = new Date(from);
  const end = new Date(to);
  const rows: SummaryRow[] = [];
  const eventKeys = [
    "session_start",
    "page_view",
    "view_item",
    "add_to_cart",
    "begin_checkout",
    "purchase",
  ] as const;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    const dayIndex = Math.floor((d.getTime() - start.getTime()) / 86400000);
    const variation = Math.sin(dayIndex * 0.3) * 3;
    const overrides: Partial<SummaryRow> = {};
    const baseMissing = [2, 5, 8, 12, 15, 22];
    eventKeys.forEach((ev, i) => {
      const val = Math.max(0, Math.min(100, baseMissing[i] + variation + (dayIndex % 3)));
      overrides[`${ev}_pct_events_missing` as keyof SummaryRow] = val;
      overrides[`${ev}_pct_params_missing` as keyof SummaryRow] = val * 1.1;
    });
    rows.push(makeSummaryRow(dateStr, overrides));
  }
  return rows;
}

export function getMockSummaryLatest(): SummaryRow {
  const today = formatDate(new Date());
  return makeSummaryRow(today, {
    session_start_pct_events_missing: 1.5,
    session_start_pct_params_missing: 1.8,
    page_view_pct_events_missing: 4.2,
    page_view_pct_params_missing: 4.5,
    view_item_pct_events_missing: 7.1,
    view_item_pct_params_missing: 7.8,
    add_to_cart_pct_events_missing: 11.3,
    add_to_cart_pct_params_missing: 12.1,
    begin_checkout_pct_events_missing: 14.0,
    begin_checkout_pct_params_missing: 15.2,
    purchase_pct_events_missing: 18.5,
    purchase_pct_params_missing: 20.1,
  });
}

/** Drilldown for an event: params with event_count and invalid_count */
export function getMockDrilldown(
  date: string,
  eventName: string
): DrilldownRow[] {
  const params = EVENTS_AND_PARAMS[eventName] ?? [];
  const baseEventCount = 50000 + Math.floor(Math.random() * 30000);
  return params.map((param_name, i) => {
    const event_count = baseEventCount - i * 1000;
    const invalidPct = [2, 5, 8, 12, 18, 25, 15, 10][i % 8] ?? 10;
    const invalid_count = Math.round((event_count * invalidPct) / 100);
    return {
      date,
      event_name: eventName,
      param_name,
      qa_status: invalid_count === 0 ? "VALID" : "MISSING_KEY",
      event_count,
      invalid_count,
    };
  });
}
