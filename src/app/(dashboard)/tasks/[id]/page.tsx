'use client';

import React, { useState, useEffect } from 'react';
import { ExecutionTimeline } from '@/src/components/ExecutionTimeline';
import { ConversationPanel } from '@/src/components/ConversationPanel';

interface PageProps {
  params: {
    id: string;
  };
}

export default function TaskWorkflowPage({ params }: PageProps) {
  const [progress, setProgress] = useState(65);
  const [currentCheckpoint] = useState(6);

  useEffect(() => {
    // Simulate progress updates
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + Math.floor(Math.random() * 5);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const checkpoints = [
    {
      number: 1,
      name: 'Görev Başlatıldı',
      status: 'completed' as const,
      description: 'İş akışı başladı ve parametreler doğrulandı',
      timestamp: '14:32:00',
    },
    {
      number: 2,
      name: 'Veri Hazırlığı',
      status: 'completed' as const,
      description: 'Kaynak veriler toplandı ve işlendi',
      timestamp: '14:33:15',
    },
    {
      number: 3,
      name: 'AI İşleme',
      status: 'completed' as const,
      description: 'Claude AI tarafından analiz yapıldı',
      timestamp: '14:35:42',
    },
    {
      number: 4,
      name: 'GPT-4 Doğrulama',
      status: 'completed' as const,
      description: 'Sonuçlar GPT-4 tarafından doğrulandı',
      timestamp: '14:37:20',
    },
    {
      number: 5,
      name: 'Format Dönüşümü',
      status: 'completed' as const,
      description: 'Çıktı istenilen formata dönüştürüldü',
      timestamp: '14:38:55',
    },
    {
      number: 6,
      name: 'İnsan Tarafından İnceleme',
      status: 'current' as const,
      description: 'İnsan tarafından gözden geçirilmeyi bekliyor',
      timestamp: '14:40:12',
    },
    {
      number: 7,
      name: 'Hata Kontrolü',
      status: 'pending' as const,
      description: 'Kalite kontrol yapılacak',
      timestamp: undefined,
    },
    {
      number: 8,
      name: 'Sonuçlandırma',
      status: 'pending' as const,
      description: 'Çıktılar kayıt edilecek',
      timestamp: undefined,
    },
    {
      number: 9,
      name: 'Bildirim Gönderimi',
      status: 'pending' as const,
      description: 'Kullanıcı haberdar edilecek',
      timestamp: undefined,
    },
    {
      number: 10,
      name: 'Görev Tamamlandı',
      status: 'pending' as const,
      description: 'İş akışı tamamlanacak',
      timestamp: undefined,
    },
  ];

  const messages = [
    {
      id: 'msg-1',
      sender: 'mouseai' as const,
      content: 'Merhaba! Görev başarıyla başlatıldı. Şimdi veri hazırlığına geçiyorum.',
      timestamp: '14:32:05',
    },
    {
      id: 'msg-2',
      sender: 'claude' as const,
      content: 'Veri toplama tamamlandı. 10,500 satır işlendi. Analiz başlıyor...',
      timestamp: '14:35:30',
    },
    {
      id: 'msg-3',
      sender: 'gpt4' as const,
      content: 'Sonuçları gözden geçirdim. Kalite kontrol geçti ve doğrulama yapıldı.',
      timestamp: '14:37:15',
    },
    {
      id: 'msg-4',
      sender: 'system' as const,
      content: 'Sonuçlar Excel ve JSON formatlarında dışa aktarıldı.',
      timestamp: '14:38:50',
    },
    {
      id: 'msg-5',
      sender: 'mouseai' as const,
      content: 'Görev %65 tamamlandı. İnsan tarafından inceleme aşamasındayız.',
      timestamp: '14:40:10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button className="text-slate-400 hover:text-slate-300 transition-colors">
            ← Geri
          </button>
          <h1 className="text-3xl font-bold text-white">Görev Yürütme Akışı</h1>
        </div>
        <p className="text-slate-400">Görev ID: {params.id}</p>
      </div>

      {/* Progress Section */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-2">Genel İlerleme</h2>
            <p className="text-sm text-slate-400">10 adımdan {currentCheckpoint} tamamlandı</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-cyan-400">{progress}%</div>
            <div className="text-xs text-slate-400">Tamamlanma Oranı</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-500 ease-out shadow-lg shadow-cyan-500/20"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="rounded-lg bg-slate-900/50 p-3 border border-green-500/30">
            <div className="text-xs text-slate-400 mb-1">Tamamlandı</div>
            <div className="text-lg font-bold text-green-400">5</div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-3 border border-cyan-500/30">
            <div className="text-xs text-slate-400 mb-1">Devam Ediyor</div>
            <div className="text-lg font-bold text-cyan-400">1</div>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-3 border border-slate-500/30">
            <div className="text-xs text-slate-400 mb-1">Bekleme</div>
            <div className="text-lg font-bold text-slate-400">4</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Execution Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Yürütme Adımları</h2>
            <p className="text-sm text-slate-400">Adım adım ilerleyişi izleyin</p>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6">
            <ExecutionTimeline checkpoints={checkpoints} currentStep={currentCheckpoint} />
          </div>
        </div>

        {/* Task Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Görev Detayları</h2>
            <p className="text-sm text-slate-400">Bilgiler ve istatistikler</p>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6 space-y-4">
            <div className="space-y-3 divide-y divide-slate-700/30">
              <div className="pb-3">
                <div className="text-xs text-slate-400 mb-1">Durum</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-cyan-400">Devam Ediyor</span>
                </div>
              </div>

              <div className="py-3">
                <div className="text-xs text-slate-400 mb-1">Başladı</div>
                <div className="text-sm text-white">14:32:00</div>
              </div>

              <div className="py-3">
                <div className="text-xs text-slate-400 mb-1">Geçen Süre</div>
                <div className="text-sm text-white">8 dakika 12 saniye</div>
              </div>

              <div className="py-3">
                <div className="text-xs text-slate-400 mb-1">Tahmini Tamamlanma</div>
                <div className="text-sm text-white">14:46:30</div>
              </div>

              <div className="py-3">
                <div className="text-xs text-slate-400 mb-1">İş Akışı</div>
                <div className="text-sm text-white">Q4 Pazarlama Analizi</div>
              </div>

              <div className="py-3">
                <div className="text-xs text-slate-400 mb-1">Atayan</div>
                <div className="text-sm text-white">marketing@company.com</div>
              </div>

              <div className="py-3">
                <div className="text-xs text-slate-400 mb-1">AI Aracıları</div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['Claude', 'GPT-4', 'Veri Analizi'].map((agent) => (
                    <span key={agent} className="px-2 py-1 text-xs rounded-full bg-slate-700/50 text-slate-300 border border-slate-700">
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Output Summary */}
          <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Çıktı Özeti</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <span className="text-slate-300">📄 Rapor (Excel)</span>
                <span className="text-slate-500">2.4 MB</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <span className="text-slate-300">📊 Grafik (PNG)</span>
                <span className="text-slate-500">1.1 MB</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <span className="text-slate-300">📑 Özet (PDF)</span>
                <span className="text-slate-500">856 KB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Panel */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Sohbet & Aktivite Günlüğü</h2>
          <p className="text-sm text-slate-400">AI aracıları ve sistem ile gerçek zamanlı iletişim</p>
        </div>
        <ConversationPanel messages={messages} taskId={params.id} />
      </div>
    </div>
  );
}
