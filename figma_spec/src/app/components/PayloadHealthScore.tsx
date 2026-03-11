import { CheckCircle2, AlertCircle, XCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PayloadHealthScoreProps {
  score: number;
  previousScore?: number;
}

export function PayloadHealthScore({ score, previousScore }: PayloadHealthScoreProps) {
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

  const getHealthStatus = (s: number) => {
    if (s >= 67) {
      return {
        label: "Good",
        icon: CheckCircle2,
        color: "text-green-500",
      };
    } else if (s >= 34) {
      return {
        label: "Warning",
        icon: AlertCircle,
        color: "text-yellow-500",
      };
    } else {
      return {
        label: "Critical",
        icon: XCircle,
        color: "text-red-500",
      };
    }
  };

  const status = getHealthStatus(score);
  const Icon = status.icon;

  return (
    <div className="bg-slate-800 border-2 border-slate-700 rounded-lg p-8 shadow-lg">
      <p className="text-sm text-slate-400 mb-2">Payload Health Score</p>
      <div className="flex items-center gap-3">
        <div className="flex items-start gap-0.5">
        <span className={`text-5xl font-bold ${status.color}`}>{Math.round(score)}</span>
        <span className={`text-lg font-bold ${status.color} pt-1`}>/100</span>
      </div>
        <Icon className={`${status.color} w-12 h-12`} />
        <div className={`flex items-center gap-1 ${trend.color}`}>
          {TrendIcon && <TrendIcon className="w-4 h-4" />}
          <span className="text-sm font-medium">{trend.value}</span>
        </div>
      </div>
      <p className={`${status.color} mt-2 font-medium`}>{status.label}</p>
    </div>
  );
}
