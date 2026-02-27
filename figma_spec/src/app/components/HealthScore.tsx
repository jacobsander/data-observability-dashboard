import { CheckCircle2, AlertCircle, XCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TopMissingRow } from "../api";

interface HealthScoreProps {
  score: number;
  previousScore?: number;
  topMissing?: TopMissingRow[];
}

export function HealthScore({ score, previousScore, topMissing }: HealthScoreProps) {
  const getTrend = () => {
    if (previousScore == null) return { icon: null, color: "text-slate-400", value: "—" };
    const diff = score - previousScore;
    if (diff > 0) {
      return { icon: TrendingUp, color: "text-green-500", value: `+${diff}%` };
    } else if (diff < 0) {
      return { icon: TrendingDown, color: "text-red-500", value: `${diff}%` };
    } else {
      return { icon: Minus, color: "text-gray-400", value: "0%" };
    }
  };
  const trend = getTrend();
  const TrendIcon = trend.icon;
  const getHealthStatus = (score: number) => {
    if (score >= 67) {
      return {
        label: "Good",
        icon: CheckCircle2,
        color: "text-green-500",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700",
      };
    } else if (score >= 34) {
      return {
        label: "Warning",
        icon: AlertCircle,
        color: "text-yellow-500",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700",
      };
    } else {
      return {
        label: "Critical",
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700",
      };
    }
  };

  const status = getHealthStatus(score);
  const Icon = status.icon;

  return (
    <div className={`${status.bgColor} ${status.borderColor} border-2 rounded-lg p-8 shadow-lg`}>
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="flex items-start gap-4 min-w-0">
          <div>
            <p className="text-sm text-slate-400 mb-2">Overall Health Score</p>
            <div className="flex items-center gap-3">
              <span className={`text-5xl font-bold ${status.color} transition-transform duration-300 hover:scale-110 inline-block cursor-default`}>{score}%</span>
              <Icon className={`${status.color} w-12 h-12`} />
              <div className={`flex items-center gap-1 ${trend.color}`}>
                {TrendIcon && <TrendIcon className="w-4 h-4" />}
                <span className="text-sm font-medium">{trend.value}</span>
              </div>
            </div>
            <p className={`${status.color} mt-2 font-medium`}>{status.label}</p>
          </div>
        </div>
        {topMissing && topMissing.length > 0 && (
          <div className="md:border-l md:border-slate-700 md:pl-10 md:ml-4 md:min-w-[240px] shrink-0">
            <p className="text-sm text-slate-400 mb-2">Insights</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {topMissing.map((row) => (
                <li key={`${row.event_name}-${row.param_name}`} className="flex items-baseline gap-1">
                  <span className="text-slate-500">•</span>
                  <span>
                    {row.event_name.replace(/_/g, " ")}: {row.param_name.replace(/_/g, " ")} — {row.pct_missing}% missing
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}