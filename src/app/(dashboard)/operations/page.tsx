'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getBrowserAuthHeaders } from '@/src/lib/auth/browser-session';

type Task = { id: string; status: string; input: Record<string, unknown>; created_at: string; completed_at?: string };
type Agent = { name: string; code: string; color: string; status: string; task: string; progress: number };

const agents: Agent[] = [
  { name: 'GPT', code: 'GPT', color: 'mint', status: 'Çevrimiçi', task: 'Pazarlama stratejisini özetliyor', progress: 70 },
  { name: 'Claude', code: 'CL', color: 'orange', status: 'Çevrimiçi', task: 'Rakip analizi raporunu düzenliyor', progress: 45 },
  { name: 'Research Agent', code: 'R', color: 'purple', status: 'Çevrimiçi', task: 'Sektör trendlerini araştırıyor', progress: 80 },
  { name: 'Browser Agent', code: 'B', color: 'blue', status: 'Çevrimiçi', task: 'Web sitelerinden veri topluyor', progress: 60 },
  { name: 'CRM Agent', code: 'CRM', color: 'green', status: 'Çevrimiçi', task: 'Potansiyel müşterileri zenginleştiriyor', progress: 30 },
];

function taskTitle(task: Task) { return String(task.input.name ?? task.input.title ?? task.input.description ?? `Görev ${task.id.slice(0, 8)}`); }
function statusLabel(status: string) { if (status === 'completed') return 'Tamamlandı'; if (status === 'waiting_approval' || status === 'paused') return 'Onay Bekliyor'; if (status === 'failed' || status === 'cancelled') return 'İnceleme'; return 'Devam Ediyor'; }
function statusClass(status: string) { if (status === 'completed') return 'status-success'; if (status === 'waiting_approval' || status === 'paused') return 'status-warning'; if (status === 'failed' || status === 'cancelled') return 'status-danger'; return 'status-info'; }

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
      } catch (cause) { if (mounted) setError(cause instanceof Error ? cause.message : 'Görevler alınamadı.'); }
      finally { if (mounted) setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => ({
    running: tasks.filter((task) => ['planning', 'running'].includes(task.status)).length,
    waiting: tasks.filter((task) => ['waiting_approval', 'paused'].includes(task.status)).length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks]);

  return (
    <div className="workspace-page">
      <section className="workspace-hero"><div><p className="eyebrow">Bugün 2 Ekim 2026, Cuma</p><h1>Bugün neyi MouseAI ekibine devredelim?</h1><p>Hedefini söyle, gerisini ekibin halletsin. Araştır, analiz et, uygula, senin için sonuçlandırsın.</p></div><Link href="/tasks/new" className="primary-button">+ Yeni hedef ata</Link></section>
      <section id="ai-team" className="surface-section"><div className="section-heading"><div><h2>AI Ekibim</h2><p>Uzman ajanların birlikte çalışmaya hazır.</p></div><Link href="#ai-team">Tüm ekibi gör →</Link></div><div className="agent-grid">{agents.map((agent) => <article className="agent-card" key={agent.name}><div className={`agent-mark ${agent.color}`}>{agent.code}</div><div className="agent-card-body"><div className="agent-title"><strong>{agent.name}</strong><span className="online-dot">● {agent.status}</span></div><small>Atanan görev</small><p>{agent.task}</p><div className="agent-progress"><span style={{ width: `${agent.progress}%` }} /><em>%{agent.progress}</em></div></div></article>)}</div></section>
      <div className="workspace-grid">
        <section className="surface-section task-inbox"><div className="section-heading"><div><h2>Görev Gelen Kutusu</h2><p>MouseAI ekibinin tüm işlerini tek yerden takip et.</p></div><button className="sort-button">Son güncelleme⌄</button></div><div className="task-tabs"><button className="task-tab active">Tümü <b>{tasks.length}</b></button><button className="task-tab">Devam Ediyor <b>{stats.running}</b></button><button className="task-tab">Tamamlandı <b>{stats.completed}</b></button><button className="task-tab">Beklemede <b>{stats.waiting}</b></button></div>{error && <div className="inline-alert">{error} {error.includes('Oturum') && <Link href="/login">Giriş yap</Link>}</div>}{loading ? <div className="empty-state">Görevler yükleniyor...</div> : tasks.length === 0 ? <div className="empty-state"><strong>Henüz görev yok</strong><span>İlk hedefini vererek MouseAI ekibini çalıştır.</span><Link href="/tasks/new" className="primary-button">Yeni hedef ata</Link></div> : <div className="task-list">{tasks.map((task) => <Link className="task-row" href={`/tasks/${task.id}`} key={task.id}><span className="task-type">{task.status === 'completed' ? '✓' : 'T'}</span><span className="task-copy"><strong>{taskTitle(task)}</strong><small>Tenant çalışma alanı</small></span><span className="task-agent">MouseAI</span><span className={`status-pill ${statusClass(task.status)}`}>{statusLabel(task.status)}</span><span className="task-time">{new Date(task.completed_at ?? task.created_at).toLocaleString('tr-TR')}</span><span className="row-more">···</span></Link>)}</div>}</section>
        <aside className="handoff-panel"><div className="handoff-header"><div><h2>Görev Devri</h2><p>Canlı yürütme ve insan onayı</p></div><span className="close-mark">×</span></div><div className="handoff-summary"><strong>Rakip analizi raporu hazırla</strong><p>Son 6 ayda Türk pazarındaki 5 rakibi analiz et ve fırsatları çıkar.</p></div><ol className="handoff-timeline"><li className="complete"><span>✓</span><div><strong>Görev alındı</strong><small>İstek kaydedildi · 2 dk önce</small></div></li><li className="complete"><span>CL</span><div><strong>Claude devraldı</strong><small>Analiz için kaynak topluyor</small></div></li><li className="current"><span>R</span><div><strong>Çalışma devam ediyor</strong><small>12 kaynaktan veri toplandı</small><a href="#details">Detayları gör →</a></div></li><li><span>○</span><div><strong>Tamamlanacak</strong><small>Tahmini 1 saat sonra</small></div></li></ol><div className="handoff-outputs"><h3>Çıktılar <b>2</b></h3><div className="output-card"><span className="file-badge pdf">PDF</span><span><strong>Rakip Analizi (Taslak)</strong><small>PDF · 1.2 MB</small></span><button aria-label="PDF indir">↓</button></div><div className="output-card"><span className="file-badge sheet">XLS</span><span><strong>Veri Tablosu</strong><small>XLSX · 320 KB</small></span><button aria-label="Tablo indir">↓</button></div></div><div className="next-steps"><h3>Sonraki adımlar</h3><label><input type="checkbox" /> Raporu gözden geçir</label><label><input type="checkbox" /> Gerekirse ek analiz iste</label><label><input type="checkbox" /> Onayla ve paylaş</label></div><button className="secondary-button">Claude’a mesaj gönder</button></aside>
      </div>
      <section className="quick-actions"><span>MouseAI ekibine bir görev ver...</span><Link href="/tasks/new">Araştır</Link><Link href="/tasks/new">Analiz et</Link><Link href="/tasks/new">Rapor hazırla</Link><Link href="/tasks/new">Veri topla</Link><Link href="/tasks/new">CRM’e kaydet</Link></section>
    </div>
  );
}
