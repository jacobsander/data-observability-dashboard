import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ErrorDistributionItem } from "../api/marketing";

const CATEGORY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f97316",
  optional: "#64748b",
};

interface ErrorDistributionChartProps {
  data: ErrorDistributionItem[];
}

export function ErrorDistributionChart({ data }: ErrorDistributionChartProps) {
  const chartData = data.map((d) => ({ ...d, fill: CATEGORY_COLORS[d.category] ?? "#64748b" }));

  return (
    <div className="h-64 md:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="70%"
            label={({ name, count }) => `${name}: ${count.toLocaleString()}`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${entry.category}-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [value.toLocaleString(), "Count"]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
