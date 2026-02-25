import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";

interface EventScorecardProps {
  eventName: string;
  percentage: number;
  previousPercentage?: number;
  index?: number;
}

export function EventScorecard({ eventName, percentage, previousPercentage, index = 0 }: EventScorecardProps) {
  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-emerald-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrend = () => {
    if (!previousPercentage) return null;
    
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
  const TrendIcon = trend?.icon;

  return (
    <Link to={`/event/${eventName}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        whileHover={{ scale: 1.05 }}
        className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm hover:shadow-lg hover:border-slate-600 transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300">{eventName}</h3>
          {trend && TrendIcon && (
            <div className={`flex items-center gap-1 ${trend.color}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-xs font-medium">{trend.value}</span>
            </div>
          )}
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>
          {percentage}%
        </div>
        <div className="mt-3 bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${
              percentage >= 90
                ? "bg-green-500"
                : percentage >= 70
                ? "bg-emerald-500"
                : percentage >= 50
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