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
import {
  EVENTS,
  fetchSummary,
  fetchSummaryLatest,
  qualityFromSummary,
  type SummaryRow,
} from "../api";

function getDateRange(days = 7): { from: string; to: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

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

    const { from, to } = getDateRange(7);

    Promise.all([fetchSummaryLatest(), fetchSummary(from, to)])
      .then(([latestRes, rangeRes]) => {
        if (cancelled) return;
        setLatest(latestRes ?? null);
        setTrendData(rangeRes);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-700 p-4 text-red-200">
            {error}
          </div>
        )}

        {/* Header */}
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
          <HealthScore score={overallHealthScore} />
        </div>

        {/* Trend Overview - Line Chart */}
        {chartData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Trend Overview (Last 7 Days)
            </h2>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
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
            </div>
          </div>
        )}

        {/* Event Scorecards */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Event Quality Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventData.map((event) => (
              <EventScorecard
                key={event.name}
                eventName={event.name}
                percentage={event.percentage}
                previousPercentage={event.previousPercentage}
                index={event.index}
              />
            ))}
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center text-sm text-slate-400">
          Last updated: {latest?.date ? new Date(latest.date + "T12:00:00").toLocaleString() : "—"}
        </div>
      </div>
    </div>
  );
}
