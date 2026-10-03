# MouseAI ST3.6 Governance Package

Bu klasör, 1 Ekim 2026 tarihli ST3.6 uyarlama paketinin MouseAI repo içindeki kanonik çalışma kopyasıdır.

## Kaynak ve kapsam

- Kanonik kaynak kimlikleri, hash/sürüm karşılaştırması ve açık metadata farkları:
  [Source register and variance record](SOURCE_REGISTER_AND_CHANGE_RECORD.md).
- 377 kontrol: PUK-001–PUK-357 ve ST-01–ST-20
- 13 geçiş kapısı: G0–G12
- 30 başlangıç/kabul görevi: PLAN-001–PLAN-030
- 22 uyarlama işi: MAU-ADAPT-001–MAU-ADAPT-022
- 52 satırlı kabul çalışma görünümü: mevcut ID ve `Durum` korunur; GitHub
  branch/PR/commit, CI, yerel test, kanıt zaman damgası ve sonraki adım alanları
  eklenmiştir. Yalnız doğrulanan PLAN-003/004 bağlantıları doldurulmuş; diğer
  bilinmeyenler `NOT_LINKED`/`NOT_RUN` olarak kalır.
- 18 KPI kartı
- 13 haftalık nakit girdisi
- 50 kaynak bölüm ve 19 diyagram

## Geçerli durum

- `runtime_verified: false`
- Kapılar: `BEKLEMEDE`
- Kontrol matrisi: `TASLAK İNSAN İNCELEMESİ GEREKLİ`
- Named owner values remain `ATANACAK`; only PLAN-003/004 have linked PR/test
  evidence. No task status or gate was advanced to `GEÇTİ`.
- Bu dosyaların repo’da bulunması, kanunların uygulandığı veya production kabulünün verildiği anlamına gelmez.

## Uygulama kuralı

Her kontrol satırı bir GitHub issue, görev sahibi, kabul koşulu, kanıt bağlantısı, test yöntemi ve tarih ile kapatılır. Kod değişikliği branch → PR → CI → review → merge düzeninde yapılır. Secret değerleri bu klasöre girmez.

## Birleştirme

Bu paket, [master gap roadmap](../../mouseai-master-gap-roadmap-v1.1.md), [task registry](../../task-registry.md) ve [production acceptance plan](../../production-acceptance-task-distribution.md) ile birlikte okunur. Dış kaynak PDF/DOCX arşivdir; bu klasördeki JSON/CSV kayıtları makine tarafından takip edilecek çalışma kopyasıdır.
Yeni sağlanan büyük PDF'ler ikilenmeden metadata/hash kaydıyla izlenir; önceki kaynak byte kimlikleri silinmez.

PLAN-004 için uygulanacak kabul sırası: [Auth ve tenant kabul runbook'u](plan-004-auth-tenant-runbook.md).

PLAN-005 için uygulanacak kabul sırası: [Inngest production workflow kabul runbook'u](plan-005-inngest-acceptance-runbook.md).

PLAN-006/007 için uygulanacak kabul sırası: [Provider ve maliyet kabul runbook'u](plan-006-007-provider-cost-runbook.md).

Tüm ST3.6 kapsamının tek birleşik durumu: [Final execution register](final-execution-register.md).

## 2026-10-01 canlı kayıtları

- [Repository ve branch kontrolleri](REPOSITORY_CONTROL_RECORD.md)
- [Source hash/version karşılaştırması](SOURCE_REGISTER_AND_CHANGE_RECORD.md)
- [Auth, Inngest, provider ve entegrasyon kanıtı](INTEGRATION_EVIDENCE.md)
- [Final acceptance matrisi](FINAL_ACCEPTANCE.md)
- [Pilot, KPI, finans ve release durumu](PILOT_KPI_FINANCE_RELEASE.md)
- [Issue/PR envanteri ve açık insan aksiyonları](ISSUE_PR_HYGIENE.md)
- [Evidence index](../../evidence/INDEX.md)

Bu ek kayıtlar hiçbir canlı kanıt veya kullanıcı kararı eksikliğini kapatmaz;
mevcut genel durum `PARTIAL — NOT PRODUCTION-READY` olarak kalır.
