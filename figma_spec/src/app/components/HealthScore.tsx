import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface HealthScoreProps {
  score: number;
}

export function HealthScore({ score }: HealthScoreProps) {
  const getHealthStatus = (score: number) => {
    if (score >= 90) {
      return {
        label: "Excellent",
        icon: CheckCircle2,
        color: "text-green-500",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700",
      };
    } else if (score >= 70) {
      return {
        label: "Good",
        icon: CheckCircle2,
        color: "text-emerald-500",
        bgColor: "bg-slate-800",
        borderColor: "border-slate-700",
      };
    } else if (score >= 50) {
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-2">Overall Health Score</p>
          <div className="flex items-center gap-3">
            <span className="text-5xl font-bold text-green-500 transition-transform duration-300 hover:scale-110 inline-block cursor-default">{score}%</span>
            <Icon className={`${status.color} w-12 h-12`} />
          </div>
          <p className={`${status.color} mt-2 font-medium`}>{status.label}</p>
        </div>
      </div>
    </div>
  );
}