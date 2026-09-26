# MouseAI Core

Bağımsız MouseAI çekirdek platformu. Amaç: kullanıcı hedefini güvenli biçimde planlamak, uygun AI sağlayıcısına ve araca yönlendirmek, işlemi izlemek, hata durumunda devam ettirmek ve kanıtlanabilir çıktı üretmek.

## İlk sürüm sınırı

- Task/Workflow yaşam döngüsü
- Sağlayıcı yönlendirme sözleşmesi
- E-posta müşteri asistanı için Conversation/Offer temel modeli
- Idempotency, audit log ve maliyet ölçümü
- API ve worker ayrımı
- Gizli anahtarların yalnızca çalışma ortamından alınması

## Klasörler

- `apps/api`: HTTP API ve kimlik doğrulama sınırı
- `apps/worker`: görev yürütme, retry ve checkpoint döngüsü
- `packages/contracts`: API/event sözleşmeleri
- `packages/config`: ortam ve feature flag yapılandırması
- `docs`: karar kayıtları, görev planı ve runbook
- `infra`: yerel/Cloud dağıtım tanımları

## Güvenlik kuralı

`.env.local` ve gerçek API anahtarları repoya commit edilmez. Örnek değişkenler `.env.example` içinde tutulur.

## Başlangıç sırası

1. Sözleşmeleri sabitle.
2. Task oluşturma ve durum sorgulama uçlarını uygula.
3. Worker checkpoint/retry mekanizmasını uygula.
4. Mock provider ile uçtan uca test çalıştır.
5. Güvenli secret bağlantısından sonra gerçek sağlayıcı adaptörlerini aç.
