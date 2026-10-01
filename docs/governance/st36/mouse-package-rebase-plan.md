# ST v3.6 — MOUSE Paketleri Yeniden Yürütme Planı

**Durum:** PLAN / LIVE ACCEPTANCE PENDING  
**Kapsam:** MOUSE-001–011  
**Kanonik taban:** `main` @ `d8239c6`  
**Kural:** Eski paket branch'i veya draft PR, güncel main'e yeniden uygulanıp kendi CI kanıtını üretmeden tamamlanmış sayılmaz.

## Amaç

MOUSE paketleri için eski branch ve draft PR kayıtlarını doğrudan birleştirmek yerine, her paketi güncel `main` üzerinden tek tek yeniden yürütmek. Böylece kod, doküman, CI, güvenlik ve canlı kabul durumları birbirinden ayrıştırılır.

## Paket yürütme tablosu

| Paket | Kapsam | Sorumlu | Önkoşul | Sonuç kanıtı | Mevcut durum |
|---|---|---|---|---|---|
| MOUSE-001 | Kod iskeleti ve kalite kapıları | GPT/Codex | Yok | Branch, PR, lint, typecheck, test, build | REBASE_REQUIRED |
| MOUSE-002 | Mimari inceleme standardı | Claude | MOUSE-001 | Review checklist ve onaylı rapor | REBASE_REQUIRED |
| MOUSE-003 | Supabase migration, Auth, RLS | GPT/Codex + Supabase | MOUSE-001 | Migration, RLS testi, tenant kanıtı | LIVE_TEST_PENDING |
| MOUSE-004 | Vercel deployment | GPT/Codex + Vercel | MOUSE-001 | Production deployment ve health kanıtı | LIVE_CONFIG_PENDING |
| MOUSE-005 | Inngest workflow, retry, checkpoint | GPT/Codex + Inngest | MOUSE-003 | Trigger, worker, checkpoint, retry kanıtı | LIVE_TEST_PENDING |
| MOUSE-006 | OpenAI adapter | GPT/Codex + OpenAI | MOUSE-005 | Redakte provider sonucu, maliyet/audit kaydı | CREDENTIAL_PENDING |
| MOUSE-007 | Anthropic adapter | GPT/Codex + Anthropic | MOUSE-005 | Redakte provider sonucu, maliyet/audit kaydı | CREDENTIAL_PENDING |
| MOUSE-008 | Stripe sandbox | GPT/Codex + Stripe | MOUSE-003 | Sandbox payment/webhook kanıtı | SANDBOX_PENDING |
| MOUSE-009 | Beyaz/şeffaf UI tasarım sistemi | GPT/Codex + Visily/Figma | MOUSE-001 | Görsel karşılaştırma, accessibility, build | REBASE_REQUIRED |
| MOUSE-010 | Sentry/Langfuse trace | GPT/Codex + observability | MOUSE-005 | Redakte trace/error kanıtı | CREDENTIAL_PENDING |
| MOUSE-011 | PostHog analytics | GPT/Codex + PostHog | MOUSE-001 | PII’siz event kanıtı ve dashboard | CREDENTIAL_PENDING |

## Her paket için zorunlu akış

1. `origin/main` güncellenir ve yeni görev branch'i buradan açılır.
2. Paket kapsamı dışındaki değişiklikler alınmaz.
3. Kod veya doküman değişikliği yapılır; secret değerleri kullanılmaz veya gösterilmez.
4. Yerel kalite kapıları çalıştırılır: lint, typecheck, test, build; ilgili güvenlik kontrolleri ayrıca çalıştırılır.
5. Kanıt dosyası `docs/evidence/MOUSE-NNN-*.md` altında güncellenir.
6. Ayrı PR açılır ve PR açıklamasında kapsam, test, rollback ve credential durumu yazılır.
7. CI tamamen yeşil olmadan merge edilmez.
8. Merge sonrası `main` CI ve gerekiyorsa production health yeniden doğrulanır.
9. Canlı kanıt yoksa durum `LIVE_TEST_PENDING`, `CREDENTIAL_PENDING`, `NOT_RUN` veya `credential_not_configured` kalır; `DONE`/`PRODUCTION-READY` yazılmaz.

## Bağımlılık sırası

- Paralel başlayabilecek işler: MOUSE-001, MOUSE-002, MOUSE-009.
- MOUSE-003, MOUSE-004 ve MOUSE-005; MOUSE-001 kalite tabanından sonra yürütülür.
- MOUSE-006, MOUSE-007 ve MOUSE-010; MOUSE-005 çalışma sözleşmesinden sonra yürütülür.
- MOUSE-008; MOUSE-003 Auth/RLS sınırları hazırlandıktan sonra yürütülür.
- MOUSE-011; event sözleşmesi ve tenant sınırı netleştikten sonra yürütülür.
- Her paket kendi PR/CI kanıtını üretir; tek konsolidasyon PR'ı kanıt yerine geçmez.

## Stale branch/PR politikası

Mevcut `feat/MOUSE-001`–`feat/MOUSE-011` branch'leri güncel `main`'in gerisindedir ve draft PR kayıtları tek başına kabul kanıtı değildir. Bu kayıtlar:

- doğrudan merge edilmez,
- önce güncel main üzerine rebase/re-implementation yapılır,
- kapsam dışı veya çakışan değişiklikler ayrıştırılır,
- kanıt ve CI olmadan kapatılmış/bitmiş raporlanmaz.

## Açık canlı kabul kapıları

Bu plan kod yürütme sırasını netleştirir; aşağıdaki canlı kanıtların yerine geçmez:

- gerçek Auth ve iki tenant izolasyonu,
- Inngest production trigger/worker/checkpoint/retry/idempotency,
- OpenAI ve Anthropic kontrollü çağrısı,
- Stripe sandbox webhook akışı,
- gözlemlenebilirlik ve PII’siz analytics kanıtı,
- pilot, finans, KPI ve G0–G12 işletme kabulü.

Eksik erişim veya credential değeri istenmez; durum güvenli biçimde `credential_not_configured` olarak raporlanır.

