# MouseAI — A’dan Z’ye Tam Proje Projeksiyonu

**Sürüm:** 1.0  
**Durum:** Temel mimari ve görev kanunu ile uyumlu proje ana planı  
**Kapsam:** Ürün, teknik sistem, AI rolleri, araç ekosistemi, iş modeli, ödeme, müşteri operasyonu, güvenlik, büyüme ve yol haritası.

## 1. Ürün tanımı

MouseAI, kullanıcı hedefini alıp işi parçalayan, uygun yapay zekâ ve uygulama araçlarını seçen, görevleri çalıştıran, duraklamalarda devam ettiren, maliyeti izleyen ve kanıtlanabilir nihai rapor veren bir AI operasyon platformudur.

Ürün; web uygulaması, masaüstü ajanı, mobil kontrol uygulaması, CRM/e-posta eklentileri ve API olarak sunulacaktır.

## 2. Ana değer önerisi

- Tek hedef → çok adımlı otomatik iş akışı
- GPT, Claude ve diğer modelleri yeteneklerine göre birlikte kullanma
- Yüzlerce uygulamayı tek görev grafiğinde birleştirme
- Duraklayan işlerde checkpoint’ten devam
- İnsan yerine çalışan ama yetki sınırları olan dijital çalışan
- E-posta merkezli AI müşteri asistanı
- Politika kontrollü fiyatlandırma ve pazarlık
- Kredi/cüzdan/kullanım bazlı maliyet yönetimi
- Her işlemin kanıt, log, maliyet ve risk kaydı

## 3. Kullanıcı segmentleri

| Segment | Ana ihtiyaç | Ürün paketi |
|---|---|---|
| Bireysel kullanıcı | kişisel otomasyon, araştırma, içerik | Starter |
| Freelancer | müşteri, teklif, içerik, rapor | Pro |
| KOBİ | CRM, e-posta, satış, reklam, operasyon | Business |
| Ajans | yüzlerce müşteri ve çoklu tenant | Agency |
| Kurumsal | güvenlik, özel model, audit, SSO | Enterprise |
| Geliştirici | API, SDK, connector ve agent altyapısı | Platform |

## 4. Ürün yüzeyleri

1. **Web Control Center:** görev oluşturma, akış, dashboard, maliyet ve onay.
2. **Desktop Agent:** yerel dosya, tarayıcı ve masaüstü işlemleri; izinli görevlerle.
3. **Mobile App:** bildirim, onay, görev durumu, acil durdurma ve rapor.
4. **Browser Extension:** web sayfası bağlamı, CRM ve admin paneli otomasyonu.
5. **CRM/E-mail Extensions:** Gmail, Microsoft ve CRM içinden MouseAI görevi açma.
6. **Public API/SDK:** şirketlerin kendi sistemlerinden görev göndermesi.
7. **Admin Console:** tenant, kullanıcı, rol, kredi, araç, politika ve audit yönetimi.

## 5. Sistem mimarisi

```text
Web / Mobile / Desktop / Extension / API
                 ↓
          API Gateway + Auth
                 ↓
          MouseAI Orchestrator
       ↙       ↓        ↘
 Task Graph  Policy     AI Router
   Engine     Engine   GPT/Claude/Other
       ↓       ↓        ↓
 Queue/Worker  Audit   Tool Registry
       ↓                ↓
 Connectors: GitHub, Google, Microsoft, Shopify, SEO, Design, Cloud, Finance
                 ↓
 PostgreSQL/Supabase + Object Storage + Event Bus + Observability
```

## 6. Ana servisler

| Servis | Görev |
|---|---|
| API Gateway | kimlik, rate limit, tenant ve istek doğrulama |
| Orchestrator | hedef, plan, görev grafiği ve durum yönetimi |
| Task Service | görev oluşturma, durum, checkpoint, retry |
| AI Router | model/sağlayıcı seçimi, maliyet ve kalite dengesi |
| Policy Engine | izin, fiyat, iletişim, veri ve risk kuralları |
| Tool Registry | tüm AI ve araçların gerçek bağlantı/izin kataloğu |
| Connector Service | harici uygulama adaptörleri |
| Queue/Worker | asenkron, paralel ve zamanlanmış yürütme |
| Conversation Service | e-posta/müşteri konuşması ve SLA |
| Offer Service | fiyat, indirim, marj ve teklif akışı |
| Billing/Ledger | cüzdan, kredi, kullanım, ödeme ve iade |
| Audit Service | değişmez işlem ve karar kaydı |
| Report Service | çıktı, özet, PDF, Word ve dashboard |
| Notification Service | e-posta, mobil, webhook ve onay bildirimleri |
| Observability | log, metric, trace, maliyet ve alarm |

## 7. GPT–Claude görev modeli

### GPT/Kodex

Planlama, API, mimari, kod üretimi, entegrasyon, test planı, görev yürütme, araç çağırma ve operasyon raporu.

### Claude/Claude Code

Büyük repo, terminal, refactor, uzun doküman, kod inceleme, güvenlik/risk, çelişki ve kalite denetimi.

### Kesin sınır

İki sistem de kendisine verilmeyen yetkiyi kullanamaz. GPT üretim yapabilir ama denetimsiz merge/deploy yapamaz. Claude denetler ama açıkça atanmadıkça üretim kodu veya müşteri işlemi yapamaz.

## 8. Kod üretim modeli

```text
GPT/Kodex → gereksinim, mimari, görev kartı
Cursor → günlük uygulama
Claude Code → terminal, büyük refactor, hata çözümü
Copilot → küçük satır içi öneri
Claude → bağımsız review ve risk kontrolü
CI → test, lint, typecheck, security scan
İnsan → yüksek riskli onay
Vercel/Render → preview ve kontrollü production
```

## 9. Araç ekosistemi ve görevleri

### Kod, proje ve bilgi

GitHub kod/PR/CI; Linear sprint ve issue; Atlassian Jira/Confluence; Notion bilgi tabanı; Dropbox dosya; Microsoft/Google kurumsal belgeler.

### Cloud ve veri

Supabase/PostgreSQL veri, auth ve storage; Vercel web; Render API/worker/cron; AWS kurumsal altyapı; Firecrawl crawl/scrape/map; Windsor veri kaynakları.

### Araştırma ve SEO

Exa araştırma; Google Analytics/Search Console ölçüm; vidIQ YouTube SEO; Firecrawl içerik ve rakip taraması; Metricool sosyal performans.

### Tasarım ve medya

Figma UI/prototip; Canva marka ve reklam; Runway/Viewmax/InVideo video; Descript ses/video düzenleme.

### İş ve e-ticaret

Shopify ürün/sipariş/müşteri; Gmail/Microsoft e-posta; CRM connector’ları; Google Sheets raporlama ve operasyon.

### Finans

Alpaca/Longbridge piyasa; Binance kripto; CoinGecko/CoinMarketCap veri; ledger ve ödeme adaptörleri. Finansal işlem L4 yetkisindedir.

### Otomasyon

Browser/Computer-use; Remote Desktop; webhook, queue, cron, heartbeat ve görev izleme.

Tam isimli araç envanteri ayrı dosyadadır: `docs/available-tools-inventory.md`.

## 10. Temel iş akışı

```text
Kullanıcı hedefi
 → hedef doğrulama ve risk sınıfı
 → plan ve görev grafiği
 → araç/model seçimi
 → izin ve bütçe kontrolü
 → görev yürütme
 → çıktı doğrulama
 → review/test
 → dış sisteme yazma veya onay bekleme
 → rapor, audit ve maliyet kaydı
```

## 11. E-posta müşteri asistanı

1. Gmail/Microsoft adaptörü e-postayı alır.
2. GPT dili ve niyeti belirler.
3. Conversation ve müşteri geçmişi yüklenir.
4. GPT cevap veya teklif taslağı üretir.
5. Claude ton, risk ve politika denetimi yapar.
6. Policy Engine fiyat/indirim/marj sınırını kontrol eder.
7. Uygunsa gönderim kuyruğu; değilse insan onayı.
8. Cevap, SLA, maliyet ve karar audit’e yazılır.

WhatsApp ikinci faz ücretli kanaldır. E-posta MVP için daha kontrollü, arşivlenebilir ve düşük operasyon maliyetlidir.

## 12. Finans, kredi ve cüzdan

- Kullanıcı ve firma bazlı cüzdan
- Kredi paketleri ve kullanım düşümü
- Model/araç bazlı maliyet ölçümü
- Abonelik ve kullanım bazlı ücret
- Kart ödeme ve fatura
- İade ve mutabakat
- Kripto ödeme ikinci faz
- Çift taraflı ledger
- Webhook imzası ve fraud kontrolü

AI doğrudan bakiye değiştiremez. Tüm hareketler Billing/Ledger servisinden geçer.

## 13. Güvenlik ve yönetişim

- Deny-by-default
- En az yetki
- Tenant izolasyonu
- SSO/MFA ve rol tabanlı erişim
- Secret manager; anahtarlar repo/log/chat içine yazılmaz
- Prompt injection ve tool hijacking koruması
- Webhook imzası
- Veri şifreleme ve saklama politikası
- KVKK/GDPR erişim/silme/rıza
- Değişmez audit log
- İnsan onayı gereken işlemler için kill switch

Bağlayıcı kurallar: `docs/mouseai-ai-gorev-yetki-arac-kanunu.md`.

## 14. 14 günlük çekirdek uygulama

| Gün | Teslim |
|---|---|
| 1 | repo, ortam, kalite kapıları |
| 2 | Task/Workflow/Step sözleşmeleri |
| 3 | task create/get/cancel API |
| 4 | PostgreSQL/Supabase model ve migration |
| 5 | queue, worker, checkpoint |
| 6 | retry, timeout, idempotency |
| 7 | mock AI provider ve router |
| 8 | maliyet/limit/sağlayıcı seçimi |
| 9 | audit/event ledger |
| 10 | e-posta Conversation modeli |
| 11 | Offer ve kontrollü teklif |
| 12 | auth, tenant ve güvenlik |
| 13 | entegrasyon/hata testleri |
| 14 | demo, runbook, kabul ve sürüm |

## 15. 14 gün sonrası yol haritası

### Faz 2 — Platform güçlendirme

API Gateway, connector SDK, Tool Registry, admin panel, gözlemlenebilirlik, maliyet optimizasyonu ve daha fazla sağlayıcı.

### Faz 3 — Müşteri operasyonu

E-posta üretim kullanımı, CRM, SLA, teklif/pazarlık, şablonlar, müşteri geçmişi ve WhatsApp premium kanal.

### Faz 4 — Çoklu kanal ve medya

Browser, desktop, mobile, sosyal medya, video, reklam ve tasarım workflow’ları.

### Faz 5 — Kurumsal

SSO, SCIM, özel tenant, private deployment, data residency, özel model ve gelişmiş audit.

### Faz 6 — Platform ekonomisi

Marketplace, connector geliştirici programı, partner API, white-label ve kurumsal lisans.

## 16. İş modeli

1. Aylık abonelik.
2. Kullanım bazlı kredi.
3. Araç/connector premium ücretleri.
4. E-posta ve WhatsApp kanal paketleri.
5. Enterprise güvenlik ve özel deployment.
6. API/SDK kullanım ücreti.
7. Marketplace gelir paylaşımı.
8. Ajans çoklu müşteri paketi.

Maliyet formülü: model token + araç çağrısı + depolama + compute + ödeme komisyonu + destek maliyeti. Fiyatlandırma minimum marj politikasına bağlıdır.

## 17. Yönetim modeli

| Yönetim alanı | Sahip |
|---|---|
| Ürün hedefi | İnsan ürün sahibi + Orchestrator |
| Teknik karar | Mimari ajan + insan teknik sorumlu |
| Günlük kod | GPT/Cursor/Claude Code |
| Kalite | Claude + QA |
| Güvenlik | Security agent + insan güvenlik sorumlusu |
| Müşteri politikası | Firma yöneticisi + policy engine |
| Finans | Ledger + insan finans sorumlusu |
| Release | CI/CD + insan onayı |
| Araç bağlantıları | Tool Registry yöneticisi |

## 18. Başarı ölçütleri

- Başarılı görev oranı
- İnsan müdahalesi gerektiren görev oranı
- Ortalama görev süresi
- Hata sonrası devam oranı
- Token ve araç başına maliyet
- Müşteri yanıt süresi
- Teklif dönüşüm oranı
- Yanlış cevap/eskalasyon oranı
- Test ve güvenlik bulgusu kapanma süresi
- Tenant başına brüt marj

## 19. İlk sürüm kabul kriterleri

İlk sürüm; hedef alabilmeli, görev oluşturabilmeli, mock provider ile çalışabilmeli, duraklayıp devam edebilmeli, maliyet ve audit kaydı oluşturabilmeli, e-posta Conversation/Offer akışını test edebilmeli ve yetkisiz işlemi durdurabilmelidir.

## 20. Nihai çalışma ilkesi

MouseAI; GPT, Claude veya herhangi bir aracı sınırsız çalışan bir personel gibi değil, görev, izin, bütçe, kanıt ve denetim sınırları olan uzman bir dijital operasyon ekibi gibi çalıştırır.

## 21. Onaylı teknoloji standardı

Bu proje için hızlı çıkış, ölçeklenebilirlik ve güvenlik dengesi açısından aşağıdaki stack ana teknik standarttır.

### MVP çekirdek stack

| Katman | Standart | Görevi |
|---|---|---|
| Dil | TypeScript | ortak tip güvenliği ve ekip üretkenliği |
| Web/API | Next.js 15 | Control Center, admin ve ilk API sınırı |
| UI | Tailwind + shadcn/ui + Tremor | ürün arayüzü, formlar ve dashboard |
| Veri/Auth | Supabase PostgreSQL + Auth + Storage + RLS | multi-tenant, kullanıcı, veri, dosya ve tenant izolasyonu |
| Task Graph | LangGraph | plan, node, checkpoint ve human-in-the-loop |
| Uzun iş yürütme | Inngest | retry, timeout, schedule, paralel iş ve dayanıklı workflow |
| Alternatif queue | BullMQ + Redis | Inngest’in yetmediği yüksek hacimli worker senaryosu |
| AI Router | Vercel AI SDK + LiteLLM/OpenRouter | GPT, Claude, Gemini ve diğer sağlayıcıları ortak arayüzle yönlendirme |
| Tool standardı | MCP + MouseAI Tool Registry | connector, izin, schema, maliyet ve fallback |
| Billing | Stripe + Postgres çift taraflı ledger | abonelik, kredi, cüzdan, kullanım ve iade |
| Gözlemlenebilirlik | Langfuse + Sentry + PostHog | trace, token maliyeti, hata ve ürün analitiği |
| Deploy | Vercel + Render | web/API ve uzun çalışan worker ayrımı |
| Redis | Upstash | yalnızca ihtiyaç halinde queue/cache/rate limit |
| Secret | Supabase Vault veya Doppler | anahtarların güvenli saklanması |
| CI/CD | GitHub Actions + Vercel | test, scan, preview ve kontrollü release |

### Ürün yüzeyleri

- Desktop Agent: Tauri birincil, Electron yalnızca ihtiyaç doğarsa alternatif.
- Mobile: Expo/React Native.
- Browser Extension: Plasmo veya WXT; tek seçenek proje başlangıcında belirlenir.
- Gmail/Microsoft: Gmail API ve Microsoft Graph.
- Public API/SDK: Hono veya Next.js route sınırı; sözleşme OpenAPI ile sabitlenir.

## 22. Teknoloji seçimlerinin bağlayıcı kararları

1. MVP’de aynı işi yapan iki framework paralel kurulmaz.
2. LangGraph görev grafiğinin mantıksal sahibidir; Inngest dayanıklı yürütmenin sahibidir.
3. Supabase tenant verisinin sahibidir; RLS olmadan üretim verisi açılamaz.
4. Vercel web/API, Render uzun süreli worker için kullanılır.
5. Stripe tahsilat sağlayıcısıdır; bakiye ve kredi gerçeği kendi Postgres ledger’ımızdır.
6. Vercel AI SDK/LiteLLM sağlayıcı soyutlama katmanıdır; Orchestrator ve Policy Engine’in yerine geçmez.
7. MCP bağlantı standardıdır; Tool Registry izin ve yaşam döngüsünün sahibidir.
8. Langfuse iz ve model maliyeti, Sentry uygulama hatası, PostHog ürün davranışı için ayrıdır.
9. Tauri, masaüstü ajanında en az yetki ve daha düşük kaynak kullanımı nedeniyle birincil tercihtir.

## 23. Teknoloji riskleri ve önlemler

| Risk | Önlem |
|---|---|
| Next.js API ile uzun işlerin karışması | uzun işleri Inngest/Render worker’a ayırma |
| Serverless timeout | checkpoint ve event tabanlı devam |
| LangGraph state büyümesi | özet state, object storage ve versiyonlu checkpoint |
| Sağlayıcı maliyeti | AI Router, LiteLLM, bütçe limiti ve model fallback |
| Supabase tek noktaya bağımlılık | export, backup, migration ve adapter sınırı |
| RLS hatası | tenant testleri, policy review ve negatif erişim testleri |
| Vercel/Render secret farkı | merkezi secret envanteri ve environment kontrolü |
| Connector kırılması | MCP schema sürümü, contract test ve fallback |
| Tool çağrısında yetki aşımı | Tool Registry + Policy Engine + deny-by-default |

## 24. Teknoloji bazlı faz planı

### İlk 14 gün

Next.js, Supabase, LangGraph, Inngest, temel AI Router, Task API, Audit, mock provider ve hedeften rapora checkpoint akışı.

### Faz 2

MCP Tool Registry, Gmail/Microsoft, GitHub, Google, Shopify connector’ları; Offer/Policy/Billing servisleri ve admin paneli.

### Faz 3

Langfuse/Sentry/PostHog tam gözlemleme, gerçek müşteri asistanı, kredi/cüzdan, Stripe ve fiyatlandırma politikaları.

### Faz 4

Tauri desktop, Expo mobile, Plasmo/WXT extension, WhatsApp premium ve medya akışları.

### Faz 5

Enterprise SSO, private deployment, gelişmiş compliance, özel model/NVIDIA ve connector marketplace.

## 25. 14 günlük çekirdek için bağlayıcı revizyon

İlk 14 gün için kapsam sadeleştirilmiştir. Ana teslim; gerçek connector sayısını artırmak değil, çalışan ve güvenli çekirdek döngüyü kanıtlamaktır:

`hedef → task graph → queue/worker → checkpoint → mock GPT/Claude → maliyet → audit → tenant güvenliği → rapor`

14 günlük gün-gün uygulama, kabul kriterleri, kapsam dışı maddeler ve demo senaryosu şu spesifikasyona bağlıdır:

`docs/14-gunluk-cekirdek-uygulama-spesifikasyonu.md`

## 26. MouseAI toplam faz yapısı

Proje toplam **8 fazdan** oluşur. Her fazın kendi teslimatı ve çıkış kriteri vardır. Bir faz; önceki fazın güvenlik, test ve kabul kriterleri geçmeden production kapsamına alınmaz.

### Orkestrasyon kararı

MouseAI çekirdek motorunun dayanıklı iş akışı Inngest Step Functions’tır. Supabase Edge Functions yalnızca kısa/stateless yardımcı uçlar için kullanılabilir. Bu karar `docs/inngest-step-functions-and-edge-boundary.md` içinde bağlayıcıdır.

Temporal şu an kullanılmaz. Faz 5+ için yalnızca ölçülebilir enterprise ihtiyaç oluşursa değerlendirilir; karar kaydı `docs/decision-record-002-temporal-vs-inngest.md` dosyasındadır.

### Faz 0 — Yönetim, kapsam ve hazırlık

**Amaç:** Ürün sınırlarını ve bağlayıcı kuralları sabitlemek.

**Çıktılar:** proje anayasası, GPT–Claude görev ayrımı, araç envanteri, veri sınıfları, risk matrisi, repo stratejisi, 14 günlük plan.

**Çıkış kriteri:** görev sahipleri, yetki seviyeleri, teknoloji standardı ve kapsam dışı işler onaylı.

### Faz 1 — 14 günlük çekirdek MVP

**Amaç:** çalışan ilk MouseAI motorunu çıkarmak.

**Çıktılar:** Next.js, Supabase, Inngest, basit Task Graph, mock GPT/Claude Router, checkpoint, retry, idempotency, audit, maliyet, tenant/Auth ve demo.

**Çıkış kriteri:** hedef → görev → worker → checkpoint → devam → audit → maliyet → rapor akışı uçtan uca geçiyor.

### Faz 2 — Platform temeli ve gerçek AI bağlantıları

**Amaç:** mock katmandan gerçek sağlayıcı ve yönetilebilir platforma geçmek.

**Çıktılar:** gerçek GPT/Claude bağlantıları, LiteLLM/OpenRouter veya Vercel AI SDK yönlendirmesi, MCP Tool Registry, connector SDK, admin panel, Langfuse/Sentry/PostHog, maliyet ve kota panelleri.

**Çıkış kriteri:** en az iki gerçek AI sağlayıcı ve en az beş connector güvenli, ölçülebilir ve geri alınabilir biçimde çalışıyor.

### Faz 3 — Müşteri operasyonları, e-posta ve gelir altyapısı

**Amaç:** MouseAI’nin dijital müşteri çalışanını üretime almak.

**Çıktılar:** Gmail/Microsoft, Conversation, Message, Offer, Policy Engine, SLA, fiyat/indirim sınırı, Stripe, kredi/cüzdan, çift taraflı ledger, fatura ve iade.

**Çıkış kriteri:** e-posta → AI cevap → teklif → politika kontrolü → onay/gönderim → audit ve ücretlendirme akışı çalışıyor.

### Faz 4 — Uygulama yüzeyleri ve otomasyon

**Amaç:** MouseAI’yi web dışındaki çalışma alanlarına taşımak.

**Çıktılar:** Tauri desktop agent, Expo mobile, Plasmo/WXT browser extension, CRM eklentileri, Remote Desktop/Computer-use, acil durdurma ve ekran kanıtı.

**Çıkış kriteri:** kullanıcı web, masaüstü, mobil ve browser üzerinden aynı görev durumunu görebiliyor ve yetkili onay verebiliyor.

### Faz 5 — SEO, reklam, tasarım ve medya operasyonları

**Amaç:** pazarlama ve içerik üretimini uçtan uca otomatikleştirmek.

**Çıktılar:** Analytics, Search Console, vidIQ, Firecrawl, Exa, Metricool, Figma, Canva, Runway, Viewmax, Descript, InVideo; içerik, reklam, video ve rapor workflow’ları.

**Çıkış kriteri:** araştırma → içerik/tasarım → review → yayın kuyruğu → ölçüm → optimizasyon döngüsü kanıtlanıyor.

### Faz 6 — Çoklu tenant, ajans ve marketplace

**Amaç:** platformu farklı firmaların ve ajansların kullanabileceği ürüne çevirmek.

**Çıktılar:** gelişmiş tenant, ekip/rol, white-label, ajans workspace, connector marketplace, geliştirici SDK, webhook ve revenue share.

**Çıkış kriteri:** farklı firmaların verileri ve politikaları izole; üçüncü taraf connector güvenli şekilde eklenebiliyor.

### Faz 7 — Enterprise, güvenlik ve özel dağıtım

**Amaç:** büyük şirketlerin satın alabileceği güvenlik ve uyum seviyesine ulaşmak.

**Çıktılar:** SSO/SAML, SCIM, özel deployment, data residency, gelişmiş KVKK/GDPR, DPA, SIEM, penetration test, özel model/NVIDIA, SLA ve disaster recovery.

**Çıkış kriteri:** kurumsal güvenlik, uyum, erişim, yedekleme ve felaket kurtarma denetimlerinden geçiş.

### Faz 8 — Otonom işletim ve küresel ölçek

**Amaç:** MouseAI’yi yüzlerce ve binlerce eş zamanlı operasyonu güvenli biçimde yöneten platforma dönüştürmek.

**Çıktılar:** dinamik model seçimi, çok bölgeli çalışma, otomatik kapasite, gelişmiş maliyet optimizasyonu, görevler arası öğrenme, kalite puanı, otomatik rollback ve küresel kanal/ödeme desteği.

**Çıkış kriteri:** kapasite, maliyet, güvenlik ve kalite KPI’ları tanımlı hedef aralıklarında sürdürülebilir.

## 27. Faz geçiş kanunu

1. Fazlar atlanamaz; yalnızca düşük riskli alt teslimatlar paralel yürütülebilir.
2. Her fazın çıkış kriteri test ve kanıtla belgelenir.
3. Bir sonraki fazın özelliği önceki fazın güvenlik sınırlarını gevşetemez.
4. Yeni araç önce `planned`, testten sonra `connected` olur.
5. Ödeme, müşteri mesajı, production deploy ve veri silme işlemleri her fazda ayrıca yetkilendirilir.
