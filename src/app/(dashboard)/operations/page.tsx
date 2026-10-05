'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getBrowserAuthHeaders } from '@/src/lib/auth/browser-session';

type Task = { id: string; status: string; input: Record<string, unknown>; created_at: string; completed_at?: string; output?: Record<string, unknown> };
type Agent = { name: string; code: string; color: string; status: string; task: string; progress: number | null };

const demoAgents: Agent[] = [
  { name: 'GPT', code: 'GPT', color: 'mint', status: 'Demo', task: 'Demo görevi', progress: 70 },
  { name: 'Claude', code: 'CL', color: 'orange', status: 'Demo', task: 'Demo görevi', progress: 45 },
  { name: 'Research Agent', code: 'R', color: 'purple', status: 'Demo', task: 'Demo görevi', progress: 80 },
];

function taskTitle(task: Task) { return String(task.input.name ?? task.input.title ?? task.input.description ?? `Görev ${task.id.slice(0, 8)}`); }
function statusLabel(status: string) {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'pending') return 'Bekliyor';
  if (status === 'planning') return 'Planlanıyor';
  if (status === 'running') return 'Devam Ediyor';
  if (status === 'waiting_approval' || status === 'paused') return 'Onay Bekliyor';
  if (status === 'failed' || status === 'cancelled') return 'İnceleme';
  return 'Durum doğrulanıyor';
}
function statusClass(status: string) {
  if (status === 'completed') return 'status-success';
  if (status === 'waiting_approval' || status === 'paused' || status === 'pending') return 'status-warning';
  if (status === 'failed' || status === 'cancelled') return 'status-danger';
  return 'status-info';
}
function taskAgent(task: Task): string | null {
  const value = task.input.agent ?? task.input.provider;
  return typeof value === 'string' && value.trim() ? value : null;
}

export default function OperationsDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayLabel, setTodayLabel] = useState('güncel tarih');
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    setTodayLabel(new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeZone: 'Europe/Istanbul' }).format(new Date()));
    let mounted = true;
    async function load() {
      try {
        const response = await fetch('/api/tasks', { headers: await getBrowserAuthHeaders(), cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.code === 'AUTH_ERROR' ? 'Oturum açmanız gerekiyor.' : 'Görevler alınamadı.');
        if (mounted) setTasks(payload.data ?? []);
      } catch (cause) { if (mounted) setError(cause instanceof Error ? cause.message : 'Görevler alınamadı.'); }
      finally { if (mounted) setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => ({
    running: tasks.filter((task) => ['planning', 'running'].includes(task.status)).length,
    waiting: tasks.filter((task) => ['waiting_approval', 'paused', 'pending'].includes(task.status)).length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);
  const activeTask = useMemo(() => tasks.find((task) => ['planning', 'running', 'waiting_approval', 'paused', 'pending'].includes(task.status)), [tasks]);
  const liveAgents = useMemo(() => {
    const seen = new Map<string, Agent>();
    tasks.forEach((task) => {
      const name = taskAgent(task);
      if (name && !seen.has(name)) seen.set(name, { name, code: name.slice(0, 3).toUpperCase(), color: 'blue', status: statusLabel(task.status), task: taskTitle(task), progress: null });
    });
    return [...seen.values()];
  }, [tasks]);
  const agents = demoMode ? demoAgents : liveAgents;

  return (
    <div className="workspace-page">
      <section className="workspace-hero"><div><p className="eyebrow">Bugün {todayLabel}</p><h1>Bugün neyi MouseAI ekibine devredelim?</h1><p>Hedefini söyle, gerisini ekibin halletsin. Araştır, analiz et, uygula, senin için sonuçlandırsın.</p></div><Link href="/tasks/new" className="primary-button">+ Yeni hedef ata</Link></section>
      <section id="ai-team" className="surface-section"><div className="section-heading"><div><h2>AI Ekibim</h2><p>{demoMode ? 'Demo görünüm — gerçek çalışma kanıtı değildir.' : 'Tenant kapsamındaki kanıtlanmış ajan etkinliği.'}</p></div><Link href="#ai-team">Tüm ekibi gör →</Link></div>{agents.length === 0 ? <div className="empty-state"><strong>Henüz ajan etkinliği yok</strong><span>Gerçek tenant görevleri oluştuğunda ajan durumu burada görünecek.</span></div> : <div className="agent-grid">{agents.map((agent) => <article className="agent-card" key={agent.name}><div className={`agent-mark ${agent.color}`}>{agent.code}</div><div className="agent-card-body"><div className="agent-title"><strong>{agent.name}</strong><span className="online-dot">● {agent.status}</span></div><small>Atanan görev</small><p>{agent.task}</p>{agent.progress === null ? <em>İlerleme kanıtı yok</em> : <div className="agent-progress"><span style={{ width: `${agent.progress}%` }} /><em>%{agent.progress}</em></div>}</div></article>)}</div>}</section>
      <div className="workspace-grid">
        <section className="surface-section task-inbox"><div className="section-heading"><div><h2>Görev Gelen Kutusu</h2><p>MouseAI ekibinin tüm işlerini tek yerden takip et.</p></div><button className="sort-button">Son güncelleme⌄</button></div><div className="task-tabs"><button className="task-tab active">Tümü <b>{tasks.length}</b></button><button className="task-tab">Devam Ediyor <b>{stats.running}</b></button><button className="task-tab">Tamamlandı <b>{stats.completed}</b></button><button className="task-tab">Beklemede <b>{stats.waiting}</b></button></div>{error && <div className="inline-alert">{error} {error.includes('Oturum') && <Link href="/login">Giriş yap</Link>}</div>}{loading ? <div className="empty-state">Görevler yükleniyor...</div> : tasks.length === 0 ? <div className="empty-state"><strong>Henüz görev yok</strong><span>İlk hedefini vererek MouseAI ekibini çalıştır.</span><Link href="/tasks/new" className="primary-button">Yeni hedef ata</Link></div> : <div className="task-list">{tasks.map((task) => <Link className="task-row" href={`/tasks/${task.id}`} key={task.id}><span className="task-type">{task.status === 'completed' ? '✓' : 'T'}</span><span className="task-copy"><strong>{taskTitle(task)}</strong><small>Tenant çalışma alanı</small></span><span className="task-agent">{taskAgent(task) ?? 'MouseAI'}</span><span className={`status-pill ${statusClass(task.status)}`}>{statusLabel(task.status)}</span><span className="task-time">{new Date(task.completed_at ?? task.created_at).toLocaleString('tr-TR')}</span><span className="row-more">···</span></Link>)}</div>}</section>
        <aside className="handoff-panel"><div className="handoff-header"><div><h2>Görev Devri</h2><p>Canlı yürütme ve insan onayı</p></div><span className="close-mark">×</span></div>{activeTask ? <><div className="handoff-summary"><strong>{taskTitle(activeTask)}</strong><p>{statusLabel(activeTask.status)} · {activeTask.id}</p></div><ol className="handoff-timeline"><li className="complete"><span>✓</span><div><strong>Görev kaydı alındı</strong><small>{new Date(activeTask.created_at).toLocaleString('tr-TR')}</small></div></li><li className="current"><span>•</span><div><strong>{statusLabel(activeTask.status)}</strong><small>Checkpoint ve çıktı kanıtı görev detayında tutulur.</small><Link href={`/tasks/${activeTask.id}`}>Detayları gör →</Link></div></li></ol><div className="handoff-outputs"><h3>Çıktılar</h3><div className="empty-state">Henüz doğrulanmış çıktı yok.</div></div></> : <div className="empty-state"><strong>Aktif görev devri yok</strong><span>Aktif bir görev oluştuğunda yürütme ve onay durumu burada gösterilecek.</span></div>}</aside>
      </div>
      <section id="knowledge" className="surface-section"><div className="section-heading"><div><h2>Bilgi Kaynakları</h2><p>Tenant kapsamındaki bilgi kaynakları henüz yapılandırılmadı.</p></div></div></section>
      <section id="integrations" className="surface-section"><div className="section-heading"><div><h2>Entegrasyonlar</h2><p>Bağlantılar, yalnızca gerçek yapılandırma ve kanıt oluştuğunda gösterilir.</p></div></div></section>
      <section id="reports" className="surface-section"><div className="section-heading"><div><h2>Raporlar</h2><p>Henüz doğrulanmış rapor bulunmuyor.</p></div></div></section>
      <section id="settings" className="surface-section"><div className="section-heading"><div><h2>Ayarlar</h2><p>Tenant ayarları güvenli oturumla yapılandırılacak.</p></div></div></section>
      <section className="quick-actions"><span>MouseAI ekibine bir görev ver...</span><Link href="/tasks/new">Araştır</Link><Link href="/tasks/new">Analiz et</Link><Link href="/tasks/new">Rapor hazırla</Link><Link href="/tasks/new">Veri topla</Link><Link href="/tasks/new">CRM’e kaydet</Link></section>
    </div>
  );
}
