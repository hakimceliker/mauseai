# Görev Dağılımı ve Teslim Kayıtları

| ID | Görev | Modül | Durum | Çıktı |
|---|---|---|---|---|
| CORE-001 | Repo ve kalite kapıları | Platform | COMPLETE | README, env, ignore, CI |
| CORE-002 | Task/Workflow sözleşmeleri | Contracts | COMPLETE | TypeScript + Zod sözleşmeleri |
| CORE-003 | Task API | API | COMPLETE | create/get/cancel/list |
| CORE-004 | Worker checkpoint | Worker | CODE_COMPLETE_LIVE_TEST_PENDING | `task.execute` retry/resume kodu; acceptance runner hazır, canlı Inngest kanıtı bekliyor |
| CORE-005 | AI provider router | AI Gateway | CODE_COMPLETE_CREDENTIAL_PENDING | mock + OpenAI/Anthropic adapter; gerçek credential doğrulaması bekliyor |
| CORE-006 | E-posta müşteri asistanı | Customer Ops | MVP_MOCK | conversation/offer mock akışı; gerçek e-posta sağlayıcısı sonraki kapsam |
| CORE-007 | Audit ve maliyet | Platform | CODE_COMPLETE_LIVE_TEST_PENDING | event ledger; canlı workflow kanıtı bekliyor |
| CORE-008 | Güvenlik ve tenant izolasyonu | Security | CODE_COMPLETE_LIVE_TEST_PENDING | RLS ve negatif testler; gerçek Auth/tenant testi bekliyor |

## Kural

Her görev; giriş, çıktı, test kanıtı, değişen dosyalar ve kalan riski kaydetmeden tamamlandı sayılmaz.

## Güncel kabul durumu

Kod, CI, build, dependency audit, secret scan, Docker ve health/readiness kontrolleri tamamdır.
Gerçek production kabulü için kimlik doğrulamalı tenant izolasyonu ve Inngest workflow kanıtı ayrıca gereklidir.
