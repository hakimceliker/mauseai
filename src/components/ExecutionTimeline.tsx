import React from 'react';

export interface Checkpoint {
  number: number;
  name: string;
  status: 'completed' | 'current' | 'pending';
  description?: string;
  timestamp?: string;
}

interface ExecutionTimelineProps {
  checkpoints: Checkpoint[];
  currentStep?: number;
}

export function ExecutionTimeline({ checkpoints }: ExecutionTimelineProps) {
  return (
    <div className="space-y-4">
      {checkpoints.map((checkpoint, index) => {
        const isCompleted = checkpoint.status === 'completed';
        const isCurrent = checkpoint.status === 'current';

        return (
          <div key={checkpoint.number} className="flex gap-4">
            {/* Timeline line and node */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : isCurrent
                    ? 'bg-cyan-500/30 text-cyan-400 border-2 border-cyan-500 animate-pulse'
                    : 'bg-slate-700/50 text-slate-400 border border-slate-700'
                }`}
              >
                {isCompleted ? '✓' : checkpoint.number}
              </div>

              {index !== checkpoints.length - 1 && (
                <div
                  className={`w-1 h-12 mt-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-gradient-to-b from-green-500/50 to-slate-700/50'
                      : isCurrent
                      ? 'bg-gradient-to-b from-cyan-500/50 to-slate-700/50'
                      : 'bg-slate-700/30'
                  }`}
                ></div>
              )}
            </div>

            {/* Content */}
            <div
              className={`flex-1 pt-1 rounded-xl border transition-all duration-300 ${
                isCompleted
                  ? 'border-green-500/20 bg-green-500/5'
                  : isCurrent
                  ? 'border-cyan-500/40 bg-cyan-500/10'
                  : 'border-slate-700/30 bg-slate-800/20'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4
                      className={`font-semibold text-sm ${
                        isCompleted
                          ? 'text-green-400'
                          : isCurrent
                          ? 'text-cyan-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {checkpoint.name}
                    </h4>
                    {checkpoint.description && (
                      <p className="text-xs text-slate-400 mt-1">{checkpoint.description}</p>
                    )}
                  </div>
                  {checkpoint.timestamp && (
                    <span className="text-xs text-slate-500 whitespace-nowrap">{checkpoint.timestamp}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
