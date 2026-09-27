'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserAuthHeaders } from '@/src/lib/auth/browser-session';

export default function NewTaskPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [state, setState] = useState<{ loading: boolean; error?: string }>({ loading: false });

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !workflowId.trim()) { setState({ loading: false, error: 'Görev adı ve workflow ID zorunludur.' }); return; }
    setState({ loading: true });
    try {
      const response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await getBrowserAuthHeaders()) }, body: JSON.stringify({ workflow_id: workflowId.trim(), input: { name: name.trim(), description: description.trim() } }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.code === 'AUTH_ERROR' ? 'Oturum açmanız gerekiyor.' : payload.error?.code === 'SERVER_ERROR' ? 'Görev başlatılamadı. Production bağlantılarını kontrol edin.' : 'Görev oluşturulamadı.');
      router.push(`/tasks/${payload.data.id}`);
    } catch (cause) {
      setState({ loading: false, error: cause instanceof Error ? cause.message : 'Görev oluşturulamadı.' });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div><h1 className="text-4xl font-bold text-slate-900">Yeni Görev Oluştur</h1><p className="text-slate-500">Hedefi gönderin; MouseAI workflow’u Inngest üzerinden yürütür.</p></div>
      <form onSubmit={createTask} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div><label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-800">Görev adı</label><input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Örn. Q4 pazar analizi" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500" /></div>
        <div><label htmlFor="workflow" className="mb-2 block text-sm font-semibold text-slate-800">Workflow ID</label><input id="workflow" value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} placeholder="Supabase workflows tablosundaki ID" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500" /><p className="mt-1 text-xs text-slate-500">Sistemde tanımlı olmayan bir workflow ile görev başlatılmaz.</p></div>
        <div><label htmlFor="description" className="mb-2 block text-sm font-semibold text-slate-800">Açıklama</label><textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder="Hedefi ve beklenen çıktıyı yazın…" className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500" /></div>
        {state.error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">{state.error}</div>}
        <button type="submit" disabled={state.loading} className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{state.loading ? 'Görev başlatılıyor…' : 'Görevi Oluştur ve Başlat'}</button>
      </form>
    </div>
  );
}
