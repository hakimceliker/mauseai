'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key',
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setReady(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === 'PASSWORD_RECOVERY' || session)) setReady(true);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 8) return setError('Şifre en az 8 karakter olmalı.');
    if (password !== confirmation) return setError('Şifreler eşleşmiyor.');
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Şifre güncellenemedi. Yeni bir yenileme bağlantısı isteyin.');
    } else {
      setNotice('Şifreniz güncellendi. Giriş ekranına yönlendiriliyorsunuz.');
      await supabase.auth.signOut({ scope: 'global' });
      setTimeout(() => router.replace('/login'), 800);
    }
    setSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">MouseAI</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Yeni şifre belirleyin</h1>
        {!ready ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Bağlantı geçersiz veya süresi dolmuş. Giriş ekranından yeni bağlantı isteyin.</p>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={submit}>
            <label className="block text-sm font-medium text-slate-700">Yeni şifre<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="block text-sm font-medium text-slate-700">Yeni şifre tekrar<input required type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
            <button disabled={submitting} type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Güncelleniyor…' : 'Şifreyi güncelle'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
