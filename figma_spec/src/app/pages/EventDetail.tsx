import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { ParameterQualityCard } from "../components/ParameterQualityCard";
import { fetchDrilldown, fetchSummaryLatest } from "../api";
import type { DrilldownRow } from "../api";

function qualityFromRow(row: DrilldownRow): number {
  const total = row.event_count || 1;
  const valid = total - (row.invalid_count || 0);
  return Math.round((valid / total) * 1000) / 10;
}

function missingPercentFromRow(row: DrilldownRow): number {
  const total = row.event_count || 1;
  return Math.round(((row.invalid_count || 0) / total) * 1000) / 10;
}

export function EventDetail() {
  const { eventName } = useParams<{ eventName: string }>();
  const [drilldown, setDrilldown] = useState<DrilldownRow[]>([]);
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventName) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSummaryLatest()
      .then((latest) => {
        const d = latest?.date ?? new Date().toISOString().slice(0, 10);
        if (cancelled) return;
        setDate(d);
        return fetchDrilldown(d, eventName);
      })
      .then((rows) => {
        if (!cancelled) setDrilldown(rows);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventName]);

  const parameters = drilldown.map((row) => ({
    name: row.param_name,
    quality: qualityFromRow(row),
    coverage: qualityFromRow(row),
  }));

  const avgQuality =
    parameters.length > 0
      ? parameters.reduce((sum, p) => sum + p.quality, 0) / parameters.length
      : 0;

  const topOffenders = [...drilldown]
    .sort((a, b) => missingPercentFromRow(b) - missingPercentFromRow(a))
    .slice(0, 10)
    .map((row) => ({
      name: row.param_name.replace(/_/g, " "),
      missing: missingPercentFromRow(row),
    }));

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

        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white capitalize">
            {eventName?.replace(/_/g, " ")} Event
          </h1>
          <p className="mt-2 text-slate-300">
            Parameter quality breakdown {date && `• ${date}`}
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Average Parameter Quality</p>
              <p className="text-4xl font-bold text-white">{avgQuality.toFixed(1)}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 mb-1">Total Parameters</p>
              <p className="text-4xl font-bold text-white">{parameters.length}</p>
            </div>
          </div>
        </div>

        {/* Top Offenders Bar Chart */}
        {topOffenders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Top Offenders</h2>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topOffenders}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8" }}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value}% missing`, "Missing %"]}
                    />
                    <Bar
                      dataKey="missing"
                      fill="#ef4444"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Parameter Quality Cards */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Parameter Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parameters.map((param) => (
              <ParameterQualityCard
                key={param.name}
                parameterName={param.name}
                quality={param.quality}
                coverage={param.coverage}
              />
            ))}
          </div>
          {parameters.length === 0 && !error && (
            <p className="text-slate-400">No parameter data available for this event.</p>
          )}
        </div>
      </div>
    </div>
  );
}
