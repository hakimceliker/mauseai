# MouseAI — Entegrasyon ve Görev Durumu

**Durum tarihi:** 2026-09-27  
**Merkez repo:** https://github.com/hakimceliker/mauseai  
**Kural:** Bir araç yalnızca çağrılabilirliği ve test kanıtı varsa `connected` kabul edilir. Masaüstünde kurulu veya açık olması tek başına bağlantı kanıtı değildir.

## Doğrulananlar

| Sistem | Durum | Sorumlu | Kanıt / sonraki adım |
|---|---|---|---|
| GitHub repo | `connected` | Codex/GitHub | Remote ve açık PR kayıtları doğrulandı |
| Claude Code | `connected` / denetim tamamlandı | Claude | PR #7 raporu mevcut; yeni denetim bekliyor |
| Codex/GPT | `connected` | Codex | Bu çalışma ortamında aktif |
| Slack workspace | `connected` | Orchestrator | Workspace görüldü; MouseAI kanalı ayrıca doğrulanmalı |
| Docker Desktop | `available` | Codex/DevOps | Yerel test ortamı; CI kanıtı ayrıca gerekli |
| Cursor/GitHub Desktop | `available` | Cursor | Geliştirme aracı; kendi başına ürün connector’ı değildir |
| Vercel preview | `verified` | DevOps | PR raporunda yeşil; production-ready kanıtı değildir |

## Henüz üretim bağlantısı doğrulanmayanlar

| Entegrasyon | Durum | Sahip | Kural |
|---|---|---|---|
| Gerçek GPT provider | `credential_not_configured` | GPT/Codex | Secret istenmez; güvenli mock/not-configured akışı kullanılır |
| Gerçek Claude provider | `credential_not_configured` | Claude/Codex | Secret istenmez; staging env ile doğrulanır |
| Supabase production | `not_configured` | Backend/Security | Auth, RLS, migration ve tenant smoke test gerekir |
| Inngest production | `not_configured` | Orchestrator | Event, retry, checkpoint ve resume kanıtı gerekir |
| Gmail/Microsoft Graph | `planned` | Customer Ops | OAuth kapsamı ve webhook testi gerekir |
| Stripe/cüzdan | `planned` | Billing/Security | Faz 5; gerçek ödeme olmadan mock ledger |
| Google Analytics/Search Console | `planned` | Growth/SEO | Faz 5; salt-okuma ve tenant kapsamı |
| WhatsApp | `planned` | Customer Ops | Faz 3+; izin, maliyet ve insan onayı politikası gerekir |

## Görev dağılımı

- **Codex/GPT:** Uygulama, migration, test, CI düzeltmeleri ve PR hazırlığı.
- **Claude:** Bağımsız mimari, güvenlik, secret, tenant, retry/idempotency ve entegrasyon denetimi.
- **Cursor:** Codex tarafından verilen sınırlı dosya kapsamını uygular; karar veya merge yetkisi yoktur.
- **DevOps:** Docker, Vercel, environment, CI kapıları ve rollback kanıtı.
- **Security:** RLS, secret scan, audit, OAuth kapsamı, veri izolasyonu ve yüksek risk kapıları.
- **Growth/SEO:** Analytics, Search Console, SEO ve reklam ölçüm sözleşmeleri.
- **İnsan sahibi:** Merge, canlı deploy, gerçek ödeme, gerçek mesaj, service-role ve veri silme onayı.

## Açık entegrasyon kapıları

1. PR #6 ve PR #7 kapsam/base düzeni çözülmeden merge yapılmaz.
2. PR #7 yeni commit’leri ayrı branch/PR kanıtıyla taşınır.
3. CI’ya secret scan, `npm audit` ve Docker doğrulaması eklenmeden G1/G3 kapısı kapanmış sayılmaz.
4. Her dış servis için connector kaydı, izin kapsamı, timeout, retry, maliyet ve audit alanları oluşturulur.
5. Credential eksikleri `credential_not_configured` olarak raporlanır; secret değeri istenmez veya yazılmaz.

