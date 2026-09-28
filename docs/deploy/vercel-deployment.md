# Vercel deployment sözleşmesi

## Build

- Framework: Next.js
- Region: `fra1`
- Inngest ve task API rotaları: en fazla 60 saniye
- Build komutu: `npm run build`

## Production değişkenleri

Yalnızca değişken adları Vercel’e tanımlanır; değerler bu depoya yazılmaz:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
POSTHOG_KEY
SENTRY_DSN
LANGFUSE_PUBLIC_KEY
LANGFUSE_SECRET_KEY
```

Eksik credential uygulamayı gizlice tamamlanmış göstermez; health/readiness yanıtında `credential_not_configured` olarak raporlanır.

## Rollback

Vercel Deployments ekranından son başarılı deployment seçilir ve Promote/Redeploy uygulanır. Kod tarafındaki geri alma için ilgili PR revert edilir. Secret değerleri loglanmaz ve yeniden yazılmaz.
