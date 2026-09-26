import type { ReactNode } from 'react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-950/80 backdrop-blur">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard/operations" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                M
              </div>
              <span className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">MauseAI</span>
            </Link>
            <div className="flex gap-6 ml-4">
              <Link
                href="/dashboard/operations"
                className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium"
              >
                İşlem Paneli
              </Link>
              <Link
                href="/dashboard/tasks/new"
                className="text-slate-300 hover:text-cyan-400 transition-colors text-sm font-medium"
              >
                Yeni Görev
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-300">Canlı</span>
            </div>
          </div>
        </nav>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
