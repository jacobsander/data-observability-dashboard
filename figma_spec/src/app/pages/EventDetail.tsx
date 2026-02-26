import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, Link } from "react-router";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { ParameterQualityCard } from "../components/ParameterQualityCard";
import { DatePicker } from "../components/DatePicker";
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

/** Last N dates ending at endDate (YYYY-MM-DD), oldest first */
function dateRange(endDate: string, days: number): string[] {
  const end = new Date(endDate + "T12:00:00");
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

export function EventDetail() {
  const { eventName } = useParams<{ eventName: string }>();
  const location = useLocation();
  const dateFromState = (location.state as { date?: string } | null)?.date;
  const [drilldown, setDrilldown] = useState<DrilldownRow[]>([]);
  const [drilldownByDate, setDrilldownByDate] = useState<Map<string, DrilldownRow[]>>(new Map());
  const [date, setDate] = useState<string>(dateFromState ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleTopOffenders, setVisibleTopOffenders] = useState<Set<string>>(new Set());

  const loadData = async (d: string) => {
    if (!eventName) return;
    setLoading(true);
    setError(null);
    try {
      const dates = dateRange(d, 7);
      const allRows = await Promise.all(
        dates.map((dt) => fetchDrilldown(dt, eventName))
      );
      const rows = allRows[allRows.length - 1];
      setDrilldown(rows);
      const byDate = new Map<string, DrilldownRow[]>();
      dates.forEach((dt, i) => byDate.set(dt, allRows[i]));
      setDrilldownByDate(byDate);
      setVisibleTopOffenders((prev) => {
        const top5 = [...rows]
          .sort((a, b) => missingPercentFromRow(b) - missingPercentFromRow(a))
          .slice(0, 5)
          .map((r) => r.param_name);
        return new Set(top5.length > 0 ? top5 : prev);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventName) return;
    let cancelled = false;

    const run = async () => {
      let d = date || dateFromState || "";
      if (!d) {
        const latest = await fetchSummaryLatest();
        d = latest?.date ?? new Date().toISOString().slice(0, 10);
      }
      if (!cancelled && !date) setDate(d);
      const dates = dateRange(d, 7);
      const allRows = await Promise.all(
        dates.map((dt) => fetchDrilldown(dt, eventName))
      );
      const rows = allRows[allRows.length - 1];
      if (!cancelled) {
        setDrilldown(rows);
        const byDate = new Map<string, DrilldownRow[]>();
        dates.forEach((dt, i) => byDate.set(dt, allRows[i]));
        setDrilldownByDate(byDate);
        const top5 = [...rows]
          .sort((a, b) => missingPercentFromRow(b) - missingPercentFromRow(a))
          .slice(0, 5)
          .map((r) => r.param_name);
        setVisibleTopOffenders(new Set(top5));
      }
    };

    setLoading(true);
    setError(null);
    run()
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
  }, [eventName, dateFromState]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    loadData(newDate);
  };

  const parameters = drilldown.map((row) => ({
    name: row.param_name,
    quality: qualityFromRow(row),
    coverage: qualityFromRow(row),
  }));

  const avgQuality =
    parameters.length > 0
      ? parameters.reduce((sum, p) => sum + p.quality, 0) / parameters.length
      : 0;

  const topOffenderParams = useMemo(
    () =>
      [...drilldown]
        .sort((a, b) => missingPercentFromRow(b) - missingPercentFromRow(a))
        .slice(0, 5)
        .map((row) => row.param_name),
    [drilldown]
  );

  const topOffendersChartData = useMemo(() => {
    const dates = Array.from(drilldownByDate.keys()).sort();
    return dates.map((dt) => {
      const rows = drilldownByDate.get(dt) ?? [];
      const rowByParam = new Map(rows.map((r) => [r.param_name, r]));
      const point: Record<string, string | number> = {
        date: dt.slice(5),
      };
      topOffenderParams.forEach((param) => {
        const row = rowByParam.get(param);
        point[param] = row ? missingPercentFromRow(row) : 0;
      });
      return point;
    });
  }, [drilldownByDate, topOffenderParams]);

  const toggleTopOffender = (param: string) => {
    setVisibleTopOffenders((prev) => {
      const next = new Set(prev);
      if (next.has(param)) next.delete(param);
      else next.add(param);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="mb-8">
            <div className="h-9 w-48 rounded bg-slate-700 animate-pulse mb-2" />
            <div className="h-5 w-64 rounded bg-slate-700 animate-pulse" />
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <div className="flex justify-between">
              <div className="h-16 w-40 rounded bg-slate-700 animate-pulse" />
              <div className="h-16 w-24 rounded bg-slate-700 animate-pulse" />
            </div>
          </div>
          <div className="text-center py-12">
            <p className="text-slate-400">Loading parameter data...</p>
          </div>
        </div>
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white capitalize">
                {eventName?.replace(/_/g, " ")} Event
              </h1>
              <p className="mt-2 text-slate-300">
                Parameter quality breakdown {date && `• ${date}`}
              </p>
            </div>
            <label className="flex items-center gap-2 text-slate-300">
              <span className="text-sm">Date:</span>
              <DatePicker
                value={date}
                onChange={handleDateChange}
                placeholder="Select date"
              />
            </label>
          </div>
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

        {/* Top Offenders - Line curves over time (like front page) */}
        {topOffenderParams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Top Offenders (Last 7 Days)
            </h2>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div className="flex flex-wrap gap-4 mb-4">
                {topOffenderParams.map((param) => (
                  <label
                    key={param}
                    className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={visibleTopOffenders.has(param)}
                      onChange={() => toggleTopOffender(param)}
                      className="rounded"
                    />
                    <span>{param.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={topOffendersChartData}>
                    <defs>
                      {[
                        "#ef4444",
                        "#f59e0b",
                        "#a855f7",
                        "#3b82f6",
                        "#06b6d4",
                      ].map((color, i) => (
                        <linearGradient
                          key={i}
                          id={`topOffender-fill-${i}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
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
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => `${value}% missing`}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Legend />
                    {topOffenderParams
                      .filter((param) => visibleTopOffenders.has(param))
                      .map((param, idx) => {
                        const colors = [
                          "#ef4444",
                          "#f59e0b",
                          "#a855f7",
                          "#3b82f6",
                          "#06b6d4",
                        ];
                        const color = colors[idx % colors.length];
                        const fillId = `url(#topOffender-fill-${idx % colors.length})`;
                        return (
                          <Area
                            key={param}
                            type="monotone"
                            dataKey={param}
                            name={param.replace(/_/g, " ")}
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
            <p className="text-slate-400">
              No parameter data available for this event on {date || "the selected date"}.
              Try selecting a different date with data from the dashboard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
