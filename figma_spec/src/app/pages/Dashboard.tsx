import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import {
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HealthScore } from "../components/HealthScore";
import { EventScorecard } from "../components/EventScorecard";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { DateRangePicker } from "../components/DateRangePicker";
import { Ga4PropertyPicker } from "../components/Ga4PropertyPicker";
import type { Ga4PropertyValue } from "../components/Ga4PropertyPicker";
import {
  EVENTS,
  fetchDashboard,
  qualityFromSummary,
  type SessionsPurchasesRow,
  type SummaryRow,
  type TopMissingRow,
} from "../api";

const numberFormatter = new Intl.NumberFormat("en-US");

const DEFAULT_GA4_PROPERTY: Ga4PropertyValue[] = ["moomin_client", "moomin_server"];

const defaultDateRange = () => {
  const defaultEnd = new Date().toISOString().slice(0, 10);
  const d = new Date(defaultEnd + "T12:00:00");
  d.setDate(d.getDate() - 6);
  return { from: d.toISOString().slice(0, 10), to: defaultEnd };
};

export function Dashboard() {
  const location = useLocation();
  const [latest, setLatest] = useState<SummaryRow | null>(null);
  const [previous, setPrevious] = useState<SummaryRow | null>(null);
  const [trendData, setTrendData] = useState<SummaryRow[]>([]);
  const [topMissing, setTopMissing] = useState<TopMissingRow[] | undefined>(undefined);
  const [clientServerDiscrepancy, setClientServerDiscrepancy] = useState<
    SessionsPurchasesRow[]
  >([]);
  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(new Set(EVENTS));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(
    () => {
      const state = location.state as { dateRange?: { from: string; to: string }; ga4Property?: Ga4PropertyValue[] } | null;
      if (state?.dateRange) return state.dateRange;
      return defaultDateRange();
    }
  );
  const [ga4Property, setGa4Property] = useState<Ga4PropertyValue[]>(() => {
    const state = location.state as { ga4Property?: Ga4PropertyValue[] } | null;
    return state?.ga4Property ?? DEFAULT_GA4_PROPERTY;
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const options = dateRange
      ? { from: dateRange.from, to: dateRange.to, ga4Property }
      : { days: 7, ga4Property };
    fetchDashboard(options)
      .then((res) => {
        if (!cancelled) {
          setLatest(res.latest ?? null);
          setTrendData(res.trend);
          setPrevious(res.previous ?? null);
          setTopMissing(res.topMissing);
          setClientServerDiscrepancy(res.clientServerDiscrepancy ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange, ga4Property]);

  const overallHealthScore = latest
    ? Math.round(
        EVENTS.reduce((sum, ev) => sum + qualityFromSummary(latest, ev), 0) / EVENTS.length
      )
    : 0;

  const previousOverallHealthScore = previous
    ? Math.round(
        EVENTS.reduce((sum, ev) => sum + qualityFromSummary(previous, ev), 0) / EVENTS.length
      )
    : undefined;

  const eventData = latest
    ? EVENTS.map((name, index) => {
        const percentage = qualityFromSummary(latest, name);
        const previousPercentage = previous
          ? qualityFromSummary(previous, name)
          : undefined;
        return {
          name,
          percentage,
          previousPercentage,
          index,
        };
      })
    : [];

  const chartData = trendData.map((row) => {
    const point: Record<string, string | number> = {
      date: row.date.slice(5),
    };
    EVENTS.forEach((ev) => {
      point[ev] = qualityFromSummary(row, ev);
    });
    return point;
  });

  const clientServerSummary = useMemo(() => {
    if (!clientServerDiscrepancy.length) return null;

    const totals: Record<
      string,
      {
        sessions: number;
        purchases: number;
      }
    > = {};

    for (const row of clientServerDiscrepancy) {
      if (!totals[row.ga4_property]) {
        totals[row.ga4_property] = { sessions: 0, purchases: 0 };
      }
      totals[row.ga4_property].sessions += row.session_count;
      totals[row.ga4_property].purchases += row.purchase_count;
    }

    const properties = Object.keys(totals);
    if (properties.length < 2) return null;

    const preferredOrder = ["moomin_client", "moomin_server"].filter((p) =>
      properties.includes(p)
    );
    const [clientProp, serverProp] =
      preferredOrder.length === 2 ? preferredOrder : [properties[0], properties[1]];

    const client = totals[clientProp];
    const server = totals[serverProp];

    const sessionsRatio =
      server.sessions > 0 ? client.sessions / server.sessions : null;
    const purchasesRatio =
      server.purchases > 0 ? client.purchases / server.purchases : null;

    return {
      clientProp,
      serverProp,
      sessions: {
        client: client.sessions,
        server: server.sessions,
        ratio: sessionsRatio,
        diff: client.sessions - server.sessions,
      },
      purchases: {
        client: client.purchases,
        server: server.purchases,
        ratio: purchasesRatio,
        diff: client.purchases - server.purchases,
      },
    };
  }, [clientServerDiscrepancy]);

  const toggleEvent = (event: string) => {
    setVisibleEvents((prev) => {
      const next = new Set(prev);
      if (next.has(event)) {
        next.delete(event);
      } else {
        next.add(event);
      }
      return next;
    });
  };

  const discrepancyColor = (ratio: number) => {
    const absPct = Math.abs((ratio - 1) * 100);
    if (absPct <= 10) return "text-green-500";
    if (absPct <= 20) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-700 p-4 text-red-200">
            {error}
          </div>
        )}

        {/* Header - always visible */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              PULSE
            </h1>
            <p className="mt-2 text-slate-300">
              Performance & Unified Logging Surveillance Engine
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            <label className="flex items-center gap-2">
              <span className="text-sm">Date range:</span>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Select date range"
              />
            </label>
            <Ga4PropertyPicker
              value={ga4Property}
              onChange={setGa4Property}
            />
          </div>
        </div>

        {/* Overall Health Score */}
        <div className="mb-8">
          {loading ? (
            <DashboardSkeleton.HealthScore />
          ) : (
            <HealthScore
              score={overallHealthScore}
              previousScore={previousOverallHealthScore}
              topMissing={topMissing}
            />
          )}
        </div>

        {/* Client/Server Discrepancy - Sessions & Purchases */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Client/Server Discrepancy
          </h2>
          {loading ? (
            <DashboardSkeleton.Scorecards />
          ) : clientServerSummary ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-slate-300 mb-2">
                  Sessions
                </h3>
                {clientServerSummary.sessions.ratio != null ? (
                  <div
                    className={`text-3xl font-bold tabular-nums mb-4 ${discrepancyColor(
                      clientServerSummary.sessions.ratio
                    )}`}
                  >
                    {Math.abs(
                      (clientServerSummary.sessions.ratio - 1) * 100
                    ).toFixed(1)}
                    %
                  </div>
                ) : null}
                <dl className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-slate-400 shrink-0">Client</dt>
                    <dd className="tabular-nums font-medium text-white">
                      {numberFormatter.format(
                        clientServerSummary.sessions.client
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-slate-400 shrink-0">Server</dt>
                    <dd className="tabular-nums font-medium text-white">
                      {numberFormatter.format(
                        clientServerSummary.sessions.server
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-slate-300 mb-2">
                  Purchases
                </h3>
                {clientServerSummary.purchases.ratio != null ? (
                  <div
                    className={`text-3xl font-bold tabular-nums mb-4 ${discrepancyColor(
                      clientServerSummary.purchases.ratio
                    )}`}
                  >
                    {Math.abs(
                      (clientServerSummary.purchases.ratio - 1) * 100
                    ).toFixed(1)}
                    %
                  </div>
                ) : null}
                <dl className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-slate-400 shrink-0">Client</dt>
                    <dd className="tabular-nums font-medium text-white">
                      {numberFormatter.format(
                        clientServerSummary.purchases.client
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-slate-400 shrink-0">Server</dt>
                    <dd className="tabular-nums font-medium text-white">
                      {numberFormatter.format(
                        clientServerSummary.purchases.server
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <p className="text-slate-400 py-8">
                No session/purchase discrepancy data for the selected range.
              </p>
            </div>
          )}
        </div>

        {/* Trend Overview - Line Chart */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Trend Overview
          </h2>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            {loading ? (
              <DashboardSkeleton.Chart />
            ) : chartData.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-4 mb-4">
                  {EVENTS.map((ev) => (
                    <label
                      key={ev}
                      className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={visibleEvents.has(ev)}
                        onChange={() => toggleEvent(ev)}
                        className="rounded"
                      />
                      <span>{ev.replace(/_/g, " ")}</span>
                    </label>
                  ))}
                </div>
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        {[
                          "#22c55e",
                          "#3b82f6",
                          "#a855f7",
                          "#f59e0b",
                          "#ef4444",
                          "#06b6d4",
                        ].map((color, i) => (
                          <linearGradient
                            key={i}
                            id={`fill-${i}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={color}
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="100%"
                              stopColor={color}
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8" }}
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
                      {EVENTS.filter((ev) => visibleEvents.has(ev)).map((ev) => {
                        const colors = [
                          "#22c55e",
                          "#3b82f6",
                          "#a855f7",
                          "#f59e0b",
                          "#ef4444",
                          "#06b6d4",
                        ];
                        const idx = EVENTS.indexOf(ev);
                        const color = colors[idx % colors.length];
                        const fillId = `url(#fill-${idx % colors.length})`;
                        return (
                          <Area
                            key={ev}
                            type="monotone"
                            dataKey={ev}
                            name={ev.replace(/_/g, " ")}
                            stroke={color}
                            strokeWidth={2}
                            fill={fillId}
                            dot={{ fill: color }}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="text-slate-400 py-8">No trend data available.</p>
            )}
          </div>
        </div>

        {/* Event Scorecards */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Event Quality Metrics</h2>
          {loading ? (
            <DashboardSkeleton.Scorecards />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventData.map((event) => (
                <EventScorecard
                  key={event.name}
                  eventName={event.name}
                  percentage={event.percentage}
                  previousPercentage={event.previousPercentage}
                  index={event.index}
                  latestDate={latest?.date}
                  dateRange={dateRange}
                  ga4Property={ga4Property}
                />
              ))}
            </div>
          )}
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center text-sm text-slate-400">
          Last updated: {latest?.date ? new Date(latest.date + "T12:00:00").toLocaleString() : "—"}
        </div>
      </div>
    </div>
  );
}
