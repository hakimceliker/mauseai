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
    <div className="create-task-page">
      <div className="workspace-hero create-task-hero"><div><p className="eyebrow">MouseAI çalışma alanı</p><h1>Ekibine yeni bir hedef ata</h1><p>Hedefi açıkça yaz; MouseAI planı, yürütmeyi ve sonucu senin için takip etsin.</p></div><a className="secondary-button create-back" href="/operations">← Çalışma alanına dön</a></div>
      <form onSubmit={createTask} className="create-task-form">
        <div className="form-heading"><span className="form-mark">M</span><div><h2>Görev tanımı</h2><p>Görev çalıştırılmadan önce hedef ve workflow doğrulanır.</p></div></div>
        <div className="form-field"><label htmlFor="name">Görev adı</label><input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Örn. Q4 pazar analizi" /></div>
        <div className="form-field"><label htmlFor="workflow">Workflow ID</label><input id="workflow" value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} placeholder="Supabase workflows tablosundaki ID" /><small>Sistemde tanımlı olmayan bir workflow ile görev başlatılmaz.</small></div>
        <div className="form-field"><label htmlFor="description">Hedef ve beklenen çıktı</label><textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={6} placeholder="Hedefi, kapsamı ve beklediğiniz çıktıyı yazın…" /></div>
        {state.error && <div role="alert" className="inline-alert">{state.error}</div>}
        <div className="form-footer"><span>İnsan onayı gereken adımlarda sistem durur.</span><button type="submit" disabled={state.loading} className="primary-button">{state.loading ? 'Görev başlatılıyor…' : 'Görevi oluştur ve başlat'}</button></div>
      </form>
    </div>
  );
}
