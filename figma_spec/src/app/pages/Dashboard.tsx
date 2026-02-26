import { useEffect, useState } from "react";
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
import { HealthScore } from "../components/HealthScore";
import { EventScorecard } from "../components/EventScorecard";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import {
  EVENTS,
  fetchDashboard,
  qualityFromSummary,
  type SummaryRow,
} from "../api";

export function Dashboard() {
  const [latest, setLatest] = useState<SummaryRow | null>(null);
  const [trendData, setTrendData] = useState<SummaryRow[]>([]);
  const [visibleEvents, setVisibleEvents] = useState<Set<string>>(new Set(EVENTS));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDashboard(7)
      .then((res) => {
        if (!cancelled) {
          setLatest(res.latest ?? null);
          setTrendData(res.trend);
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
  }, []);

  const overallHealthScore = latest
    ? Math.round(
        EVENTS.reduce((sum, ev) => sum + qualityFromSummary(latest, ev), 0) / EVENTS.length
      )
    : 0;

  const eventData = latest
    ? EVENTS.map((name, index) => {
        const percentage = qualityFromSummary(latest, name);
        const prevRow = trendData.length >= 2 ? trendData[trendData.length - 2] : null;
        const previousPercentage = prevRow ? qualityFromSummary(prevRow, name) : undefined;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-700 p-4 text-red-200">
            {error}
          </div>
        )}

        {/* Header - always visible */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Web Tracking Data Quality Dashboard
          </h1>
          <p className="mt-2 text-slate-300">
            Monitor the health and quality of your tracking events
          </p>
        </div>

        {/* Overall Health Score */}
        <div className="mb-8">
          {loading ? (
            <DashboardSkeleton.HealthScore />
          ) : (
            <HealthScore score={overallHealthScore} />
          )}
        </div>

        {/* Trend Overview - Line Chart */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Trend Overview (Last 7 Days)
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
                    <LineChart data={chartData}>
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
                      {EVENTS.filter((ev) => visibleEvents.has(ev)).map((ev, i) => {
                        const colors = [
                          "#22c55e",
                          "#3b82f6",
                          "#a855f7",
                          "#f59e0b",
                          "#ef4444",
                          "#06b6d4",
                        ];
                        return (
                          <Line
                            key={ev}
                            type="monotone"
                            dataKey={ev}
                            name={ev.replace(/_/g, " ")}
                            stroke={colors[i % colors.length]}
                            strokeWidth={2}
                            dot={{ fill: colors[i % colors.length] }}
                          />
                        );
                      })}
                    </LineChart>
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
