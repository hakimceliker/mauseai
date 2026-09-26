# MouseAI Ürün ve Teknik Yol Haritası

**Durum:** Taslak — MVP kullanım senaryoları kapsamda; teknik karar kapıları açık  
**Referans tarihi:** 26 Eylül 2026  
**İlk teslim hedefi:** 14 günlük çekirdek MVP

Bu belge, yüklenen MouseAI dokümanlarını tek bir uygulanabilir yol haritasında birleştirir. Yol haritası ürün vizyonunu korurken her fazı test edilebilir teslimlere, güvenlik sınırlarına ve çıkış kriterlerine bağlar.

## 1. Kaynak önceliği ve mevcut başlangıç noktası

### Doküman önceliği

1. `MouseAI_Nihai_Mimari_ve_Isletim_Anayasasi.md`: ürün vizyonu, yönetişim ve uzun vadeli ana referans.
2. `14-gunluk-cekirdek-uygulama-spesifikasyonu.md`: MVP stack’i, kapsamı ve 14 günlük kabul ölçütleri.
3. `14-gunluk-master-backlog.md`: uygulama görevlerinin günlük dökümü.
4. `MouseAI_Teknik_Sistem_Dokumani.md` ve `mouseai-tam-projeksiyon.md`: teknik ayrıntılar ve sonraki fazlar.
5. Tekrarlı PDF/DOCX ve çıkarılmış kopyalar: ana kaynakların yerine geçmez; çelişkide yeni karar olarak değerlendirilir.

### Depo başlangıç noktası

Yol haritası hazırlanırken depoda yalnızca temel README bulunuyordu; uygulama iskeleti, migration, test veya çalışma kodu henüz yoktu. Bu nedenle Faz 1’in ilk işi mevcut belgelerde anlatılan mimariyi varsaymak değil, doğrulanabilir bir temel kurmaktır.

### Ürün ilkeleri

- Cloud-first ve çok kiracılı yapı; kiracı sınırı en başından itibaren veritabanı politikalarıyla korunur.
- Modüler monolit ile başlanır; trafik ve ekip ihtiyacı kanıtlanmadan mikroservis ayrıştırılmaz.
- Görev, adım, yetki, maliyet, kanıt ve audit kaydı uçtan uca izlenir.
- Dış dünyada etkisi olan, finansal veya geri alınamaz işlem açık politika ve gerekli insan onayı olmadan çalışmaz.
- Yeni connector ve provider önce mock/test ortamında doğrulanır; canlıya alınması ayrı bir onay kapısıdır.
- Bir teslim “tamamlandı” sayılmak için kabul testi ve kanıt gerektirir.

## 2. Faz 1 — 14 günlük çekirdek MVP

### Amaç

İki senaryoyu aynı görev motoru üzerinde gösteren çalışan bir demo üretmek:

1. **Genel görev / SEO raporu:** Kullanıcı hedef verir; MouseAI işi adımlara ayırır, mock GPT/Claude çalıştırır, checkpoint yazar ve rapor üretir.
2. **E-posta müşteri operasyonu:** Mock inbound e-posta Conversation/Message kaydına dönüşür; sistem yanıt veya teklif taslağı hazırlar, politika kontrolünden geçirir ve insan onayında durur.

İki senaryo aynı task, tenant, worker, checkpoint, maliyet ve audit altyapısını kullanır. E-posta senaryosu gerçek mailbox bağlantısı veya otomatik gönderim içermez.

### MVP teknoloji sınırı

| Alan | MVP tercihi |
|---|---|
| Web ve API | Next.js App Router + TypeScript strict |
| Auth ve veri | Supabase Auth + PostgreSQL + RLS |
| Dayanıklı yürütme | Inngest |
| Doğrulama | Zod |
| AI | Mock GPT/Claude sağlayıcıları; canlı anahtar yok |
| Task graph | Küçük ve test edilebilir state machine/graph |
| Arayüz | Web görev listesi, görev zaman çizelgesi, onay ve maliyet/audit özeti |
| Test | Unit, integration ve seçilmiş uçtan uca akışlar |

BullMQ/Redis, ödeme, gerçek connector, mobil, masaüstü ve production’da serbest browser otomasyonu MVP kapsamı dışındadır.

### 14 günlük teslim planı

| Gün | Teslim | Kabul kanıtı |
|---:|---|---|
| 1 | Repo yapısı, Next.js/TypeScript, kalite komutları, güvenli env şablonu | Yerel lint, typecheck ve build geçer; secret repoda yoktur |
| 2 | Task/Workflow/Step/Checkpoint/Audit sözleşmeleri ve durum makinesi | Zod geçerli ve geçersiz örnekleri ayırır; geçiş kuralları testlidir |
| 3 | Supabase temel şeması, Auth, tenant üyeliği ve RLS | Kimliksiz ve çapraz tenant erişimi reddedilir |
| 4 | Task oluşturma, okuma, iptal ve devam API’leri | Yetkili kullanıcı yalnızca kendi tenant görevlerine erişir |
| 5 | Inngest event ve worker; adım sonucu/checkpoint yazımı | Task kuyruğa girer; durum ve checkpoint kalıcıdır |
| 6 | Retry, timeout, cancel/resume ve idempotency | Aynı task/step tekrarı çift yan etki üretmez |
| 7 | Mock GPT/Claude provider ve router sözleşmesi | Provider seçimi ve cevap çıktısı doğrulanır, çağrılar izlenir |
| 8 | Token/maliyet simülasyonu, görev bütçesi ve tenant limiti | Limit aşımı sonraki çağrıyı durdurur ve audit üretir |
| 9 | Append-only audit/event akışı | Kritik olaylar actor, action, resource, zaman ve maliyetle sorgulanır |
| 10 | SEO raporu görev şablonu ve çıktı görünümü | Hedef → plan → mock analiz → checkpoint → rapor uçtan uca çalışır |
| 11 | Mock e-posta inbound; Conversation/Message ve sınıflandırma | Tekrarlanan provider message id ikinci Conversation/işlem üretmez |
| 12 | Offer/Policy Engine ve insan onayı | Politika dışı teklif bloke olur; geçerli taslak `HUMAN_APPROVAL_REQUIRED` olur |
| 13 | Entegrasyon, güvenlik ve hata senaryoları | İki demo akışı; retry, duplicate, tenant, limit, cancel ve provider hatası testlidir |
| 14 | Görev kontrol arayüzü, README/runbook, demo ve kabul raporu | Kullanıcı iki akışı görebilir; bilinen sınırlamalar ve kanıtlar raporlanır |

Günlük sıra bir planlama hedefidir, tek başına süre garantisi değildir. Kimlik ve tenant izolasyonu API’den önce kurulmalıdır; bu nedenle kaynak dokümanlardaki “Auth’u son günlerde ekleme” sırası güvenlik temeli açısından burada öne çekilmiştir.

### MVP çıkış kapısı

- SEO görevinde hedef → task → worker → checkpoint → devam → mock provider → maliyet/audit → rapor akışı geçer.
- E-posta mock’unda inbound → conversation → taslak/offer → policy → insan onayı akışı geçer.
- Tenant verisi başka tenant tarafından okunamaz; güvenlik negatif testleri çalışır.
- Duplicate event ve retry tekrar çalıştırıldığında çift yan etki oluşmaz.
- Test, lint, typecheck ve build raporları saklanır; kritik açık hata kalmaz.
- Gerçek model anahtarı, gerçek e-posta gönderimi, ödeme ve production deploy yapılmaz.

## 3. MVP sonrası fazlar

Faz geçişi takvimle değil, önceki fazın çıkış kriterlerini kanıtlamakla yapılır. Aşağıdaki süreler ve başarı metrikleri ürün sahibi onayından sonra ayrıca tahmin edilmelidir.

| Faz | Sonuç | Ana teslimler | Çıkış kapısı |
|---|---|---|---|
| 0 — Kapsam ve hazırlık | Kararları ve sınırları sabitle | Ürün kapsamı, risk/yetki matrisi, teknoloji ADR’leri, MVP kabul planı | Demo hedefi, yetki ve MVP sınırı onaylı |
| 1 — Çekirdek MVP | Görev motorunu ve iki kontrollü demo akışını kanıtla | Yukarıdaki 14 günlük teslimler | İki senaryo, izolasyon ve recovery testleri geçer |
| 2 — Platform ve gerçek sağlayıcılar | Mock katmandan ölçülebilir entegrasyonlara geç | Gerçek GPT/Claude adaptörleri, connector SDK/registry, operatör paneli, tracing ve kota | Sağlayıcı fallback/limitleri testli; connector izinleri denetlenebilir |
| 3 — Müşteri operasyonları ve gelir | Kontrollü e-posta iş akışını pilota hazırla | Gmail/Microsoft connector, SLA, onaylı yanıt/teklif, kredi ledger ve ödeme adaptörü | İmza doğrulama, idempotency, politika ve mutabakat kanıtlı; otomatik gönderim yalnızca onaylı politika altında |
| 4 — Uygulama yüzeyleri | Görevleri web dışındaki kanallara taşı | Tauri desktop, mobil istemci, browser extension, acil durdurma | Her yüzey aynı yetki, durum ve audit modelini uygular |
| 5 — Pazarlama ve medya operasyonları | Araştırma-üretim-ölçüm döngüsünü aç | SEO/analytics, içerik, reklam, tasarım ve medya connector’ları | İçerik/yayın adımları onay ve rollback ile ölçülür |
| 6 — Ajans ve ekosistem | Birden fazla işletme ve üçüncü taraf geliştirici desteği | Ajans workspace, white-label, public API/SDK, connector marketplace | Tenant izolasyonu ve connector güven modeli bağımsız testlidir |
| 7 — Enterprise ve uyum | Kurumsal güvenlik ve özel işletim | SSO/SCIM, data residency, SIEM, DPA, özel deployment, DR | Kurumsal güvenlik, yedekleme ve geri dönüş kabulü tamam |
| 8 — Ölçekli otonom işletim | Çok bölgeli ve yüksek hacimli çalışma | Otomatik kapasite, kalite/maliyet optimizasyonu, gelişmiş rollback | Kapasite, maliyet, kalite ve güvenlik KPI’ları kararlı biçimde hedefte |

## 4. Değişiklik ve güvenlik kapıları

- Gerçek API anahtarı, provider, connector, webhook ve scope için secret/izin incelemesi zorunludur.
- Müşteriye mesaj gönderme, ödeme, para hareketi, veri silme ve production deploy ayrı insan onayı gerektirir.
- Kredi/cüzdan bakiyesi doğrudan AI tarafından değiştirilemez; finansal gerçek, idempotent ve mutabakatlı ledger’dır.
- Prompt veya provider çıktısı yetki kaynağı değildir; araç izinlerini Policy Engine belirler.
- Her yeni kapsam önerisi; kullanıcı değeri, etkilenen modüller, veri/API etkisi, güvenlik, maliyet, test ve rollback bilgisiyle change-control’den geçer.
- Fazlar atlanmaz; yüksek riskli özellikler önce mock/sandbox ve sınırlı pilotta doğrulanır.

## 5. Çözülmesi gereken kararlar

| Karar | Dokümanlardaki belirsizlik | Önerilen varsayılan | Ne zaman kapanmalı |
|---|---|---|---|
| MVP graph teknolojisi | Backlog yalnız custom state machine; çekirdek spesifikasyon custom graph + hafif LangGraph; projeksiyon LangGraph görev grafiğinin sahibi diyor | 14 günlük demo için küçük custom state machine; LangGraph’ı gerçek DAG/HITL gereksinimi kanıtlanana kadar ertele | Gün 1 teknik karar kaydı |
| AI SDK sınırı | Vercel AI SDK, LiteLLM/OpenRouter seçenekleri birden fazla belgede birlikte geçiyor | MVP mock provider’ı arayüz arkasında tut; ikinci router ekleme | Canlı provider fazı başlamadan |
| Demo kapsamının maliyeti | SEO ve müşteri operasyonu ayrı senaryolar; ikisini birden MVP’ye almak kapsamı büyütüyor | Ortak altyapı; e-posta gönderimi ve CRM dışı entegrasyonlar mock | Gün 1 planlama ve kapasite tahmini |
| Operasyonel sahiplik | Belgeler GPT/Claude/Cursor gibi araçlara rol atıyor, fakat repo için gerçek insan sahipleri belirtilmiyor | Her teslim kartına insan owner ve reviewer atanması | Kod görevleri açılmadan |
| Takvim/kaynak | 14 gün hedefi var; ekip kapasitesi ve günlük kullanılabilirlik belirtilmemiş | 14 günü hedef iterasyon kabul et; riskli işlere buffer koy | Sprint başlangıcında |

Karar kapıları yeni karar kaydıyla kapatılır; taslak varsayılanlar sessizce mimari sözleşme kabul edilmez.

## 6. MVP başarı ölçümü

Önce ölçüm altyapısı doğru çalıştırılır; başlangıçta ürün performansı için uydurma hedef yüzdeler konmaz.

- Task başarı/tamamlama ve checkpoint’ten devam oranı
- Retry, duplicate event ve provider hata oranı
- Task/step/provider başına tahmini ve gerçekleşen maliyet
- İnsan onayına giden işlerin sayısı ve bekleme süresi
- RLS negatif testlerinin sonucu ve güvenlik bulgularının kapanma süresi
- Demo senaryolarının otomatik ve elle kabul durumu

## 7. Sonraki uygulama sırası

1. Gün 1 karar kapılarını ve ekip kapasitesini netleştir.
2. Repo iskeleti ve kalite kapılarını kur.
3. Auth, tenant ve veri erişim sınırlarını erkenden uygula.
4. Ortak task/checkpoint/audit/maliyet çekirdeğini tamamla.
5. SEO ve mock e-posta/offer senaryolarını aynı çekirdeğe bağla.
6. İki senaryonun kabul kanıtları geçmeden gerçek entegrasyon veya canlı işlem ekleme.
