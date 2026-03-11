/** Marketing Data Quality — types and in-app dummy data (Meta CAPI, Google Ads). No API/fetch; data is derived synchronously. */

export type PlatformId = "meta-capi" | "google-ads";

export type ParamCategory = "critical" | "warning" | "optional";

export interface PlatformSummary {
  platformId: PlatformId;
  name: string;
  matchRate: number;
  totalEvents: number;
  failedEvents: number;
  trend: number; // delta vs previous period (e.g. +2.1 or -1.3)
}

export interface MarketingOverview {
  payloadHealthScore: number;
  platforms: PlatformSummary[];
  volumeTrend: VolumeTrendPoint[];
  errorDistribution: ErrorDistributionItem[];
}

export interface VolumeTrendPoint {
  date: string;
  totalEvents: number;
  errorEvents: number;
  id: string;
}

export interface ErrorDistributionItem {
  category: string;
  count: number;
  name: string; // display label for pie chart
}

export interface PlatformParam {
  paramKey: string;
  category: ParamCategory;
  eventsWithParam: number;
  eventsMissing: number;
  percentage: number;
  description: string;
}

export interface ErrorRateTrendPoint {
  date: string;
  criticalErrorPct: number;
  warningErrorPct: number;
  optionalErrorPct: number;
  id: string;
}

export interface PlatformDetailResponse {
  platformId: PlatformId;
  name: string;
  matchRate: number;
  totalEvents: number;
  failedEvents: number;
  parameters: PlatformParam[];
  errorRateTrend: ErrorRateTrendPoint[];
}

// --- Mock data helpers ---

function last7Days(): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Build list of dates from `from` through `to` (YYYY-MM-DD, inclusive). */
function datesInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function vary(base: number, pct = 0.05): number {
  const delta = base * pct * (Math.random() * 2 - 1);
  return Math.round((base + delta) * 10) / 10;
}

/**
 * Get marketing data quality overview for the given date range.
 * Returns in-app dummy data synchronously (no API/fetch).
 */
export function getMarketingOverview(options?: {
  from?: string;
  to?: string;
  days?: number;
}): MarketingOverview {
  const dates =
    options?.from && options?.to
      ? datesInRange(options.from, options.to)
      : last7Days().slice(-Math.min(options?.days ?? 7, 7));

  const platforms: PlatformSummary[] = [
    {
      platformId: "meta-capi",
      name: "Meta CAPI",
      matchRate: vary(88),
      totalEvents: 124500,
      failedEvents: 14940,
      trend: vary(2.1),
    },
    {
      platformId: "google-ads",
      name: "Google Ads",
      matchRate: vary(85),
      totalEvents: 98200,
      failedEvents: 14730,
      trend: vary(-0.8),
    },
  ];

  const payloadHealthScore = Math.round(
    platforms.reduce((s, p) => s + p.matchRate, 0) / platforms.length
  );

  const volumeTrend: VolumeTrendPoint[] = dates.map((date, i) => {
    const total = 30000 + Math.floor(5000 * Math.sin(i * 0.5));
    const err = Math.floor(total * (0.1 + Math.random() * 0.05));
    return {
      date: date.slice(5),
      totalEvents: total,
      errorEvents: err,
      id: `vol-${i}-${date}`,
    };
  });

  const errorDistribution: ErrorDistributionItem[] = [
    { category: "critical", count: 4200, name: "Critical" },
    { category: "warning", count: 8100, name: "Warning" },
    { category: "optional", count: 5300, name: "Optional" },
  ];

  return {
    payloadHealthScore,
    platforms,
    volumeTrend,
    errorDistribution,
  };
}

// Parameter definitions for Meta CAPI (from briefing)
const META_PARAMS: Omit<PlatformParam, "eventsWithParam" | "eventsMissing" | "percentage">[] = [
  { paramKey: "event_id", category: "critical", description: "UUID/ULID for Pixel/CAPI deduplication" },
  { paramKey: "event_name", category: "critical", description: "Must match Meta's standard naming" },
  { paramKey: "event_time", category: "critical", description: "Unix timestamp, loses power after 1 hour" },
  { paramKey: "action_source", category: "critical", description: "Where event occurred (website/app/store)" },
  { paramKey: "user_data.em", category: "warning", description: "Hashed Email, highest-priority matching key" },
  { paramKey: "user_data.ph", category: "warning", description: "Hashed Phone, high-priority identifier" },
  { paramKey: "user_data.fbc", category: "warning", description: "Click ID from fbclid, Meta ad clicks only" },
  { paramKey: "user_data.fbp", category: "warning", description: "Browser ID, unique browser identifier" },
  { paramKey: "user_data.client_ip_address", category: "warning", description: "User differentiation in server-to-server" },
  { paramKey: "user_data.client_user_agent", category: "warning", description: "User differentiation in server-to-server" },
  { paramKey: "custom_data.value", category: "optional", description: "Required for Purchase events ROAS calculation" },
  { paramKey: "custom_data.currency", category: "optional", description: "Required for Purchase events ROAS" },
  { paramKey: "custom_data.content_ids", category: "optional", description: "Required for Dynamic Product Ads" },
  { paramKey: "custom_data.content_type", category: "optional", description: "Required for Dynamic Product Ads" },
  { paramKey: "user_data.fn", category: "optional", description: "First name, optional matching" },
  { paramKey: "user_data.ln", category: "optional", description: "Last name, optional matching" },
  { paramKey: "user_data.ct", category: "optional", description: "City, optional matching" },
  { paramKey: "user_data.st", category: "optional", description: "State, optional matching" },
  { paramKey: "user_data.zp", category: "optional", description: "Zipcode, optional matching" },
  { paramKey: "user_data.country", category: "optional", description: "Country, optional matching" },
];

// Google Ads — minimal set for UI pattern
const GOOGLE_ADS_PARAMS: Omit<PlatformParam, "eventsWithParam" | "eventsMissing" | "percentage">[] = [
  { paramKey: "conversion_action", category: "critical", description: "Conversion action ID" },
  { paramKey: "gclid", category: "critical", description: "Google Click ID for attribution" },
  { paramKey: "conversion_date_time", category: "critical", description: "Conversion timestamp" },
  { paramKey: "conversion_value", category: "warning", description: "Value for ROAS" },
  { paramKey: "currency_code", category: "warning", description: "Currency for conversion value" },
  { paramKey: "order_id", category: "optional", description: "Deduplication and reporting" },
  { paramKey: "user_agent", category: "optional", description: "User differentiation" },
  { paramKey: "email", category: "optional", description: "Hashed email for matching" },
];

function buildParams(
  defs: Omit<PlatformParam, "eventsWithParam" | "eventsMissing" | "percentage">[],
  totalEvents: number
): PlatformParam[] {
  return defs.map((d) => {
    const completion = 0.7 + Math.random() * 0.3;
    const withParam = Math.floor(totalEvents * completion);
    const missing = totalEvents - withParam;
    const percentage = Math.round((withParam / totalEvents) * 1000) / 10;
    return { ...d, eventsWithParam: withParam, eventsMissing: missing, percentage };
  });
}

function buildErrorRateTrend(dates: string[], baseCritical: number, baseWarning: number, baseOptional: number): ErrorRateTrendPoint[] {
  return dates.map((date, i) => ({
    date: date.slice(5),
    id: `err-${i}-${date}`,
    criticalErrorPct: Math.min(100, Math.max(0, vary(100 - baseCritical, 0.15))),
    warningErrorPct: Math.min(100, Math.max(0, vary(100 - baseWarning, 0.15))),
    optionalErrorPct: Math.min(100, Math.max(0, vary(100 - baseOptional, 0.15))),
  }));
}

/** Get platform detail from in-app dummy data (Meta CAPI or Google Ads). Returns null for unknown platform. */
export function getPlatformDetail(platformId: PlatformId): PlatformDetailResponse | null {
  if (platformId !== "meta-capi" && platformId !== "google-ads") {
    return null;
  }

  const dates = last7Days();
  const totalEvents = platformId === "meta-capi" ? 124500 : 98200;
  const matchRate = platformId === "meta-capi" ? vary(88) : vary(85);
  const failedEvents = Math.floor(totalEvents * (1 - matchRate / 100));

  const paramDefs = platformId === "meta-capi" ? META_PARAMS : GOOGLE_ADS_PARAMS;
  const parameters = buildParams(paramDefs, totalEvents);

  const avgCritical = parameters.filter((p) => p.category === "critical").reduce((s, p) => s + p.percentage, 0) / (parameters.filter((p) => p.category === "critical").length || 1);
  const avgWarning = parameters.filter((p) => p.category === "warning").reduce((s, p) => s + p.percentage, 0) / (parameters.filter((p) => p.category === "warning").length || 1);
  const avgOptional = parameters.filter((p) => p.category === "optional").reduce((s, p) => s + p.percentage, 0) / (parameters.filter((p) => p.category === "optional").length || 1);

  const errorRateTrend = buildErrorRateTrend(dates, avgCritical, avgWarning, avgOptional);

  return {
    platformId,
    name: platformId === "meta-capi" ? "Meta CAPI" : "Google Ads",
    matchRate,
    totalEvents,
    failedEvents,
    parameters,
    errorRateTrend,
  };
}

export const MARKETING_PLATFORM_IDS: PlatformId[] = ["meta-capi", "google-ads"];
