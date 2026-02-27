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
import { DateRangePicker } from "../components/DateRangePicker";
import type { DateRangeValue } from "../components/DateRangePicker";
import { fetchDrilldown } from "../api";
import type { DrilldownRow } from "../api";

function qualityFromRow(row: DrilldownRow): number {
  const total = row.event_count || 1;
  const valid = total - (row.invalid_count || 0);
  return Math.round((valid / total) * 1000) / 10;
}

/** Aggregate drilldown rows across multiple dates: sum event_count and invalid_count per param */
function aggregateDrilldownAcrossDates(allRows: DrilldownRow[][]): DrilldownRow[] {
  const byParam = new Map<string, { event_count: number; invalid_count: number }>();
  const sampleRow = new Map<string, DrilldownRow>();
  for (const rows of allRows) {
    for (const row of rows) {
      const key = row.param_name;
      const existing = byParam.get(key);
      const ec = row.event_count || 0;
      const ic = row.invalid_count || 0;
      if (existing) {
        existing.event_count += ec;
        existing.invalid_count += ic;
      } else {
        byParam.set(key, { event_count: ec, invalid_count: ic });
        sampleRow.set(key, row);
      }
    }
  }
  return Array.from(byParam.entries()).map(([param_name, { event_count, invalid_count }]) => ({
    ...sampleRow.get(param_name)!,
    param_name,
    event_count,
    invalid_count,
  }));
}

function missingPercentFromRow(row: DrilldownRow): number {
  const total = row.event_count || 1;
  return Math.round(((row.invalid_count || 0) / total) * 1000) / 10;
}

/** All dates from fromStr to toStr inclusive (YYYY-MM-DD), oldest first */
function datesInRange(fromStr: string, toStr: string): string[] {
  const from = new Date(fromStr + "T12:00:00");
  const to = new Date(toStr + "T12:00:00");
  const result: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

const defaultDateRange = (): DateRangeValue => {
  const end = new Date().toISOString().slice(0, 10);
  const start = (() => {
    const d = new Date(end + "T12:00:00");
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  })();
  return { from: start, to: end };
};

export function EventDetail() {
  const { eventName } = useParams<{ eventName: string }>();
  const location = useLocation();
  const state = location.state as { date?: string; dateRange?: DateRangeValue } | null;
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(() => {
    if (state?.dateRange) return state.dateRange;
    if (state?.date) {
      const end = new Date(state.date + "T12:00:00");
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { from: start.toISOString().slice(0, 10), to: state.date };
    }
    return defaultDateRange();
  });
  const [drilldown, setDrilldown] = useState<DrilldownRow[]>([]);
  const [drilldownByDate, setDrilldownByDate] = useState<Map<string, DrilldownRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleTopOffenders, setVisibleTopOffenders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!eventName || !dateRange) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const range = dateRange;
    const dates = datesInRange(range.from, range.to);
    Promise.all(dates.map((dt) => fetchDrilldown(dt, eventName)))
      .then((allRows) => {
        if (cancelled) return;
        const byDate = new Map<string, DrilldownRow[]>();
        dates.forEach((dt, i) => byDate.set(dt, allRows[i]));
        setDrilldownByDate(byDate);
        const aggregated = aggregateDrilldownAcrossDates(allRows);
        setDrilldown(aggregated);
        const top5 = [...aggregated]
          .sort((a, b) => missingPercentFromRow(b) - missingPercentFromRow(a))
          .slice(0, 5)
          .map((r) => r.param_name);
        setVisibleTopOffenders(new Set(top5));
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
  }, [eventName, dateRange]);

  const handleDateRangeChange = (range: DateRangeValue | null) => {
    setDateRange(range ?? defaultDateRange());
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
                Parameter quality breakdown
                {dateRange &&
                  ` • ${dateRange.from} – ${dateRange.to}`}
              </p>
            </div>
            <label className="flex items-center gap-2 text-slate-300">
              <span className="text-sm">Date range:</span>
              <DateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                placeholder="Select date range"
              />
            </label>
          </div>
        </div>

        {/* Summary Card */}
        {loading ? (
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 rounded-lg p-6 mb-8">
            <div className="flex justify-between">
              <div className="h-16 w-40 rounded bg-slate-600 animate-pulse" />
              <div className="h-16 w-24 rounded bg-slate-600 animate-pulse" />
            </div>
          </div>
        ) : (
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
        )}

        {/* Top Offenders - Line curves over time (like front page) */}
        {loading ? (
          <div className="mb-8">
            <div className="h-6 w-48 rounded bg-slate-700 animate-pulse mb-4" />
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 h-80 flex items-center justify-center">
              <p className="text-slate-400">Loading chart...</p>
            </div>
          </div>
        ) : topOffenderParams.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Top Offenders (Selected Range)
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
        ) : null}

        {/* Parameter Details Table */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Parameter Details</h2>
          {loading ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <div className="h-64 flex items-center justify-center bg-slate-800/50">
                <p className="text-slate-400">Loading parameters...</p>
              </div>
            </div>
          ) : drilldown.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="min-w-full divide-y divide-slate-700">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Parameter
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">
                      Events with parameter
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">
                      Events missing
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">
                      % with parameter
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-800/50">
                  {drilldown.map((row) => {
                    const validCount = (row.event_count || 0) - (row.invalid_count || 0);
                    const pct = qualityFromRow(row);
                    const pctColor =
                      pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
                    return (
                      <tr key={row.param_name} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-white capitalize">
                          {row.param_name.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right">
                          {validCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300 text-right">
                          {(row.invalid_count || 0).toLocaleString()}
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold text-right ${pctColor}`}>
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            !error && (
              <p className="text-slate-400">
                No parameter data available for this event in the selected date range.
                Try selecting a different range from the dashboard.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
