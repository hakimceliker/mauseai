# Temporal Determinism Rules — MouseAI Gelecek Referansı

## Durum

Temporal şu an MouseAI çekirdeğinde kullanılmıyor. Bu belge yalnızca Faz 5+ enterprise değerlendirmesinde Temporal seçilirse bağlayıcı teknik referans olarak kullanılacaktır.

## Temel kural

Temporal Workflow kodu aynı event history replay edildiğinde aynı sırayı ve aynı kararları üretmelidir.

## Workflow içinde yasak olanlar

- `Date.now()`, `new Date()` ve `Math.random()` gibi doğrudan nondeterministic çağrılar
- UUID üretimi ve global mutable state
- HTTP, database, dosya, LLM, e-posta ve ödeme çağrıları
- Replay sonucunu değiştirebilecek dış sistem okumaları
- Kontrolsüz thread veya process erişimi

## Activity’ye ait işler

- AI/LLM çağrısı
- DB okuma/yazma
- HTTP ve harici API
- Dosya ve e-posta
- Ödeme
- Saat, random ve UUID gerektiren işlemler

## Workflow’a ait işler

- `if/for/switch` karar akışı
- Timer, sleep, signal ve query bekleme
- Child workflow başlatma
- Activity’nin ne zaman ve hangi parametreyle çağrılacağı

## Değişiklik ve versiyonlama

Eski workflow’lar replay edildiği için workflow kod değişiklikleri versioning/patch mekanizması olmadan production’a alınamaz. Determinism testi ve geçmiş history replay testi zorunludur.

## Inngest ile fark

MouseAI’nin mevcut Inngest akışında dış dünya çağrıları `step.run` içinde tutulur ve step sonuçları memoize edilir. Temporal kuralları mevcut Inngest koduna uygulanmaz; yalnızca gelecekteki Temporal adapter/worker tasarımında uygulanır.

## Bağlantı

Temporal’e geçiş kriterleri ve karar süreci: `docs/decision-record-002-temporal-vs-inngest.md`.
