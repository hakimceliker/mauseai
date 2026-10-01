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

## Local AI (staging canary only until accepted)

Local-first canary may be enabled only after the approved private gateway is
reachable from the target Vercel environment. Set these variables in that
environment's approved secret/config store; never commit or print the URL:

```text
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=<approved-private-tunnel-vpn-or-gateway>
LOCAL_AI_PROTOCOL=gateway
LOCAL_AI_MODEL=qwen3:8b
LOCAL_AI_CONNECT_TIMEOUT_MS=3000
LOCAL_AI_INFERENCE_TIMEOUT_MS=45000
```

Preserve the existing `AI_PROVIDER` selection and its OpenAI/Anthropic
credentials as cloud fallback. Do not expose Ollama port `11434` publicly.
The private URL and the cloud credential values are not recorded in this
repository. Do not enable this in production or interrupt shared gateway
traffic to simulate the failure/recovery test; use an isolated staging
configuration.

## Rollback

Vercel Deployments ekranından son başarılı deployment seçilir ve Promote/Redeploy uygulanır. Kod tarafındaki geri alma için ilgili PR revert edilir. Secret değerleri loglanmaz ve yeniden yazılmaz.
