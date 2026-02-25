interface ParameterQualityCardProps {
  parameterName: string;
  quality: number;
  coverage: number;
}

export function ParameterQualityCard({ parameterName, quality, coverage }: ParameterQualityCardProps) {
  const getQualityColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-400";
    if (percentage >= 70) return "text-emerald-400";
    if (percentage >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-emerald-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
      <h3 className="text-lg font-medium text-white mb-4 capitalize">
        {parameterName.replace(/_/g, " ")}
      </h3>
      
      <div className="space-y-4">
        {/* Quality Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Quality</span>
            <span className={`font-bold ${getQualityColor(quality)}`}>
              {quality.toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getBarColor(quality)} transition-all duration-500`}
              style={{ width: `${quality}%` }}
            />
          </div>
        </div>

        {/* Coverage Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Coverage</span>
            <span className={`font-bold ${getQualityColor(coverage)}`}>
              {coverage.toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getBarColor(coverage)} transition-all duration-500`}
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
