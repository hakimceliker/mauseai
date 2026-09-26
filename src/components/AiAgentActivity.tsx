import React from 'react';

export interface AgentStatus {
  name: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  tasksCompleted: number;
  currentTask?: string;
  lastActivity: string;
  uptime: string;
}

interface AiAgentActivityProps {
  agents: AgentStatus[];
}

const statusConfig = {
  active: { label: 'Aktif', bgColor: 'bg-green-500/20', textColor: 'text-green-400', borderColor: 'border-green-500/30', dot: 'bg-green-500' },
  idle: { label: 'Boş', bgColor: 'bg-slate-500/20', textColor: 'text-slate-400', borderColor: 'border-slate-500/30', dot: 'bg-slate-500' },
  busy: { label: 'Meşgul', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  error: { label: 'Hata', bgColor: 'bg-red-500/20', textColor: 'text-red-400', borderColor: 'border-red-500/30', dot: 'bg-red-500' },
};

export function AiAgentActivity({ agents }: AiAgentActivityProps) {
  return (
    <div className="space-y-4">
      {agents.map((agent) => {
        const status = statusConfig[agent.status];
        return (
          <div
            key={agent.name}
            className="p-4 rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm hover:border-slate-700 transition-colors duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${status.dot} animate-pulse`}></div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{agent.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{agent.currentTask || 'Bekleniyor...'}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${status.bgColor} ${status.textColor} ${status.borderColor}`}>
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/30">
                <div className="text-slate-400 mb-1">Tamamlanan</div>
                <div className="text-base font-bold text-cyan-400">{agent.tasksCompleted}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/30">
                <div className="text-slate-400 mb-1">Çalışma Süresi</div>
                <div className="text-base font-bold text-green-400">{agent.uptime}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/30">
                <div className="text-slate-400 mb-1">Son Aktivite</div>
                <div className="text-base font-bold text-blue-400">{agent.lastActivity}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
