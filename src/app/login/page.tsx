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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">MouseAI</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Hesabınıza giriş yapın</h1>
          <p className="mt-2 text-sm text-slate-500">Production tenant çalışma alanınıza güvenli erişim sağlayın.</p>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-700">
            E-posta
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Şifre
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button disabled={submitting} type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? (recoveryMode ? 'Bağlantı gönderiliyor…' : 'Giriş yapılıyor…') : (recoveryMode ? 'Yenileme bağlantısı gönder' : 'Giriş yap')}
          </button>
          {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
          <button type="button" onClick={() => { setRecoveryMode((value) => !value); setError(null); setNotice(null); }} className="w-full text-sm font-medium text-blue-600 hover:underline">
            {recoveryMode ? 'Giriş ekranına dön' : 'Şifremi unuttum'}
          </button>
        </form>
      </section>
    </main>
  );
}
