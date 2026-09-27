'use client';

import React, { useEffect, useState } from 'react';
import { KpiCard } from '@/src/components/KpiCard';
import { TaskStatusTable, TaskStatusRow } from '@/src/components/TaskStatusTable';
import { AiAgentActivity, AgentStatus } from '@/src/components/AiAgentActivity';

export default function OperationsDashboard() {
  const [tasks, setTasks] = useState<TaskStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats] = useState({
    activeTasks: 342,
    inProgress: 287,
    underReview: 32,
    waiting: 6,
    completed: 1204,
  });

  // Sample AI agents for demonstration
  const agents: AgentStatus[] = [
    {
      name: 'GPT-4',
      status: 'active',
      tasksCompleted: 156,
      currentTask: 'İçerik oluşturma görevini işliyor',
      lastActivity: '30 saniye',
      uptime: '4.5 saat',
    },
    {
      name: 'Claude',
      status: 'active',
      tasksCompleted: 203,
      currentTask: 'Veri analizi yapıyor',
      lastActivity: '10 saniye',
      uptime: '5.2 saat',
    },
    {
      name: 'CRM Aracı',
      status: 'busy',
      tasksCompleted: 89,
      currentTask: 'Müşteri taraması gerçekleştiriyor',
      lastActivity: '2 saniye',
      uptime: '3.1 saat',
    },
    {
      name: 'Tarayıcı Aracı',
      status: 'idle',
      tasksCompleted: 45,
      currentTask: 'Web scraping beklemede',
      lastActivity: '5 dakika',
      uptime: '2.8 saat',
    },
    {
      name: 'Araştırma Aracı',
      status: 'active',
      tasksCompleted: 178,
      currentTask: 'Araştırma yazısı hazırlıyor',
      lastActivity: '15 saniye',
      uptime: '4.9 saat',
    },
  ];

  // Sample task data
  const sampleTasks: TaskStatusRow[] = [
    {
      id: '1',
      department: 'Pazarlama',
      taskName: 'Q4 Kampanya Planlaması',
      status: 'in_progress',
      assignee: 'Claude',
      progress: 75,
      updated: '2 dakika',
    },
    {
      id: '2',
      department: 'Satış',
      taskName: 'Müşteri Analizi Raporu',
      status: 'in_progress',
      assignee: 'GPT-4',
      progress: 45,
      updated: '5 dakika',
    },
    {
      id: '3',
      department: 'İK',
      taskName: 'Eğitim Programı Tasarımı',
      status: 'review',
      assignee: 'Claude',
      progress: 90,
      updated: '10 dakika',
    },
    {
      id: '4',
      department: 'Finans',
      taskName: 'Aylık Mali Özet',
      status: 'in_progress',
      assignee: 'Araştırma Aracı',
      progress: 60,
      updated: '3 dakika',
    },
    {
      id: '5',
      department: 'Operasyon',
      taskName: 'Envanter Güncellemesi',
      status: 'waiting',
      assignee: 'Tarayıcı Aracı',
      progress: 30,
      updated: '15 dakika',
    },
    {
      id: '6',
      department: 'Ürün',
      taskName: 'Yeni Özellik Specifikasyonu',
      status: 'completed',
      assignee: 'Claude',
      progress: 100,
      updated: '1 saat',
    },
  ];

  useEffect(() => {
    // Simulate loading tasks from API
    setLoading(true);
    const timer = setTimeout(() => {
      setTasks(sampleTasks);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <div className="flex items-center gap-3 text-amber-200">
          <span aria-hidden="true">●</span>
          <span><strong>Demo görünümü:</strong> Örnek KPI ve görevler gösteriliyor; canlı tenant verisi henüz bağlanmadı.</span>
        </div>
        <span className="hidden rounded-full border border-amber-400/30 px-3 py-1 text-xs text-amber-300 sm:inline">MOCK DATA</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white">İşlem Paneli</h1>
        <p className="text-slate-400">AI görevlerinin gerçek zamanlı durumunu ve performansını izleyin</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Aktif Görevler"
          value={stats.activeTasks}
          color="cyan"
          trend={12}
          icon={<span className="text-xl">⚡</span>}
        />
        <KpiCard
          label="Devam Ediyor"
          value={stats.inProgress}
          color="blue"
          trend={8}
          icon={<span className="text-xl">🔄</span>}
        />
        <KpiCard
          label="İnceleme Altında"
          value={stats.underReview}
          color="orange"
          trend={-3}
          icon={<span className="text-xl">👁️</span>}
        />
        <KpiCard
          label="Bekleme"
          value={stats.waiting}
          color="red"
          trend={2}
          icon={<span className="text-xl">⏳</span>}
        />
        <KpiCard
          label="Tamamlandı"
          value={stats.completed}
          color="green"
          trend={25}
          icon={<span className="text-xl">✓</span>}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Task Status Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Görev Durumu</h2>
            <p className="text-sm text-slate-400">Departman bazında görev izlemesi</p>
          </div>
          <TaskStatusTable data={tasks} loading={loading} />
        </div>

        {/* Approval Queue */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Onay Gerekli</h2>
            <p className="text-sm text-slate-400">{stats.underReview} görev incelenmede</p>
          </div>

          <div className="space-y-3">
            {[
              { id: '1', task: 'Q4 Kampanya Stratejisi', priority: 'high', department: 'Pazarlama' },
              { id: '2', task: 'Mali Tahminler 2025', priority: 'high', department: 'Finans' },
              { id: '3', task: 'Ürün Lansmanı Planı', priority: 'medium', department: 'Ürün' },
            ].map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm hover:border-slate-700 transition-colors duration-200 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    {item.task}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {item.priority === 'high' ? 'Acil' : 'Orta'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{item.department}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Agent Activity */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">AI Aracı Aktivitesi</h2>
          <p className="text-sm text-slate-400">Aktif AI aracılarının durumu ve performansı</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AiAgentActivity agents={agents.slice(0, 3)} />
          <AiAgentActivity agents={agents.slice(3)} />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Ortalama Yanıt Süresi</h3>
          <div className="text-3xl font-bold text-cyan-400 mb-2">2.3 saniye</div>
          <div className="text-xs text-slate-400">Son 24 saat ortalaması</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Başarı Oranı</h3>
          <div className="text-3xl font-bold text-green-400 mb-2">98.7%</div>
          <div className="text-xs text-slate-400">Tamamlanan görevler</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Sistem Yükü</h3>
          <div className="text-3xl font-bold text-blue-400 mb-2">67%</div>
          <div className="text-xs text-slate-400">Normal işlem kapasitesi</div>
        </div>
      </div>
    </div>
  );
}
