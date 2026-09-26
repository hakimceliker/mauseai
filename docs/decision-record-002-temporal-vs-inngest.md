# ADR-002: Temporal ve Inngest Kararı

**Durum:** Kabul edildi  
**Karar:** MouseAI MVP ve yakın fazlarda Inngest ile devam edilir. Temporal şu anda eklenmez.

## Gerekçe

- MouseAI stack’i TypeScript + Next.js + Vercel merkezlidir.
- İlk hedef 14 günlük çalışan çekirdektir.
- Inngest queue, retry, checkpoint, delayed work ve human approval için yeterlidir.
- Temporal ek worker fleet, cluster/Cloud operasyonu ve daha yüksek işletim maliyeti getirir.
- Şu an Temporal’in gerektirdiği çok dilli worker, yıllara yayılan workflow veya enterprise SLA ihtiyacı yoktur.

## Faz politikası

| Faz | Workflow motoru |
|---|---|
| Faz 1 | Inngest |
| Faz 2–3 | Inngest |
| Faz 4 | Inngest; performans ölçümü |
| Faz 5+ | Somut ihtiyaç oluşursa Temporal teknik değerlendirmesi |

## Temporal değerlendirme tetikleyicileri

Temporal ancak aşağıdaki ihtiyaçlardan biri kanıtlanırsa yeniden değerlendirilir:

- haftalar/aylar süren yüksek hacimli workflow’lar
- çok dilli worker fleet ihtiyacı
- Inngest limitlerinin SLA’yı karşılamaması
- karmaşık saga/child workflow/signal/query gereksinimi
- enterprise compliance için daha güçlü event history ve replay gereksinimi

## Korunacak soyutlamalar

MouseAI kodunda workflow mantığı doğrudan sağlayıcıya gömülmez. Task, Step, Checkpoint, RetryPolicy, Approval ve Tool Registry sözleşmeleri korunur. Böylece ileride gerekirse Inngest–Temporal adapter’i değerlendirilebilir; şimdiden çift motor kurulmaz.

## Sonuç

**Inngest şimdi; Temporal yalnızca ölçülebilir enterprise ihtiyacı doğarsa Faz 5+ değerlendirmesi.**

Temporal seçilirse deterministik workflow kuralları `docs/temporal-determinism-rules.md` dosyasına göre uygulanır.
