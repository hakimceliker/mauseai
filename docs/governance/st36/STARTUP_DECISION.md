# MouseAI — G0 Başlangıç Kararı

**Last updated:** 2026-10-01

**G0 status:** `DECISION_PENDING`

The user approved completion of the repository/task work. That approval is not
the required human decision assigning the project sponsor, cost center, and
operations risk owner below; G0 remains open.

## Önerilen karar

MouseAI, yalnızca `hakimceliker/mauseai` kanonik repository’sinde ve kendi
çalışma klasöründe geliştirilecektir. Main branch’e doğrudan push yapılmayacak;
değişiklikler branch, PR, CI ve kanıt zinciriyle ilerleyecektir. Secret değerleri
sohbete, kaynağa, loga veya commit’e yazılmayacaktır. Gerçek müşteri verisi,
gerçek ödeme ve canlı finansal işlem kullanılmayacaktır.

## Başlangıç kapısı

Bu karar metni, aşağıdaki üç alan insan sahibi tarafından doldurulup onaylandığında
G0 başlangıç kararı olarak yürürlüğe girer:

1. Yönetim sponsoru: `PENDING_USER_CONFIRMATION`
2. Maliyet merkezi: `PENDING_USER_CONFIRMATION` (öneri: `MAUSEAI-2026`)
3. Operasyon risk sahibi: `PENDING_USER_CONFIRMATION`

Ürün sahibi için önerilen kayıt: Hakim Çeliker.

## Kabul kuralı

Bu üç alan onaylanmadan G0 `PASSED` değildir. G0 geçmeden pilot, canlı kabul,
ticari açılış veya G12 işletme kabulü verilemez.

## Current evidence boundary

Repository governance and CI records are updated on feature branch
`hakimceliker-mouseai-kanun-uyarlamasi` and remain subject to independent PR
review. The live production health/readiness endpoints respond successfully,
but the health payload reports payment=`mock`, analytics=`console`, and
realtime disconnected. No live Auth/RLS, Inngest, provider, pilot, finance, or
business acceptance is inferred. See
[INTEGRATION_EVIDENCE.md](INTEGRATION_EVIDENCE.md) and
[FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md).
