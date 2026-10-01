# MouseAI ST3.6 — Tek Master Yürütme ve Kapanış Kaydı

**Sürüm:** 1.0  
**Kapsam:** Ana kanun, şartname, kabul planı, kontrol matrisi, diyagram atlası, görev kayıtları, KPI ve finans şablonu  
**Repo:** `hakimceliker/mauseai`  
**Yürütme ilkesi:** İşler tek tek dağınık raporlanmaz; bu kayıt tüm işlerin ortak durum kaynağıdır.

## 1. Kaynakların birleştiği merkez

Bu kayıt aşağıdaki kaynakları tek yürütme görünümünde birleştirir:

- ST3.6 ana kanun ve uygulanabilirlik matrisi
- MouseAI master şartname
- Eksikler ve kabul planı
- Diyagram atlası
- Ana kayıt ve teslim doğrulama JSON’ları
- 14 günlük teknik spesifikasyon
- Ürün/iş/finans/KPI belgeleri
- Repo’daki migration, API, worker, test ve CI kanıtları

Repo kopyaları: `docs/governance/st36/`  
Kanun: [`storage-and-repository-registry.md`](../../storage-and-repository-registry.md)

## 2. Genel durum

| Alan | Durum | Kapanış şartı |
|---|---|---|
| Kod ve mimari | Hazır/CI doğrulandı | Main CI ve PR kanıtı |
| Güvenlik ve secret politikası | Hazır | Secret scan + insan incelemesi |
| Repo/branch/depo yönetimi | Kanunlaştırıldı | Kanuna uygun her PR |
| 377 kontrol | Repo’ya aktarıldı | Sorumlu + kanıt + kabul |
| G0–G12 kapıları | Beklemede | Her kapının kanıt dosyası |
| Auth/tenant | Canlı kanıt bekliyor | A/B negatif testleri |
| Inngest | Canlı run bekliyor | Trigger/worker/checkpoint/audit |
| AI provider | Canlı credential testi bekliyor | OpenAI + Anthropic redacted test |
| Storage | Aktif akış yok | PLAN-004B açılmadan kullanılmaz |
| Ödeme | Sandbox/mock sınırında | Stripe sandbox replay |
| KPI/finans | Şablon var, veri yok | Baseline + hedef + sahip |
| Pilotlar | Hazırlık seviyesinde | Gerçek pilot kanıtı |
| Hukuk/operasyon | Dokümantasyon bekliyor | Yayın ve incident kabulü |

## 3. Uygulama paketleri

### P0 — Canlı kabul yolu

| Paket | Görev | Sahip | Durum |
|---|---|---|---|
| PLAN-001 | Proje kartı, bütçe, sorumlu, tarih | Kullanıcı/ürün sahibi | Kullanıcı kararı bekliyor |
| PLAN-002 | Müşteri ve süreç baz ölçümü | Ürün/satış | Veri bekliyor |
| PLAN-003 | Repo, branch, PR, CI ve ortam envanteri | Codex | Hazır |
| PLAN-004 | Auth, iki tenant, RLS ve çapraz erişim | Codex + Supabase | Canlı test bekliyor |
| PLAN-004B | Repo/Storage/bucket/path yönetimi | Codex + Supabase | Kanun hazır, Storage NOT_RUN |
| PLAN-005 | Inngest trigger, worker, checkpoint, retry, duplicate | Codex + Inngest | Canlı run bekliyor |
| PLAN-006 | OpenAI/Anthropic gerçek çağrısı | Codex + kullanıcı | Credential bekliyor |
| PLAN-007 | Audit ve maliyet uzlaştırması | Codex + finans | P005/P006 bağımlı |

### P1–P9 — Diğer tüm kapsam

| Paket | İçerik | Ön koşul | Durum |
|---|---|---|---|
| P1 | API sözleşmeleri, tool kataloğu, approval/handoff, log redaction | P0 | Kod temeli var, kabul kanıtı bekliyor |
| P2 | API bakım pilotu | P0/P1 | Pilot run bekliyor |
| P3 | Windows bilgisayar runner’ı | P0/P1 | Cihaz pilotu bekliyor |
| P4 | Verifier, UNKNOWN, bounded retry, rollback | P005 | Tasarım mevcut, failure run bekliyor |
| P5 | Ortak çalışma, hafıza, provenance, devralma | P0/P1 | Uygulamalı test bekliyor |
| P6 | Eval, kalite metriği, model yöntemi, canary | P006 | Veri seti ve baseline bekliyor |
| P7 | BI, KPI, finans, fiyat ve unit economics | P002 | Gerçek ölçüm bekliyor |
| P8 | Hukuk, release, backup/restore, incident, destek | P0/P7 | Operasyon onayı bekliyor |
| P9 | Enterprise SSO/SCIM, özel tenant, residency, marketplace | P8 + müşteri talebi | MVP sonrası |

## 4. Paralel yürütme

Aşağıdakiler aynı anda hazırlanabilir:

- UI ve beyaz/şeffaf tasarım uygulaması
- KPI sözlüğü ve finans workbook’u
- Tool/connector kataloğu
- Threat model ve güvenlik testleri
- API bakım pilotu taslağı
- Hukuk ve destek kontrol listeleri
- Site, SEO, demo ve satış materyali

Şunlar bağımlılık kapanmadan başlatılamaz:

- Auth olmadan tenant kabulü
- Tenant kabulü olmadan canlı Inngest kabulü
- Inngest olmadan audit/cost uzlaştırması
- Gerçek provider olmadan gerçek maliyet doğrulaması
- Pilot ölçümü olmadan fiyat/SLA kararı
- P0 kapanmadan gerçek müşteri verisi ve canlı ödeme

## 5. Her görev için zorunlu teslim

Her PLAN/ADAPT maddesi aşağıdaki teslim zincirini izler:

```text
Issue
→ branch
→ kod/doküman/migration
→ test
→ security review
→ PR
→ CI
→ commit kanıtı
→ redacted evidence
→ kabul sahibi ve tarih
→ merge
→ main/production doğrulaması
```

Test veya kanıt yoksa görev tamamlanmış sayılmaz.

## 6. Tek final kabul kapısı

```text
G0–G6: ürün, kapsam, mimari ve güvenlik
G7: Auth + tenant + Storage sınırı
G8: Inngest + checkpoint + audit + idempotency
G9: provider + maliyet + gözlemlenebilirlik
G10: pilot + KPI + finans
G11: hukuk + release + rollback
G12: operasyon + müşteri kabulü
```

Final kabul yalnızca bütün ilgili kapılar için kanıt bulunduğunda verilir. Eksik credential veya çalıştırılmamış test `NOT_RUN`, `BLOCKED` veya `credential_not_configured` olarak kalır.

## 7. Şu an yapılacak tek sıra

1. PR #83 CI ve insan review kapanışı.
2. PLAN-004 Auth/tenant canlı testi.
3. PLAN-004B Storage karar/test kapısı.
4. PLAN-005 Inngest canlı workflow.
5. PLAN-006 gerçek provider testi.
6. PLAN-007 audit/cost uzlaştırması.
7. P1–P4 uygulamalı pilotlar.
8. P5–P8 ürün, finans, hukuk ve işletme kabulü.
9. G0–G12 final kanıt tablosu.
10. Production acceptance veya açıkça REJECT kararı.

## 8. Raporlama standardı

Bundan sonraki rapor tek tabloda şu alanları taşıyacaktır:

```text
Task | Owner | Branch | PR | Commit | Test | CI | Evidence | Status | Blocker | Next
```

Bu dosya güncellenmeden ayrı parça “tamamlandı” raporu verilmez.

## 9. 2026-10-01 yürütme kanıtı

| Kontrol | Sonuç | Kanıt / not |
|---|---|---|
| Supabase profil eşlemesi | PASS | İki test kullanıcısı Tenant A/B ile `owner` rolüne bağlandı ve SQL Editor üzerinden doğrulandı |
| Lint | PASS | `npm run lint` |
| Typecheck | PASS | `npm run typecheck` |
| Test | PASS | 28 test dosyası, 266 başarılı; 16 skip |
| Build | PASS | `npm run build` |
| Diff kontrolü | PASS | `git diff --check` |
| Dependency audit | PASS | `npm audit --omit=dev --audit-level=high`, 0 vulnerability |
| Production acceptance runner | PARTIAL | Production base URL ile health/readiness/anonymous erişim kontrolleri PASS |
| Auth/tenant canlı API testi | credential_not_configured | `SMOKE_USER_A_TOKEN`, `SMOKE_USER_B_TOKEN` yok |
| Inngest canlı workflow | credential_not_configured | `SMOKE_WORKFLOW_ID`, runtime Inngest erişimi yok |
| Gerçek AI provider testi | credential_not_configured | OpenAI/Anthropic runtime credential kanıta alınmadı |

Bu kayıt secret, token, parola veya ham production response içermez. Auth profil eşlemesi tamamlanmış olsa da canlı API/RLS ve Inngest kabul kapıları kanıtlanmadan production kabulü verilmez.
