'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExecutionTimeline } from '@/src/components/ExecutionTimeline';
import { getBrowserAuthHeaders } from '@/src/lib/auth/browser-session';

type Task = { id: string; status: string; workflow_id: string; input: Record<string, unknown>; output?: Record<string, unknown>; error?: string; created_at: string; started_at?: string; completed_at?: string; cost_actual?: number };
type Checkpoint = { id: string; step_id: string; state: Record<string, unknown>; created_at: string };

const label = (status: string) => status.split('_').join(' ');

export default function TaskWorkflowPage({ params }: { params: { id: string } }) {
  const [task, setTask] = useState<Task | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const headers = await getBrowserAuthHeaders();
        const [taskResponse, timelineResponse] = await Promise.all([
          fetch(`/api/tasks/${params.id}`, { headers, cache: 'no-store' }),
          fetch(`/api/tasks/${params.id}/timeline`, { headers, cache: 'no-store' }),
        ]);
        const taskPayload = await taskResponse.json();
        const timelinePayload = await timelineResponse.json();
        if (!taskResponse.ok) throw new Error(taskPayload.error?.code === 'AUTH_ERROR' ? 'Oturum açmanız gerekiyor.' : 'Görev bulunamadı.');
        if (mounted) { setTask(taskPayload.data); setCheckpoints(timelinePayload.data ?? []); }
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Görev yüklenemedi.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [params.id]);

  const timeline = checkpoints.map((checkpoint, index) => {
    const status = String(checkpoint.state.status ?? 'completed');
    return { number: index + 1, name: checkpoint.step_id, status: status === 'completed' ? 'completed' as const : status === 'running' ? 'current' as const : 'pending' as const, description: String(checkpoint.state.message ?? checkpoint.state.result ?? ''), timestamp: new Date(checkpoint.created_at).toLocaleString('tr-TR') };
  });

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-500">Görev yükleniyor…</div>;
  if (error || !task) return <div className="space-y-4"><Link href="/operations" className="text-blue-600">← Operasyon paneline dön</Link><div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">{error ?? 'Görev bulunamadı.'}</div></div>;

  const title = String(task.input.name ?? task.input.title ?? `Görev ${task.id.slice(0, 8)}`);
  return (
    <div className="space-y-8">
      <div><Link href="/operations" className="text-sm text-blue-600">← Operasyon paneline dön</Link><h1 className="mt-3 text-3xl font-bold text-slate-900">{title}</h1><p className="text-slate-500">Görev ID: {task.id}</p></div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="text-xs text-slate-500">Durum</div><div className="mt-2 font-semibold text-slate-900">{label(task.status)}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="text-xs text-slate-500">İş akışı</div><div className="mt-2 break-all font-semibold text-slate-900">{task.workflow_id}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="text-xs text-slate-500">Checkpoint</div><div className="mt-2 font-semibold text-slate-900">{checkpoints.length}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="text-xs text-slate-500">Gerçek maliyet</div><div className="mt-2 font-semibold text-slate-900">{task.cost_actual === undefined ? 'Bekleniyor' : `$${task.cost_actual.toFixed(4)}`}</div></div>
      </div>
      {task.error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{task.error}</div>}
      <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-4 text-xl font-bold text-slate-900">Yürütme zaman çizelgesi</h2>{timeline.length ? <ExecutionTimeline checkpoints={timeline} /> : <p className="text-slate-500">Henüz checkpoint oluşmadı. Inngest worker başladığında burada görünecek.</p>}</section>
      <section className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="mb-3 text-xl font-bold text-slate-900">Çıktı</h2><pre className="overflow-auto rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{task.output ? JSON.stringify(task.output, null, 2) : 'Henüz çıktı yok.'}</pre></section>
    </div>
  );
}
