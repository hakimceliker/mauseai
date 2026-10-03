'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, SUPABASE_CONFIG_ERROR } from '@/src/lib/auth/supabase-browser-client';

const supabase = getSupabaseBrowserClient();

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;
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
    if (!supabase) return setError(SUPABASE_CONFIG_ERROR);
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
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="auth-brand-mark">M</span><span>MouseAI</span></div>
        <div className="auth-heading"><h1>Yeni şifre belirleyin</h1><p>Hesabınızı güvenli bir şekilde güncelleyin.</p></div>
        {!ready ? (
          <p className="auth-alert error">Bağlantı geçersiz veya süresi dolmuş. Giriş ekranından yeni bağlantı isteyin.</p>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label>Yeni şifre<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="auth-input" /></label>
            <label>Yeni şifre tekrar<input required type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="auth-input" /></label>
            {error && <p role="alert" className="auth-alert error">{error}</p>}
            {notice && <p role="status" className="auth-alert success">{notice}</p>}
            <button disabled={submitting} type="submit" className="primary-button auth-submit">{submitting ? 'Güncelleniyor…' : 'Şifreyi güncelle'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
