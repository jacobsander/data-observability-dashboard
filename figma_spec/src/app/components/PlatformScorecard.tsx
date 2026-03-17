import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import type { PlatformSummary } from "../api/marketing";
import type { DateRangeValue } from "./DateRangePicker";

interface PlatformScorecardProps {
  platform: PlatformSummary;
  index?: number;
  dateRange?: DateRangeValue | null;
}

export function PlatformScorecard({ platform, index = 0, dateRange }: PlatformScorecardProps) {
  const getScoreColor = (pct: number) => {
    if (pct >= 67) return "text-green-600";
    if (pct >= 34) return "text-yellow-600";
    return "text-red-600";
  };

  const score = platform.weightedScore ?? platform.matchRate;
  const trend = platform.trend;
  const trendDisplay =
    trend > 0
      ? { icon: TrendingUp, color: "text-green-500", value: `+${trend.toFixed(1)}%` }
      : trend < 0
        ? { icon: TrendingDown, color: "text-red-500", value: `${trend.toFixed(1)}%` }
        : { icon: Minus, color: "text-gray-400", value: "0%" };
  const TrendIcon = trendDisplay.icon;

  return (
    <Link
      to={`/platform/${platform.platformId}`}
      state={dateRange ? { dateRange } : undefined}
      className="block"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        whileHover={{ scale: 1.05 }}
      className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-lg hover:border-border/80 transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300">{platform.name}</h3>
          <div className={`flex items-center gap-1 ${trendDisplay.color}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-xs font-medium">{trendDisplay.value}</span>
          </div>
        </div>
        <div className={`flex items-start gap-0.5 ${getScoreColor(score)}`}>
          <span className="font-bold text-3xl">{Math.round(score * 10) / 10}</span>
          <span className="font-bold text-sm pt-0.5">/100</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">Data quality score</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-300">
          <div>
            <dt className="text-slate-500">Total events</dt>
            <dd className="font-medium text-white tabular-nums">
              {platform.totalEvents.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Failed</dt>
            <dd className="font-medium text-white tabular-nums">
              {platform.failedEvents.toLocaleString()}
            </dd>
          </div>
        </dl>
        <div className="mt-3 bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${
              score >= 67
                ? "bg-green-500"
                : score >= 34
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </motion.div>
    </Link>
  );
}
