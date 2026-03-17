import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";
import type { DateRangeValue } from "./DateRangePicker";
import type { Ga4PropertyValue } from "./Ga4PropertyPicker";

interface EventScorecardProps {
  eventName: string;
  percentage: number;
  previousPercentage?: number;
  index?: number;
  latestDate?: string;
  dateRange?: DateRangeValue | null;
  ga4Property?: Ga4PropertyValue[];
}

export function EventScorecard({ eventName, percentage, previousPercentage, index = 0, latestDate, dateRange, ga4Property }: EventScorecardProps) {
  const getScoreColor = (percentage: number) => {
    if (percentage >= 67) return "text-green-600";
    if (percentage >= 34) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrend = () => {
    if (previousPercentage == null) return { icon: null, color: "text-slate-400", value: "—" };
    const diff = percentage - previousPercentage;
    if (diff > 0) {
      return {
        icon: TrendingUp,
        color: "text-green-500",
        value: `+${diff.toFixed(1)}%`,
      };
    } else if (diff < 0) {
      return {
        icon: TrendingDown,
        color: "text-red-500",
        value: `${diff.toFixed(1)}%`,
      };
    } else {
      return {
        icon: Minus,
        color: "text-gray-400",
        value: "0%",
      };
    }
  };

  const trend = getTrend();
  const TrendIcon = trend.icon;

  return (
    <Link
      to={`/event/${eventName}`}
      state={
        dateRange || ga4Property
          ? { dateRange, ga4Property }
          : latestDate
            ? { date: latestDate }
            : undefined
      }
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
          <h3 className="text-sm font-medium text-slate-300">{eventName}</h3>
          <div className={`flex items-center gap-1 ${trend.color}`}>
            {TrendIcon && <TrendIcon className="w-4 h-4" />}
            <span className="text-xs font-medium">{trend.value}</span>
          </div>
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>
          {percentage}%
        </div>
        <div className="mt-3 bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${
              percentage >= 67
                ? "bg-green-500"
                : percentage >= 34
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </motion.div>
    </Link>
  );
}