# MouseAI Müşteri Sunucusu ve Hibrit Çalışma Mimarisi

## Karar

MouseAI; yalnızca merkezi sunucuda çalışan bir SaaS ürünü olarak kalmayacak, müşterinin kendi sunucusunda veya masaüstünde çalışan güvenli bir `MouseAI Agent` katmanını da destekleyecektir. İlk ürün için en doğru model hibrittir:

- MouseAI Cloud: kontrol, lisans, task görünümü, politika, audit özeti ve iş zekâsı.
- Müşteri Agent: müşterinin ortamında gerçek işin yürütülmesi, yerel dosya/API/CRM erişimi ve connector çalıştırma.

Bu karar mevcut task, workflow, checkpoint, audit, maliyet ve tenant sözleşmelerini değiştirmez; yürütme katmanına yeni bir adapter ekler.

## Çalışma modeli

```text
MouseAI Cloud Control Plane
  ├─ tenant, kullanıcı ve lisans
  ├─ task/workflow planı
  ├─ politika ve onay kapıları
  ├─ audit özeti, maliyet ve iş zekâsı
  └─ Agent bağlantı yönetimi
             │ outbound TLS/WebSocket
             ▼
Müşteri MouseAI Agent
  ├─ Docker veya Kubernetes
  ├─ müşteri içi API, CRM, ERP ve dosyalar
  ├─ masaüstü işlemleri
  ├─ müşteri seçerse kendi AI anahtarları
  ├─ yerel queue, retry ve checkpoint
  └─ Cloud’a yalnızca izinli olay ve sonuçlar
```

## Agent görevleri

- Cloud’dan imzalı ve yetkili görev almak.
- Görevi müşteri ortamında çalıştırmak.
- Connector erişimini izin kapsamıyla sınırlamak.
- Her adımı idempotent yürütmek.
- Bağlantı kopunca görevi güvenli kuyruğa almak.
- Checkpoint’ten devam etmek.
- Hassas veriyi varsayılan olarak yerelde tutmak.
- Cloud’a yalnızca sonuç, durum, maliyet özeti ve audit kanıtı göndermek.
- Health, heartbeat, sürüm ve hata sinyali göndermek.

## Cloud görevleri

- Agent kaydı ve tenant eşlemesi.
- Kimlik, lisans, kredi ve kullanım politikası.
- Task planlama ve onay durumu.
- İmzalı komut ve görev sözleşmesi.
- Agent bağlantı durumu.
- Merkezi rapor, iş zekâsı ve yönetim paneli.
- Sürüm yayınlama, uyumluluk kontrolü ve rollback politikası.

## Güvenlik sınırları

- Agent yalnızca müşterinin açıkça bağladığı kaynaklara erişir.
- Cloud’dan gelen görev imzalı, süreli ve tenant’a bağlı olur.
- Service role anahtarı Agent’a veya masaüstü istemciye verilmez.
- Müşteri AI anahtarları müşterinin Vault/env alanında kalabilir.
- Cloud’a ham e-posta, dosya veya CRM verisi gönderilmesi varsayılan değildir.
- L3/L4, ödeme, veri silme, dışarı e-posta gönderme ve müşteri adına pazarlık işlemleri onay kapısından geçer.
- Agent kayıtları tenant izolasyonu ve audit ile tutulur.

## Dayanıklılık

- Agent healthcheck ve heartbeat gönderir.
- Her görev `taskId + stepId + attempt` idempotency anahtarıyla yürür.
- Ağ kesintisinde görev yerel kuyruğa alınır.
- Yeniden başlatmada son checkpoint kullanılır.
- Retry yalnızca transient hatalarda çalışır.
- Agent sürümü uyumsuzsa yeni görev kabul edilmez; mevcut görev güvenli duruma alınır.
- Güncelleme başarısızsa son kararlı sürüme rollback yapılır.
- Cloud erişimi yokken yüksek riskli dış işlemler durdurulur.

## Dağıtım seçenekleri

| Paket | Çalışma yeri | Kullanım |
|---|---|---|
| Cloud SaaS | MouseAI altyapısı | Küçük ekip ve hızlı başlangıç |
| Hybrid Agent | Müşteri Docker/Kubernetes ortamı | Kurumsal veri ve özel connector |
| Private Cloud | Müşterinin AWS/Azure/GCP hesabı | İzolasyon ve özel ağ |
| On Premise | Müşterinin veri merkezi | Sıkı uyumluluk ve kapalı ağ |

## Faz planı

1. Faz 1–2: Cloud çekirdeği ve mock Agent sözleşmesi.
2. Faz 3: Docker Agent, registration, heartbeat ve güvenli görev alma.
3. Faz 4: Desktop Agent, yerel connector ve offline queue.
4. Faz 5: Private Cloud, Kubernetes, SSO, gelişmiş audit ve SLA.
5. Faz 6+: On-premise paket, air-gapped seçenek ve kurumsal destek.

## Kabul kriterleri

- Agent bir tenant’a güvenli biçimde kaydolur.
- Cloud yalnızca imzalı görev gönderir.
- Agent görevi çalıştırır ve checkpoint gönderir.
- Bağlantı kesintisinde görev kaybolmaz.
- Aynı step ikinci kez yan etki üretmez.
- Agent durumu dashboard’da görünür.
- Secret ve hassas ham veri loglara düşmez.
- Agent silindiğinde veya bağlantısı kesildiğinde yeni yüksek riskli görevler durur.

Bu model sunucu sorunlarını tamamen ortadan kaldırmaz; ancak yürütmeyi müşterinin ortamına dağıtır, Cloud kontrolünü korur ve tek bir sunucuya bağımlılığı azaltır.
