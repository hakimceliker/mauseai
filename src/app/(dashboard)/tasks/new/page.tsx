'use client';

import React, { useState } from 'react';
import { AiTeamCard } from '@/src/components/AiTeamCard';

export default function NewTaskPage() {
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const aiTeam = [
    {
      name: 'GPT-4',
      status: 'completed' as const,
      capabilities: ['Metin Analizi', 'Kod Üretimi', 'Özet Çıkarma'],
      capabilityPercentage: 70,
      tasksCompleted: 156,
      description: 'Gelişmiş dil işleme ve analiz',
      icon: '⚡',
    },
    {
      name: 'Claude',
      status: 'completed' as const,
      capabilities: ['Makine Öğrenmesi', 'Veri Bilimi', 'Yazma'],
      capabilityPercentage: 45,
      tasksCompleted: 203,
      description: 'Yapay zeka araştırması ve analiz',
      icon: '🧠',
    },
    {
      name: 'Araştırma Aracı',
      status: 'completed' as const,
      capabilities: ['Web Araştırması', 'Kaynak Taraması', 'Derlemeler'],
      capabilityPercentage: 80,
      tasksCompleted: 89,
      description: 'Kapsamlı araştırma ve bilgi toplama',
      icon: '🔍',
    },
    {
      name: 'Tarayıcı Aracı',
      status: 'available' as const,
      capabilities: ['Web Scraping', 'Veri Ektraksi', 'DOM Analizi'],
      capabilityPercentage: 60,
      tasksCompleted: 45,
      description: 'Web sitelerinden veri çıkarma',
      icon: '🌐',
    },
    {
      name: 'CRM Aracı',
      status: 'available' as const,
      capabilities: ['Veri Yönetimi', 'İş Akışı', 'Entegrasyon'],
      capabilityPercentage: 30,
      tasksCompleted: 78,
      description: 'CRM sistemleri ile entegrasyon',
      icon: '📊',
    },
    {
      name: 'E-posta Aracı',
      status: 'unavailable' as const,
      capabilities: ['E-posta Gönderimi', 'Şablon Yönetimi', 'İzleme'],
      capabilityPercentage: 55,
      tasksCompleted: 234,
      description: 'E-posta kampanyaları ve iletişim',
      icon: '📧',
    },
  ];

  const handleAgentToggle = (agentName: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentName) ? prev.filter((a) => a !== agentName) : [...prev, agentName]
    );
  };

  const handleCreateTask = () => {
    if (taskName.trim() && selectedAgents.length > 0) {
      console.log('Yeni görev oluşturuldu:', {
        taskName,
        taskDescription,
        selectedAgents,
      });
      // Here you would typically send this to an API
      alert(`Görev "${taskName}" başarıyla oluşturuldu!`);
      setTaskName('');
      setTaskDescription('');
      setSelectedAgents([]);
    } else {
      alert('Lütfen görev adı girin ve en az bir AI aracı seçin.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white">Yeni Görev Oluştur</h1>
        <p className="text-slate-400">AI ekibini görevle yükleyin ve otomatik yürütme başlatın</p>
      </div>

      {/* Task Creation Form */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-8 space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white">Görev Adı</label>
          <input
            type="text"
            placeholder="Örn: Q4 Pazarlama Kampanyası Analizi"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-white">Görev Açıklaması</label>
          <textarea
            placeholder="Görevin ayrıntılı açıklamasını girin..."
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all resize-none"
          />
        </div>

        <div className="pt-4 border-t border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-4">Seçilen AI Aracıları ({selectedAgents.length})</h3>
          {selectedAgents.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Henüz AI aracı seçilmedi. Aşağıdan seçin.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedAgents.map((agent) => (
                <div key={agent} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                  <span className="text-sm font-medium">{agent}</span>
                  <button
                    onClick={() => handleAgentToggle(agent)}
                    className="text-lg leading-none hover:text-cyan-300 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleCreateTask}
            disabled={!taskName.trim() || selectedAgents.length === 0}
            className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Görevi Oluştur ve Başlat
          </button>
          <button className="px-6 py-3 rounded-lg border border-slate-700/50 text-slate-300 font-semibold hover:border-slate-700 hover:bg-slate-800/50 transition-all duration-200">
            İptal
          </button>
        </div>
      </div>

      {/* AI Team Selection */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">AI Ekibi Seçin</h2>
          <p className="text-sm text-slate-400">Görevde çalışacak AI aracılarını seçin</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiTeam.map((agent) => (
            <button
              key={agent.name}
              onClick={() => handleAgentToggle(agent.name)}
              className={`text-left transition-all duration-200 ${
                selectedAgents.includes(agent.name)
                  ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-950 rounded-2xl'
                  : ''
              }`}
            >
              <AiTeamCard {...agent} />
            </button>
          ))}
        </div>
      </div>

      {/* Task Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Queue */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Görev Sırası</h2>
            <p className="text-sm text-slate-400">Beklemede olan görevler</p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 1,
                name: 'Q3 Pazarlama Raporu',
                priority: 'high',
                createdAt: '2 saat',
                agents: 2,
              },
              {
                id: 2,
                name: 'Müşteri Veri Temizliği',
                priority: 'medium',
                createdAt: '4 saat',
                agents: 1,
              },
              {
                id: 3,
                name: 'Ürün Önerisi Analizi',
                priority: 'low',
                createdAt: '6 saat',
                agents: 3,
              },
            ].map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm hover:border-slate-700 transition-colors duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors cursor-pointer">
                    {task.name}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.priority === 'high'
                        ? 'bg-red-500/20 text-red-400'
                        : task.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-slate-500/20 text-slate-400'
                    }`}
                  >
                    {task.priority === 'high' ? 'Acil' : task.priority === 'medium' ? 'Orta' : 'Düşük'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{task.createdAt} önce oluşturuldu</span>
                  <span>{task.agents} AI aracı</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Backlog */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Geri Kapanış Listesi</h2>
            <p className="text-sm text-slate-400">Gelecek görevler</p>
          </div>

          <div className="space-y-3">
            {[
              { id: 1, name: 'Y2025 Bütçe Planlaması', date: 'Pazartesi' },
              { id: 2, name: 'Eğitim Programı İnceleme', date: 'Salı' },
              { id: 3, name: 'Endüstri Benchmark Araştırması', date: 'Çarşamba' },
              { id: 4, name: 'Müşteri Memnuniyet Anketi', date: 'Cuma' },
            ].map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-700/30 bg-slate-900/30 backdrop-blur-sm hover:border-slate-700/50 hover:bg-slate-800/40 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                    {item.name}
                  </h4>
                  <span className="text-xs text-slate-500 group-hover:text-slate-400">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Toplam Görevler</h3>
          <div className="text-3xl font-bold text-cyan-400">2,847</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Bu Ay Tamamlanan</h3>
          <div className="text-3xl font-bold text-green-400">542</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Ortalama Süre</h3>
          <div className="text-3xl font-bold text-blue-400">4.2 s</div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Sistem Durumu</h3>
          <div className="text-3xl font-bold text-green-400">Hazır</div>
        </div>
      </div>
    </div>
  );
}
