import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { fetchPlatformDetail } from "../api";
import {
  type PlatformId,
  type PlatformDetailResponse,
  type PlatformParam,
  type ParamCategory,
  MARKETING_PLATFORM_IDS,
} from "../api/marketing";
import type { DateRangeValue } from "../components/DateRangePicker";

const SCORE_WEIGHTS = { critical: 0.6, warning: 0.3, optional: 0.1 };

/** Prefer weighted score from API; accept camelCase or snake_case. If missing or 0, compute from parameters (60/30/10). */
function getDataQualityScore(
  detail: PlatformDetailResponse & { weighted_score?: number }
): number {
  const fromApi =
    typeof detail.weightedScore === "number"
      ? detail.weightedScore
      : typeof (detail as { weighted_score?: number }).weighted_score === "number"
        ? (detail as { weighted_score: number }).weighted_score
        : null;
  if (fromApi != null && fromApi > 0) return fromApi;

  const total = detail.totalEvents ?? 0;
  if (total === 0 || !detail.parameters?.length) return fromApi ?? 0;

  const params = detail.parameters;
  const nCrit = params.filter((p) => p.category === "critical").length || 1;
  const nWarn = params.filter((p) => p.category === "warning").length || 1;
  const nOpt = params.filter((p) => p.category === "optional").length || 1;
  const sumCrit = params.filter((p) => p.category === "critical").reduce((s, p) => s + p.eventsWithParam, 0);
  const sumWarn = params.filter((p) => p.category === "warning").reduce((s, p) => s + p.eventsWithParam, 0);
  const sumOpt = params.filter((p) => p.category === "optional").reduce((s, p) => s + p.eventsWithParam, 0);
  const compCrit = nCrit ? sumCrit / (total * nCrit) : 1;
  const compWarn = nWarn ? sumWarn / (total * nWarn) : 1;
  const compOpt = nOpt ? sumOpt / (total * nOpt) : 1;
  const computed =
    SCORE_WEIGHTS.critical * compCrit + SCORE_WEIGHTS.warning * compWarn + SCORE_WEIGHTS.optional * compOpt;
  return Math.round(computed * 1000) / 10;
}

const CATEGORY_STYLES: Record<
  ParamCategory,
  { label: string; badge: string; border: string }
> = {
  critical: { label: "Critical", badge: "bg-red-500/20 text-red-400 border-red-500/50", border: "border-red-500/30" },
  warning: { label: "Warning", badge: "bg-orange-500/20 text-orange-400 border-orange-500/50", border: "border-orange-500/30" },
  optional: { label: "Optional", badge: "bg-slate-500/20 text-slate-400 border-slate-500/50", border: "border-slate-500/30" },
};

const numberFormatter = new Intl.NumberFormat("en-US");

function groupParamsByCategory(params: PlatformParam[]): Map<ParamCategory, PlatformParam[]> {
  const map = new Map<ParamCategory, PlatformParam[]>();
  const order: ParamCategory[] = ["critical", "warning", "optional"];
  order.forEach((cat) => map.set(cat, []));
  params.forEach((p) => {
    const list = map.get(p.category);
    if (list) list.push(p);
  });
  return map;
}

export function PlatformDetail() {
  const { platformId } = useParams<{ platformId: string }>();
  const location = useLocation();
  const state = location.state as { dateRange?: DateRangeValue } | null;

  const validId = platformId && MARKETING_PLATFORM_IDS.includes(platformId as PlatformId)
    ? (platformId as PlatformId)
    : null;

  const [detail, setDetail] = useState<PlatformDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!validId) {
      setDetail(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const dateOpts = state?.dateRange
      ? { from: state.dateRange.from, to: state.dateRange.to }
      : { days: 7 };
    fetchPlatformDetail(validId, dateOpts)
      .then((data) => {
        if (!cancelled) setDetail(data ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load platform data");
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [validId, state?.dateRange?.from, state?.dateRange?.to]);

  if (platformId && !validId) {
    return (
      <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/"
            state={state?.dateRange ? { dateRange: state.dateRange } : undefined}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <p className="text-muted-foreground">Platform not found: {platformId}</p>
        </div>
      </div>
    );
  }

  const grouped = detail ? groupParamsByCategory(detail.parameters) : new Map();

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/"
          state={state?.dateRange ? { dateRange: state.dateRange } : undefined}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-amber-600">{error}</p>
        ) : detail ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">{detail.name}</h1>
              <p className="mt-2 text-muted-foreground">
                Parameter quality and error rate trends
                {state?.dateRange && ` • ${state.dateRange.from} – ${state.dateRange.to}`}
              </p>
              <dl className="mt-4 flex flex-wrap gap-6 text-sm text-foreground">
                <div>
                  <dt className="text-muted-foreground">Data quality score</dt>
                  <dd className="flex items-start gap-0.5 text-xl font-semibold text-foreground">
                    <span>{getDataQualityScore(detail)}</span>
                    <span className="text-sm font-semibold pt-0.5">/100</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total events</dt>
                  <dd className="text-xl font-semibold text-foreground tabular-nums">
                    {numberFormatter.format(detail.totalEvents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Failed events</dt>
                  <dd className="text-xl font-semibold text-foreground tabular-nums">
                    {numberFormatter.format(detail.failedEvents)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Error Rate Trends by Category */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Error Rate Trends by Category
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={detail.errorRateTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8" }}
                        label={{
                          value: "% Missing",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#94a3b8",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #475569",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#e2e8f0" }}
                      />
                      <Legend />
                      <Line
                        key="line-critical"
                        type="monotone"
                        dataKey="criticalErrorPct"
                        name="Critical Errors"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ fill: "#ef4444" }}
                      />
                      <Line
                        key="line-warning"
                        type="monotone"
                        dataKey="warningErrorPct"
                        name="Warning Errors"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ fill: "#f97316" }}
                      />
                      <Line
                        key="line-optional"
                        type="monotone"
                        dataKey="optionalErrorPct"
                        name="Optional Errors"
                        stroke="#64748b"
                        strokeWidth={2}
                        dot={{ fill: "#64748b" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Parameter table by category */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Parameters by Category</h2>
              <div className="space-y-6">
                {(["critical", "warning", "optional"] as const).map((category) => {
                  const params = grouped.get(category) ?? [];
                  if (params.length === 0) return null;
                  const style = CATEGORY_STYLES[category];
                  return (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`bg-card border rounded-lg overflow-hidden ${style.border}`}
                    >
                      <div className={`px-4 py-2 border-b ${style.border} ${style.badge}`}>
                        <span className="font-medium">{style.label}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-muted-foreground border-b border-border">
                              <th className="text-left py-3 px-4">Parameter</th>
                              <th className="text-right py-3 px-4">With param</th>
                              <th className="text-right py-3 px-4">Missing</th>
                              <th className="text-right py-3 px-4">Completion</th>
                              <th className="text-left py-3 px-4">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {params.map((p) => (
                              <tr
                                key={p.paramKey}
                                className="border-b border-border/50 last:border-0 text-foreground"
                              >
                                <td className="py-3 px-4 font-mono">{p.paramKey}</td>
                                <td className="py-3 px-4 text-right tabular-nums">
                                  {numberFormatter.format(p.eventsWithParam)}
                                </td>
                                <td className="py-3 px-4 text-right tabular-nums">
                                  {numberFormatter.format(p.eventsMissing)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span
                                    className={
                                      p.percentage >= 67
                                        ? "text-green-500"
                                        : p.percentage >= 34
                                          ? "text-yellow-500"
                                          : "text-red-500"
                                    }
                                  >
                                    {p.percentage}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">{p.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">No data for this platform.</p>
        )}
      </div>
    </div>
  );
}
