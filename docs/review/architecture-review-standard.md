# MouseAI mimari inceleme standardı

Her PR, merge edilmeden önce bu listedeki kanıtlarla incelenir. Sonuç `APPROVE`, `REQUEST_CHANGES` veya `BLOCKED` olarak yazılır.

## Bulgu seviyeleri

- **BLOCKER:** Veri sızıntısı, tenant kaçışı, canlı ödeme/emir veya secret commit'i. Merge yasak.
- **HIGH:** Kritik akışın bozulması, yetki bypass'ı veya geri alınamaz veri kaybı. Düzeltme olmadan merge yasak.
- **MEDIUM:** Test, hata yönetimi, gözlemlenebilirlik veya bakım riski. Sahibi ve takip issue'su gerekir.
- **LOW:** Stil, dokümantasyon veya küçük iyileştirme. Merge kararını tek başına engellemez.

## Zorunlu kontroller

1. Doğru repository, branch ve issue doğrulanır; main'e doğrudan push yoktur.
2. Tenant/RLS filtresi ve deny-by-default yetki sınırı kontrol edilir.
3. Secret, token, kişisel veri ve gerçek müşteri verisi commit/log/test fixture içinde aranır.
4. Yan etkili işlemler idempotent mi, retry ve checkpoint tekrarında çift çalışmıyor mu kontrol edilir.
5. Retriable, non-retriable ve insan onayı gerektiren hatalar ayrıdır.
6. Sentry/Langfuse/PostHog gibi gözlemlenebilirlik çağrıları iş akışını düşürmez ve PII maskeleyebilir.
7. Lint, typecheck, test, build, dependency audit, secret scan ve Docker kanıtı incelenir.
8. Rollback adımı ve doküman/kanıt dosyası vardır.

## Merge kararı şablonu

```text
Repository / PR:
Issue / branch:
Sonuç: APPROVE | REQUEST_CHANGES | BLOCKED
Bulgular: BLOCKER/HIGH/MEDIUM/LOW
CI: lint / typecheck / test / build / audit / secret-scan / Docker
Secret durumu: configured | credential_not_configured
Rollback:
Kalan işler:
```
