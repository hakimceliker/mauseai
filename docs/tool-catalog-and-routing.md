# MouseAI — Araç Kataloğu ve Yönlendirme Sistemi

Bu belge, GPT/Claude içindeki eklenti, uygulama, MCP ve harici servislerin MouseAI tarafından nasıl kullanılacağını tanımlar. Görselde görülen araçlar başlangıç kataloğuna eklenmiştir. Bir araç etkin değilse sistem onu “önerilen ama bağlı değil” olarak işaretler; varmış gibi çağırmaz.

## 1. Araç yönlendirme kuralı

```text
Kullanıcı hedefi
  → Orchestrator görevi sınıflandırır
  → yetenek kataloğunda araç aranır
  → maliyet + izin + güvenlik + kalite puanı hesaplanır
  → en uygun araç çağrılır
  → sonuç doğrulanır
  → sonraki AI/araç için görev paketi oluşturulur
```

Bir araç sağlayıcı değil, yetenek sunar. Örneğin Vercel deploy yapar; mimari kararı vermez. Supabase veri tutar; verinin iş anlamını belirlemez.

## 2. Görseldeki araçların görevleri

| Araç | MouseAI’deki görev | Girdi | Çıktı | Kontrol |
|---|---|---|---|---|
| **vidIQ** | YouTube anahtar kelime, rakip ve kanal analizi | kanal/konu/ülke | keyword, skor, içerik fikirleri | GPT içerik planına aktarır |
| **Windsor.ai** | Çoklu veri kaynağı ve pazarlama verisi toplama | kaynak izinleri | normalize metrikler | Data agent kalite kontrolü |
| **Render** | API, worker, cron ve servis işletimi | build/deploy ayarı | servis URL, health, log | CI/CD + SRE onayı |
| **Vercel** | Web uygulaması ve agent arayüzü build/deploy | repo, env, domain | preview/production deployment | test geçmeden production yok |
| **Exa** | AI ajanları için web araştırması | araştırma sorusu | kaynaklı sonuçlar | GPT kaynak sentezi, Claude doğrulaması |
| **Supabase** | Postgres, auth, storage ve realtime veri | migration/query/policy | kayıt, sonuç, event | RLS ve tenant testi zorunlu |
| **Viewmax** | AI video üretimi ve görsel medya akışı | senaryo, görsel, ses | video işi/çıktı | marka ve telif kontrolü |
| **Remote Desktop Commander** | Yetkili masaüstü işlemleri | imzalı görev + ekran bağlamı | işlem sonucu + kanıt | L3/L4 izin, kayıt ve geri alma |

## 3. Bizim taraftaki araç sınıfları

| Araç sınıfı | Kullanım alanı | Birincil görev |
|---|---|---|
| Dosya/terminal araçları | repo, config, test, build | kontrollü yerel değişiklik |
| Browser/Computer-use | web uygulamaları, CRM, admin panelleri | görsel arayüz işlemi ve kanıt |
| Web araştırma | güncel bilgi ve kaynak | kaynaklı araştırma |
| Image generation | görsel, konsept, reklam | kreatif üretim |
| Doküman/PDF üretimi | teknik ve yönetim dokümanları | teslim dosyası |
| Thread/task yönetimi | paralel uzman görevleri | alt görev dağıtımı ve takip |
| Otomasyon/heartbeat | bekleyen süreçler | değişiklikte bildirim ve devam |
| Güvenlik araçları | threat model, scan, validation | risk bulma ve kapatma |

## 4. Claude tarafına atanacak araç rolleri

Claude tarafındaki her eklenti şu dört sınıftan birine kaydedilir:

1. **Research:** Exa benzeri arama, kaynak karşılaştırma ve uzun belge inceleme.
2. **Build/Review:** repo, diff, test, deployment inceleme ve hata analizi.
3. **Design/Media:** görsel, video, marka ve sunum çıktısı.
4. **Operations:** CRM, e-posta, veri, cloud, tarayıcı ve masaüstü işlemleri.

Claude’a verilen iş paketi mutlaka `task_id`, izin seviyesi, hedef araç, beklenen çıktı ve kanıt alanlarını taşıyacaktır. Claude kendi başına “tüm araçları deneme” davranışına geçemez.

## 5. Yetenek puanlama

```text
tool_score =
  quality * 0.35
  + reliability * 0.20
  + evidence_support * 0.15
  + latency_score * 0.10
  + cost_score * 0.10
  + tenant_fit * 0.10
```

Kritik görevlerde güvenlik ve kanıt puanı kalite kadar önceliklidir. En ucuz araç otomatik olarak seçilmez.

## 6. Araç kayıt şeması

```yaml
tool_id: vercel
display_name: Vercel
provider: vercel
categories: [hosting, deployment, web]
capabilities: [build, preview_deploy, production_deploy]
required_permissions: [repo_read, deploy_write]
risk_level: high
cost_model: usage
supports_rollback: true
evidence_types: [deployment_url, build_log, health_check]
fallback_tools: [render]
status: proposed|connected|paused|blocked
```

## 7. Araç kullanma yetki seviyeleri

| Seviye | Araç işlemi | Kural |
|---|---|---|
| T0 | arama, okuma, analiz | otomatik, kaynak kaydı |
| T1 | taslak üretme, preview, test | otomatik, kanıt zorunlu |
| T2 | e-posta taslağı, CRM kaydı, staging deploy | politika kontrolü |
| T3 | production deploy, reklam bütçesi, müşteri mesajı | yetkili onay |
| T4 | ödeme, iade, veri silme, masaüstü kritik işlem | insan + çift kontrol |

## 8. Araçlar arası devir örnekleri

### SEO ve video

`Exa → vidIQ → GPT SEO planı → Claude editoryal kontrol → Viewmax video → Canva/Figma kreatif → Vercel yayın → Analytics ölçüm`

### Teknik geliştirme

`GPT mimari taslak → Claude review → kod ajanı → Supabase migration → test → Render/Vercel preview → güvenlik taraması → insan onayı → production`

### Müşteri ve satış

`E-posta → GPT sınıflandırma → Supabase müşteri geçmişi → GPT teklif → Claude risk/ton kontrolü → policy engine → e-posta gönderimi → audit/CRM`

## 9. Eksik eklentilerin sisteme eklenme prosedürü

Yeni bir eklenti bulunduğunda önce bağlantı kurulmaz. Şu kayıt oluşturulur:

1. Araç adı ve sağlayıcı.
2. Hangi problemi çözdüğü.
3. API/MCP veya tarayıcı erişimi.
4. Okuma/yazma izinleri.
5. Maliyet ve kota.
6. Veri işleme ve gizlilik riski.
7. Fallback araç.
8. Test görevi ve kabul kanıtı.

Orchestrator bu kaydı onaylamadan aracı üretim akışına eklemez.

## 10. İlk sürümde uygulanacak araç politikası

- Mock araçlarla bağlantısız test yapılır.
- Gerçek araçlar önce okuma/preview modunda açılır.
- Yazma ve production işlemleri görev bazlı izin ister.
- Her çağrı maliyet, süre, kullanıcı/tenant ve çıktı kanıtıyla kaydedilir.
- Bir araç başarısız olursa tanımsız başka araç rastgele denenmez; kayıtlı fallback seçilir.

## 11. Mevcut çalışma ortamı araç envanteri

Tarama sonucunda bu çalışma ortamında **1.478 çağrılabilir araç** bulundu. Bunlar yalnızca ekran görüntüsündeki sekiz araçtan ibaret değildir. `mcp__codex_apps` altında 1.397 araç ve uygulama işlemi, ayrıca Codex, güvenlik, web, görsel üretim, dosya ve görev yönetimi araçları bulunmaktadır.

### Bağlı uygulama aileleri ve görev alanları

| Uygulama ailesi | Araç sayısı | MouseAI görevi |
|---|---:|---|
| Longbridge | 133 | piyasa/finans araştırması |
| Binance | 89 | kripto fiyat, emir ve hesap işlemleri; yalnızca yüksek yetki |
| GitHub | 89 | repo, issue, PR, CI ve release |
| Microsoft | 85 | Outlook, dosya, takvim ve kurumsal iş akışları |
| Linear | 74 | proje, sprint, issue ve görev takibi |
| vidIQ | 65 | YouTube SEO ve kanal analizi |
| Google | 63 | Drive, Sheets, Docs, Slides, Analytics ve arama verileri |
| ChatGPT/OpenAI | 49 | model, görev ve OpenAI iş akışları |
| Notion | 46 | bilgi tabanı, doküman ve proje kayıtları |
| Quartr | 45 | şirket/finans araştırması |
| Figma | 41 | UI, prototip ve tasarım sistemi |
| Canva | 39 | marka, reklam ve sosyal içerik |
| Tamarind | 36 | bağlı uygulama/operasyon iş akışları |
| Atlassian | 32 | Jira/Confluence proje ve dokümantasyon |
| Shopify | 32 | mağaza, ürün, sipariş ve müşteri operasyonu |
| Remote Desktop | 30 | yetkili masaüstü otomasyonu |
| Vercel | 30 | web/agent build ve deploy |
| Runway | 29 | video ve medya üretimi |
| Supabase | 29 | veri tabanı, auth, storage ve sorgu |
| Firecrawl | 27 | web crawl, scrape, map ve araştırma |
| Alpaca | 24 | piyasa verisi ve finans analizleri |
| Dropbox | 24 | dosya arama, okuma, düzenleme ve paylaşım |
| Sites | 24 | web sitesi işlemleri |
| Stack | 24 | bağlı veri/operasyon işlemleri |
| Render | 22 | servis, worker, cron ve deploy |
| Gmail | 21 | e-posta müşteri asistanı |
| Lona | 18 | bağlı operasyon akışları |
| Windsor | 17 | pazarlama veri kaynakları |
| Stocktwits | 13 | piyasa/sosyal sinyal araştırması |
| CoinMarketCap | 12 | kripto piyasa verisi |
| CoinGecko | 11 | kripto piyasa verisi |
| Metricool | 9 | sosyal medya ve pazarlama raporu |
| AWS | 8 | cloud altyapı işlemleri |
| Descript | 8 | ses/video düzenleme |
| InVideo | 7 | video üretimi |
| Plugin yönetimi | 6 | eklenti yaşam döngüsü |
| Safety | 5 | güvenlik ve içerik kontrolü |
| Diğer seyahat/iş araçları | 20+ | alan özel araştırma ve operasyon |

### Ayrı sistem araçları

- Web araştırma ve kaynak doğrulama
- Browser/Computer-use ve görsel kanıt
- Dosya okuma/yazma ve terminal işlemleri
- Görsel üretim ve düzenleme
- PDF, Word, tablo, sunum ve rapor üretimi
- Codex task/thread, worktree, otomasyon ve heartbeat
- Multi-agent görev dağıtımı
- OpenAI API anahtarının güvenli kurulum akışı
- Güvenlik taraması, threat model, triage ve validation

## 12. Bu envanter MouseAI’ye nasıl bağlanacak?

Her aile `Tool Registry` içinde ayrı adapter olarak tanımlanacak. Örneğin:

```text
SEO görevi:
Google Search Console + Analytics + vidIQ + Firecrawl
→ GPT analiz
→ Claude kalite/çelişki kontrolü
→ Notion/Linear görev kaydı

Kod görevi:
GitHub + Linear + Supabase + Vercel/Render
→ GPT uygulama planı
→ Claude code review
→ Security scan
→ CI/CD deploy

E-ticaret görevi:
Shopify + Gmail + Google Sheets + Supabase
→ GPT müşteri/satış asistanı
→ policy engine fiyat kontrolü
→ audit ve rapor

Finans görevi:
Alpaca/Longbridge/Binance/CoinGecko/CoinMarketCap
→ araştırma/analiz ajanı
→ risk kontrolü
→ insan onayı olmadan emir veya transfer yok
```

## 13. Claude araçları için gerçek bağlantı kuralı

Bu çalışma ortamında Claude’un harici hesabına ait araç listesi doğrudan görünmüyorsa Claude araçları varmış gibi gösterilmeyecektir. Claude için aynı `Tool Registry` sözleşmesi kullanılacak; Claude hesabı/eklenti bağlantısı yapıldığında gerçek araç adları ve izinleri otomatik envantere eklenecektir.

Bu nedenle sistemde iki durum bulunur:

- `connected`: araç gerçekten çağrılabilir ve test edilmiştir.
- `planned`: görev tanımı hazırlanmış ancak bağlantı/izin testi tamamlanmamıştır.

MouseAI yalnızca `connected` durumundaki aracı üretim görevinde kullanabilir.

## 14. Tam isim listesi

Bu katalogdaki özet tabloların yanında, taramada görünen 1.478 aracın tamamı isim ve kısa açıklamalarıyla ayrı envanter dosyasındadır:

`docs/available-tools-inventory.md`
