'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExecutionTimeline } from '@/src/components/ExecutionTimeline';
import { getBrowserAuthHeaders } from '@/src/lib/auth/browser-session';

type Checkpoint = { id: string; step_id: string; state: Record<string, unknown>; created_at: string };
type Task = { id: string; status: string; workflow_id: string; input: Record<string, unknown>; output?: Record<string, unknown>; error?: string; created_at: string; started_at?: string; completed_at?: string; cost_actual?: number; checkpoints?: Checkpoint[] };

const label = (status: string) => status.split('_').join(' ');

export default function TaskWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const headers = await getBrowserAuthHeaders();
        const taskResponse = await fetch(`/api/tasks/${id}`, { headers, cache: 'no-store' });
        const taskPayload = await taskResponse.json();
        if (!taskResponse.ok) throw new Error(taskPayload.error?.code === 'AUTH_ERROR' ? 'Oturum açmanız gerekiyor.' : 'Görev bulunamadı.');
        if (mounted) { setTask(taskPayload.data); setCheckpoints(taskPayload.data.checkpoints ?? []); }
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : 'Görev yüklenemedi.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [id]);

  const timeline = checkpoints.map((checkpoint, index) => {
    const status = String(checkpoint.state.status ?? 'completed');
    return { number: index + 1, name: checkpoint.step_id, status: status === 'completed' ? 'completed' as const : status === 'running' ? 'current' as const : 'pending' as const, description: String(checkpoint.state.message ?? checkpoint.state.result ?? ''), timestamp: new Date(checkpoint.created_at).toLocaleString('tr-TR') };
  });

  if (loading) return <div className="surface-section">Görev yükleniyor…</div>;
  if (error || !task) return <div className="task-detail-page"><Link href="/operations" className="text-blue-600">← Çalışma alanına dön</Link><div className="inline-alert">{error ?? 'Görev bulunamadı.'}</div></div>;

  const title = String(task.input.name ?? task.input.title ?? `Görev ${task.id.slice(0, 8)}`);
  return (
    <div className="task-detail-page"><Link href="/operations" className="back-link">← Çalışma alanına dön</Link><div className="task-detail-heading"><div><p className="eyebrow">Görev yürütme</p><h1>{title}</h1><p>Görev ID: {task.id}</p></div><span className="status-pill status-info">{label(task.status)}</span></div><div className="task-metrics"><div><small>Durum</small><strong>{label(task.status)}</strong></div><div><small>İş akışı</small><strong>{task.workflow_id}</strong></div><div><small>Checkpoint</small><strong>{checkpoints.length}</strong></div><div><small>Gerçek maliyet</small><strong>{task.cost_actual === undefined ? 'Bekleniyor' : `$${task.cost_actual.toFixed(4)}`}</strong></div></div>{task.error && <div className="inline-alert">{task.error}</div>}<section className="surface-section task-detail-section"><div className="section-heading"><div><h2>Yürütme zaman çizelgesi</h2><p>MouseAI’nin görevi hangi adımlardan geçirdiğini görün.</p></div><span className="status-pill status-info">Canlı kayıt</span></div>{timeline.length ? <ExecutionTimeline checkpoints={timeline} /> : <p className="empty-state">Henüz checkpoint oluşmadı. Inngest worker başladığında burada görünecek.</p>}</section><section className="surface-section task-detail-section"><div className="section-heading"><div><h2>Çıktı</h2><p>Doğrulanmış sonuç ve teslim kayıtları.</p></div></div><pre className="output-json">{task.output ? JSON.stringify(task.output, null, 2) : 'Henüz çıktı yok.'}</pre></section></div>
  );
}
