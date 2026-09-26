import React from 'react';

export interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: number;
  color?: 'cyan' | 'green' | 'orange' | 'red' | 'purple' | 'blue';
}

const colorClasses = {
  cyan: { gradient: 'from-cyan-400 to-blue-500', border: 'border-cyan-500/30 hover:border-cyan-500/60', shadow: 'hover:shadow-cyan-500/20', text: 'text-cyan-400' },
  blue: { gradient: 'from-blue-400 to-blue-600', border: 'border-blue-500/30 hover:border-blue-500/60', shadow: 'hover:shadow-blue-500/20', text: 'text-blue-400' },
  green: { gradient: 'from-green-400 to-emerald-500', border: 'border-green-500/30 hover:border-green-500/60', shadow: 'hover:shadow-green-500/20', text: 'text-green-400' },
  orange: { gradient: 'from-orange-400 to-red-500', border: 'border-orange-500/30 hover:border-orange-500/60', shadow: 'hover:shadow-orange-500/20', text: 'text-orange-400' },
  red: { gradient: 'from-red-400 to-pink-500', border: 'border-red-500/30 hover:border-red-500/60', shadow: 'hover:shadow-red-500/20', text: 'text-red-400' },
  purple: { gradient: 'from-purple-400 to-pink-500', border: 'border-purple-500/30 hover:border-purple-500/60', shadow: 'hover:shadow-purple-500/20', text: 'text-purple-400' },
};

export function KpiCard({
  label,
  value,
  icon,
  trend,
  color = 'cyan',
}: KpiCardProps) {
  const colors = colorClasses[color];

  return (
    <div
      className={`relative group overflow-hidden rounded-2xl p-6 border ${colors.border} bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${colors.shadow}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700/0 to-slate-700/0 group-hover:from-slate-700/20 group-hover:to-slate-700/10 transition-all duration-300"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400 text-sm font-medium">{label}</span>
          {icon && (
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white opacity-80 group-hover:opacity-100 transition-opacity`}>
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
          {trend !== undefined && (
            <span className={`text-sm font-semibold mb-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${colors.gradient} group-hover:h-1.5 transition-all duration-300`} style={{ width: '0%' }}></div>
    </div>
  );
}
