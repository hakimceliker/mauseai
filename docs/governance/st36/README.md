# MouseAI ST3.6 Governance Package

Bu klasör, 1 Ekim 2026 tarihli ST3.6 uyarlama paketinin MouseAI repo içindeki kanonik çalışma kopyasıdır.

## Kaynak ve kapsam

- 377 kontrol: PUK-001–PUK-357 ve ST-01–ST-20
- 13 geçiş kapısı: G0–G12
- 30 başlangıç/kabul görevi: PLAN-001–PLAN-030
- 22 uyarlama işi: MAU-ADAPT-001–MAU-ADAPT-022
- 18 KPI kartı
- 13 haftalık nakit girdisi
- 50 kaynak bölüm ve 19 diyagram

## Geçerli durum

- `runtime_verified: false`
- Kapılar: `BEKLEMEDE`
- Kontrol matrisi: `TASLAK İNSAN İNCELEMESİ GEREKLİ`
- Sorumlu ve kanıt alanları: boş; atama yapılmadan `GEÇTİ` kullanılamaz.
- Bu dosyaların repo’da bulunması, kanunların uygulandığı veya production kabulünün verildiği anlamına gelmez.

## Uygulama kuralı

Her kontrol satırı bir GitHub issue, görev sahibi, kabul koşulu, kanıt bağlantısı, test yöntemi ve tarih ile kapatılır. Kod değişikliği branch → PR → CI → review → merge düzeninde yapılır. Secret değerleri bu klasöre girmez.

## Birleştirme

Bu paket, [master gap roadmap](../../mouseai-master-gap-roadmap-v1.1.md), [task registry](../../task-registry.md) ve [production acceptance plan](../../production-acceptance-task-distribution.md) ile birlikte okunur. Dış kaynak PDF/DOCX arşivdir; bu klasördeki JSON/CSV kayıtları makine tarafından takip edilecek çalışma kopyasıdır.

PLAN-004 için uygulanacak kabul sırası: [Auth ve tenant kabul runbook'u](plan-004-auth-tenant-runbook.md).

PLAN-005 için uygulanacak kabul sırası: [Inngest production workflow kabul runbook'u](plan-005-inngest-acceptance-runbook.md).

PLAN-006/007 için uygulanacak kabul sırası: [Provider ve maliyet kabul runbook'u](plan-006-007-provider-cost-runbook.md).
