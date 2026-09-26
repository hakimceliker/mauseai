import React from 'react';

export interface AiTeamCardProps {
  name: string;
  status: 'completed' | 'active' | 'available' | 'unavailable';
  capabilities: string[];
  capabilityPercentage: number;
  tasksCompleted: number;
  description: string;
  icon?: string;
}

const statusConfig = {
  completed: { label: 'Tamamlandı', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  active: { label: 'Aktif', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  available: { label: 'Uygun', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  unavailable: { label: 'Uygun Değil', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

export function AiTeamCard({
  name,
  status,
  capabilities,
  capabilityPercentage,
  tasksCompleted,
  description,
  icon = '🤖',
}: AiTeamCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6 hover:border-slate-700 transition-all duration-300 hover:shadow-xl cursor-pointer">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700/0 to-slate-700/0 group-hover:from-slate-700/10 group-hover:to-slate-700/5 transition-all duration-300"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{icon}</div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                {name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{description}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Capability Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Yetenekler</span>
            <span className="text-xs font-semibold text-cyan-400">%{capabilityPercentage}</span>
          </div>
          <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
              style={{ width: `${capabilityPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-2">Yetkinlikler</div>
          <div className="flex flex-wrap gap-2">
            {capabilities.map((capability) => (
              <span
                key={capability}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-900/50 text-slate-300 border border-slate-700/50 group-hover:border-slate-700 transition-colors"
              >
                {capability}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-700/50">
          <div>
            <div className="text-xs text-slate-400 mb-1">Tamamlanan Görev</div>
            <div className="text-xl font-bold text-green-400">{tasksCompleted}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Başarı Oranı</div>
            <div className="text-xl font-bold text-cyan-400">98%</div>
          </div>
        </div>

        {/* Action Button */}
        <button className="w-full mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 font-medium text-sm hover:from-cyan-400/30 hover:to-blue-500/30 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-200">
          Ata
        </button>
      </div>
    </div>
  );
}
