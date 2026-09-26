# Faz 2 Agent Sözleşmeleri Görev Kartı

## Görev

`FAZ-002` — Müşteri MouseAI Agent kayıt, görev alma, heartbeat ve sonuç sözleşmelerini oluştur.

## Sahiplik

- Birincil uygulama: GPT/Kodex veya Cursor
- Teknik denetim: Claude
- Kaynak ve PR: GitHub
- Güvenlik denetimi: Security review

## Kapsam

- Agent registration ve tenant eşlemesi
- Agent capability bildirimi
- İmzalı command envelope
- Result envelope ve checkpoint aktarımı
- Heartbeat ve health durumu
- Connector izin kapsamı
- Version uyumluluğu ve güvenli kapatma

## Kapsam dışı

- Gerçek müşteri sunucusuna deploy
- Gerçek API anahtarı ekleme
- Gerçek ödeme veya dış müşteriye e-posta gönderimi
- Onay mekanizmasını bypass etme

## Kabul kriterleri

- Sözleşmeler TypeScript ve Zod ile doğrulanıyor.
- Her mesaj tenant ve agent kimliği taşıyor.
- Komut süresi dolmuşsa veya imza geçersizse reddediliyor.
- Agent yalnızca ilan ettiği capability ve izin kapsamındaki aracı çağırabiliyor.
- Heartbeat yoksa agent `OFFLINE` kabul ediliyor.
- Sonuç ve checkpoint tekrar gönderildiğinde yan etki çoğalmıyor.
- Hassas secret veya ham müşteri verisi loglanmıyor.
- Unit testler geçiyor ve PR CI başarılı oluyor.

## Sonraki adım

Bu sözleşmelerden sonra registration API, Agent Docker iskeleti ve mock Cloud bağlantısı ayrı görevler olarak açılır.
