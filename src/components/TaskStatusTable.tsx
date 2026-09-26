'use client';

import React from 'react';

export interface TaskStatusRow {
  id: string;
  department: string;
  taskName: string;
  status: 'active' | 'in_progress' | 'review' | 'waiting' | 'completed';
  assignee: string;
  progress: number;
  updated: string;
}

interface TaskStatusTableProps {
  data: TaskStatusRow[];
  loading?: boolean;
}

const statusConfig = {
  active: { label: 'Aktif', bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400', borderColor: 'border-cyan-500/30' },
  in_progress: { label: 'Devam Ediyor', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', borderColor: 'border-blue-500/30' },
  review: { label: 'İnceleme Altında', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', borderColor: 'border-orange-500/30' },
  waiting: { label: 'Bekleme', bgColor: 'bg-red-500/20', textColor: 'text-red-400', borderColor: 'border-red-500/30' },
  completed: { label: 'Tamamlandı', bgColor: 'bg-green-500/20', textColor: 'text-green-400', borderColor: 'border-green-500/30' },
};

export function TaskStatusTable({ data, loading = false }: TaskStatusTableProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm overflow-hidden">
        <div className="p-8 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full mx-auto mb-4"></div>
          Yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-900/50">
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Bölüm
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Görev
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                İlerleme
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Sorumlu
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Güncelleme
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {data.map((row) => {
              const status = statusConfig[row.status];
              return (
                <tr
                  key={row.id}
                  className="hover:bg-slate-800/50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 text-sm text-slate-300 font-medium">{row.department}</td>
                  <td className="px-6 py-4 text-sm text-slate-200">{row.taskName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${status.bgColor} ${status.textColor} ${status.borderColor}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full max-w-xs h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                          style={{ width: `${row.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-400 min-w-fit">{row.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{row.assignee}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{row.updated}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="p-8 text-center text-slate-400">
          Görev bulunamadı
        </div>
      )}
    </div>
  );
}
