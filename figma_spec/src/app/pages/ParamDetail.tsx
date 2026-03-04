import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { DateRangePicker } from "../components/DateRangePicker";
import type { DateRangeValue } from "../components/DateRangePicker";
import { Ga4PropertyPicker } from "../components/Ga4PropertyPicker";
import type { Ga4PropertyValue } from "../components/Ga4PropertyPicker";
import { fetchParamDetail } from "../api";
import type { ParamDetailRow } from "../api";

const DEFAULT_GA4_PROPERTY: Ga4PropertyValue[] = ["moomin_prod", "moomin_test"];

/** Format event_timestamp (microseconds) as time string */
function formatEventTime(eventTimestamp: number): string {
  if (!eventTimestamp) return "—";
  const ms = Math.floor(eventTimestamp / 1000);
  const d = new Date(ms);
  return d.toISOString().slice(11, 23);
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

export function ParamDetail() {
  const { eventName, paramName } = useParams<{ eventName: string; paramName: string }>();
  const location = useLocation();
  const state = location.state as { dateRange?: DateRangeValue; ga4Property?: Ga4PropertyValue[] } | null;
  const [dateRange, setDateRange] = useState<DateRangeValue | null>(() => {
    if (state?.dateRange) return state.dateRange;
    return defaultDateRange();
  });
  const [ga4Property, setGa4Property] = useState<Ga4PropertyValue[]>(
    () => state?.ga4Property ?? DEFAULT_GA4_PROPERTY
  );
  const [rows, setRows] = useState<ParamDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventName || !paramName) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const range =
      dateRange?.from && dateRange?.to
        ? { from: dateRange.from, to: dateRange.to }
        : undefined;
    fetchParamDetail(eventName, paramName, 20, range, ga4Property)
      .then((data) => {
        if (!cancelled) setRows(data);
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
  }, [eventName, paramName, dateRange?.from, dateRange?.to, ga4Property]);

  const displayParamName = paramName?.replace(/_/g, " ") ?? "";
  const displayEventName = eventName?.replace(/_/g, " ") ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-700 p-4 text-red-200">
            {error}
          </div>
        )}

        <Link
          to={eventName ? `/event/${eventName}` : "/"}
          state={dateRange || ga4Property ? { dateRange, ga4Property } : undefined}
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to {displayEventName} Event
        </Link>

        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white capitalize">
                {displayParamName} details
              </h1>
              <p className="mt-2 text-slate-300">
                Most recent values for this parameter
                {eventName && <> • Event: {displayEventName}</>}
                {dateRange && ` • ${dateRange.from} – ${dateRange.to}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-slate-300">
              <label className="flex items-center gap-2">
                <span className="text-sm">Date range:</span>
                <DateRangePicker
                  value={dateRange}
                  onChange={(range) => setDateRange(range ?? defaultDateRange())}
                  placeholder="Select date range"
                />
              </label>
              <Ga4PropertyPicker value={ga4Property} onChange={setGa4Property} />
            </div>
          </div>
        </div>

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
                <p className="text-sm text-slate-400 mb-1">Recent values</p>
                <p className="text-4xl font-bold text-white">{rows.length}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Most recent actual values
          </h2>
          {loading ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <div className="h-64 flex items-center justify-center bg-slate-800/50">
                <p className="text-slate-400">Loading...</p>
              </div>
            </div>
          ) : rows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="min-w-full divide-y divide-slate-700">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Actual value
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      QA status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-800/50">
                  {rows.map((row, idx) => (
                    <tr key={`${row.date}-${row.event_timestamp}-${idx}`} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {row.date}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                        {formatEventTime(row.event_timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {row.actual_value || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            row.qa_status === "VALID"
                              ? "text-green-400"
                              : row.qa_status === "MISSING_KEY"
                                ? "text-red-400"
                                : "text-yellow-400"
                          }
                        >
                          {row.qa_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !error && (
              <p className="text-slate-400">
                No recent values found for this parameter.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
