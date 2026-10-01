'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { KpiCard } from '@/src/components/KpiCard';
import { TaskStatusTable, TaskStatusRow } from '@/src/components/TaskStatusTable';
import { getBrowserAuthHeaders } from '@/src/lib/auth/browser-session';

type Task = { id: string; status: string; input: Record<string, unknown>; created_at: string; completed_at?: string };

function taskTitle(task: Task) {
  return String(task.input.name ?? task.input.title ?? task.input.description ?? `Görev ${task.id.slice(0, 8)}`);
}

function statusForTable(status: string): TaskStatusRow['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'waiting_approval' || status === 'paused') return 'waiting';
  if (status === 'failed' || status === 'cancelled') return 'review';
  return status === 'pending' ? 'active' : 'in_progress';
}

export default function OperationsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch('/api/tasks', { headers: await getBrowserAuthHeaders(), cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.code === 'AUTH_ERROR' ? 'Oturum açmanız gerekiyor.' : 'Görevler alınamadı.');
        if (mounted) setTasks(payload.data ?? []);
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Görevler alınamadı.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => ({
    active: tasks.filter((task) => !['completed', 'failed', 'cancelled'].includes(task.status)).length,
    running: tasks.filter((task) => ['planning', 'running'].includes(task.status)).length,
    waiting: tasks.filter((task) => ['waiting_approval', 'paused'].includes(task.status)).length,
    failed: tasks.filter((task) => task.status === 'failed').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);

  const rows: TaskStatusRow[] = tasks.map((task) => ({
    id: task.id,
    department: 'Tenant',
    taskName: taskTitle(task),
    status: statusForTable(task.status),
    assignee: 'MouseAI',
    progress: task.status === 'completed' ? 100 : task.status === 'running' ? 50 : 0,
    updated: new Date(task.completed_at ?? task.created_at).toLocaleString('tr-TR'),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-4xl font-bold text-slate-900">Operasyon Genel Bakışı</h1><p className="text-slate-500">Tenant görevlerinin canlı durumu</p></div>
        <Link href="/tasks/new" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">+ Yeni Görev</Link>
      </div>
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">{error} {error.includes('Oturum') && <Link className="font-semibold underline" href="/login">Giriş yap</Link>}</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Aktif Görevler" value={stats.active} color="cyan" icon={<span>⚡</span>} />
        <KpiCard label="Devam Ediyor" value={stats.running} color="blue" icon={<span>↻</span>} />
        <KpiCard label="Onay Bekliyor" value={stats.waiting} color="orange" icon={<span>◷</span>} />
        <KpiCard label="Hata" value={stats.failed} color="red" icon={<span>!</span>} />
        <KpiCard label="Tamamlandı" value={stats.completed} color="green" icon={<span>✓</span>} />
      </div>
      <section className="space-y-3"><div><h2 className="text-2xl font-bold text-slate-900">Canlı Görevler</h2><p className="text-sm text-slate-500">Supabase tenant verisinden okunuyor.</p></div><TaskStatusTable data={rows} loading={loading} /></section>
      {!loading && !error && tasks.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Bu tenant için henüz görev yok. Yeni görev oluşturarak başlayın.</div>}
    </div>
  );
}
