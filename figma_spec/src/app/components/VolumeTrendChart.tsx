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
import type { VolumeTrendPoint } from "../api/marketing";

interface VolumeTrendChartProps {
  data: VolumeTrendPoint[];
}

export function VolumeTrendChart({ data }: VolumeTrendChartProps) {
  return (
    <div className="h-64 md:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="vol-total" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="vol-error" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
          <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Legend />
          <Area
            key="line-total"
            type="monotone"
            dataKey="totalEvents"
            name="Total events"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#vol-total)"
          />
          <Area
            key="line-error"
            type="monotone"
            dataKey="errorEvents"
            name="Error events"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#vol-error)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
