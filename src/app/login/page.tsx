'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, SUPABASE_CONFIG_ERROR } from '@/src/lib/auth/supabase-browser-client';

const supabase = getSupabaseBrowserClient();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    if (!supabase) {
      setError(SUPABASE_CONFIG_ERROR);
      setSubmitting(false);
      return;
    }

    if (recoveryMode) {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (recoveryError) {
        setError('Parola yenileme bağlantısı gönderilemedi. E-posta adresini kontrol edin.');
      } else {
        setNotice('Parola yenileme bağlantısı e-posta adresinize gönderildi.');
      }
      setSubmitting(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Giriş başarısız. E-posta ve şifreyi kontrol edin.');
      setSubmitting(false);
      return;
    }

    router.replace('/operations');
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="mouseai-brand-mark">M</span><strong>MouseAI</strong></div>
        <div className="auth-heading">
          <p className="eyebrow">Güvenli çalışma alanı</p>
          <h1>{recoveryMode ? 'Şifrenizi yenileyin' : 'Hesabınıza giriş yapın'}</h1>
          <p>AI ekibinizin görevlerini güvenli ve ölçülebilir biçimde yönetin.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            E-posta
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-input"
            />
          </label>

          {!recoveryMode && <label>
            Şifre
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input"
            />
          </label>}

          {error && <p role="alert" className="auth-alert error">{error}</p>}

          <button disabled={submitting} type="submit" className="primary-button auth-submit">
            {submitting ? (recoveryMode ? 'Bağlantı gönderiliyor…' : 'Giriş yapılıyor…') : (recoveryMode ? 'Yenileme bağlantısı gönder' : 'Giriş yap')}
          </button>
          {notice && <p role="status" className="auth-alert success">{notice}</p>}
          <button type="button" onClick={() => { setRecoveryMode((value) => !value); setError(null); setNotice(null); }} className="auth-toggle">
            {recoveryMode ? 'Giriş ekranına dön' : 'Şifremi unuttum'}
          </button>
        </form>
      </section>
    </main>
  );
}
