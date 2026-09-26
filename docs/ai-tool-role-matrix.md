# MouseAI — Yapay Zekâ ve Araç Görev Matrisi

## 1. Değişmez yönetim kuralı

Tüm sağlayıcılar MouseAI Orchestrator üzerinden çalışır. Hiçbir model doğrudan başka bir modelin çıktısını onaysız şekilde üretime gönderemez. Her işte görev kimliği, girdi sürümü, çıktı, maliyet, güven seviyesi, test kanıtı ve sonraki görev yazılır.

## 2. Ana görev dağılımı

| Sistem / araç | Ana görev | Yapabileceği işler | Yapamayacağı işler |
|---|---|---|---|
| **MouseAI Orchestrator** | Genel yönetici ve iş akışı yöneticisi | Hedefi parçalara ayırır, sağlayıcı seçer, sıralar, durdurur, devam ettirir, retry/checkpoint yapar, maliyet limiti uygular | Gizli anahtarı metin içinde paylaşamaz; politika dışı işlemi onaylayamaz |
| **GPT / OpenAI** | Planlama, muhakeme, API sözleşmesi ve ana uygulama zekâsı | Task planı, JSON çıktı, kod üretimi, tool seçimi, müşteri yanıtı taslağı, sınıflandırma, özet ve kontrol | Tek başına ödeme, para transferi veya geri döndürülemez üretim işlemi yapamaz |
| **Claude** | Uzun doküman, kod inceleme ve risk denetimi | Büyük doküman analizi, mimari eleştiri, diff review, test senaryosu, politika ve sözleşme kontrolü | Orchestrator onayı olmadan üretim deploy edemez veya müşteri adına teklif gönderemez |
| **Grok / xAI** | Güncel web/sosyal eğilim ve hızlı pazar sinyali | Güncel konu taraması, trend/rekabet sinyali, sosyal içerik varyasyonları | Kaynaksız iddiayı gerçek kabul edemez; hukuki/finansal son kararı veremez |
| **NVIDIA NIM / GPU modelleri** | Yerel/özel model çıkarımı ve medya/vision yükü | Embedding, sınıflandırma, görüntü/video analizi, düşük gecikmeli özel model çağrısı | Yetkilendirme, fiyat onayı ve müşteri politikası belirleyemez |
| **Cloudflare Workers/Queues/Agents** | Edge, kuyruk ve dayanıklı çalışma | Webhook, rate limit, queue, scheduled job, Durable Object, edge API | Ticari kararın sahibi değildir; yalnızca imzalı görevi yürütür |
| **Supabase/PostgreSQL** | Kalıcı veri ve erişim sınırı | Tenant, kullanıcı, task, conversation, offer, audit ve billing kayıtları | Model çıktısını yorumlayamaz; silme işlemi politikaya bağlıdır |
| **Render / Cloud dağıtımı** | Servis çalıştırma ve ölçekleme | API, worker, cron, private service, environment secret, health check | Anahtar veya ödeme politikası üretemez |
| **Google Analytics / Search Console** | Trafik ve SEO ölçümü | Trafik, arama sorgusu, indeksleme, dönüşüm sinyali | İçerik yayınını tek başına başlatamaz |
| **E-posta adaptörü** | Müşteri iletişim kanalı | Mail alır, normalize eder, Conversation açar, taslak yanıtı gönderim kuyruğuna koyar | Politika dışı fiyat/indirim veya hukuki taahhüt veremez |
| **WhatsApp adaptörü** | İkinci faz ücretli kanal | Onaylı şablon, durum güncellemesi, müşteri mesajı | MVP kapsamındaki temel kanal değildir; ayrı izin ve maliyet kontrolü gerekir |
| **Stripe/ödeme sağlayıcıları** | Para tahsilatı ve iade altyapısı | Ödeme niyeti, webhook, fatura, iade | Model doğrudan kart verisi göremez |
| **Kripto sağlayıcısı** | İkinci faz dijital ödeme | Ağ doğrulama, ödeme durumu, kur/limit kontrolü | Saklama hizmeti ve transfer yetkisi mevzuat incelemesi olmadan açılamaz |
| **Figma/Canva** | Tasarım ve marka çıktısı | UI, sunum, reklam görseli, marka varyantı | Üretim kodunu veya fiyat politikasını değiştiremez |
| **Git/CI/CD** | Değişiklik ve kalite kapısı | Branch, commit, test, scan, build, deploy adayını üretir | Başarısız testte deploy edemez |

## 3. GPT ve Claude iş ayrımı

### GPT’e verilecek işler

1. Kullanıcı hedefini `Goal → Plan → Task → Step` yapısına dönüştürmek.
2. Tool/connector seçmek ve yapılandırılmış JSON üretmek.
3. API, event ve veri sözleşmelerini ilk taslak olarak hazırlamak.
4. E-posta gelen kutusunu sınıflandırmak: satış, destek, iade, ödeme, şikâyet, spam.
5. Firma politikası içinde müşteri yanıtı ve teklif taslağı üretmek.
6. Kod ve test taslağı üretmek.
7. Sonuçları kullanıcıya raporlamak.

### Claude’a verilecek işler

1. Uzun teknik dokümanları karşılaştırmak ve eksik/çelişki çıkarmak.
2. GPT çıktısını mimari, güvenlik ve tutarlılık açısından incelemek.
3. Kod diff’i, test planı ve hata senaryoları denetimi yapmak.
4. Hukuki/finansal metinlerde riskli ifadeleri işaretlemek; karar vermemek.
5. Runbook, kabul kriteri ve operasyon prosedürlerini iyileştirmek.
6. Büyük müşteri konuşma geçmişinde tema ve risk özeti çıkarmak.

## 4. Müşteri e-postası görev akışı

1. E-posta adaptörü mesajı alır ve kimlik doğrulama/spam kontrolü yapar.
2. GPT mesajı sınıflandırır ve gerekli bilgileri çıkarır.
3. Orchestrator uygun iş akışını açar.
4. GPT politika sınırları içinde cevap/teklif taslağı üretir.
5. Claude risk, ton, tutarlılık ve politika ihlali kontrolü yapar.
6. Fiyat/indirim limiti aşılırsa görev `HUMAN_APPROVAL_REQUIRED` durumuna geçer.
7. Onaylı cevap e-posta kuyruğuna alınır, gönderim kaydı audit log’a yazılır.

## 5. Kontrollü pazarlık politikası

Model hiçbir zaman serbest pazarlık yapmaz. Firma yöneticisi şu sınırları tanımlar:

- liste fiyatı
- izin verilen indirim yüzdesi
- minimum kâr marjı
- teklif geçerlilik süresi
- ödeme ve teslim şartları
- otomatik cevaplanamayacak konular
- insan onayı gerektiren tutar ve risk seviyesi

## 6. Her görev için zorunlu çıktı formatı

```json
{
  "task_id": "TASK-...",
  "agent": "gpt|claude|grok|nvidia|tool",
  "status": "completed|blocked|needs_approval",
  "input_version": "...",
  "result": {},
  "evidence": [],
  "cost": {"currency": "USD", "amount": 0},
  "risks": [],
  "next_action": "..."
}
```

## 7. Yetki seviyeleri

| Seviye | Örnek | Onay |
|---|---|---|
| L0 | Özet, taslak, analiz | Otomatik |
| L1 | Test, iç kayıt, düşük riskli içerik | Otomatik + audit |
| L2 | E-posta gönderimi, reklam taslağı, sınırlı teklif | Politika doğrulaması |
| L3 | İndirim limiti, ödeme/iade, dış sistem yazma | Yetkili kullanıcı onayı |
| L4 | Para transferi, hukuki taahhüt, veri silme | İnsan + çift kontrol |

## 8. Handoff protokolü

Bir sağlayıcı işi bitirdiğinde yalnızca `result`, `evidence`, `risks`, `next_action` alanlarını teslim eder. Sonraki sağlayıcı bütün konuşmayı değil, sürümlenmiş görev paketini alır. Böylece kopyala-yapıştır ihtiyacı, bağlam kaybı ve görev karışıklığı önlenir.

## 9. A’dan Z’ye bölüm bazlı görev sahipliği

| Bölüm | Birincil AI/araç | İkinci kontrol | Nihai çıktı |
|---|---|---|---|
| Ürün vizyonu ve gereksinim | GPT + Orchestrator | Claude | PRD, kapsam, kabul kriteri |
| Pazar ve rakip araştırması | Grok + web araştırma | GPT | kaynaklı pazar raporu |
| İş modeli ve fiyatlandırma | GPT | Claude + Finans politikası | paket, limit, varsayım tablosu |
| Teknik mimari | GPT | Claude | C4, ADR, servis sınırları |
| Veri mimarisi | GPT | Claude + Security | ERD, retention, erişim matrisi |
| API sözleşmeleri | GPT | Claude + test | OpenAPI, event şemaları |
| Web uygulaması | GPT kod ajanı | Claude review | frontend, test, erişilebilirlik |
| Mobil uygulama | GPT kod ajanı | Claude review | iOS/Android veya cross-platform istemci |
| Masaüstü uygulaması | GPT kod ajanı | Security review | desktop shell, local agent, izinler |
| CRM eklentisi | GPT | Claude | CRM connector, sync, audit |
| Tarayıcı otomasyonu | Computer-use agent | Security | browser session, izin, kanıt görüntüsü |
| E-posta operasyonu | GPT | Claude | sınıflandırma, yanıt, teklif, takip |
| WhatsApp | Channel agent | Policy engine | premium kanal, şablon mesaj |
| Ses/telefon | Voice agent | Human approval | ikinci/üçüncü faz çağrı akışı |
| SEO | GPT + Search Console | Analytics | keyword, içerik, teknik SEO backlog |
| Reklam | Ads Manager agent | Policy + budget guard | kampanya taslağı, bütçe, rapor |
| Sosyal medya | GPT/Grok | Brand guard | içerik takvimi, varyant, yayın kuyruğu |
| Görsel tasarım | Canva/Figma | Brand reviewer | UI, reklam, sosyal medya seti |
| Video | Media agent + NVIDIA | Brand reviewer | senaryo, storyboard, render görevi |
| Müşteri desteği | GPT | Claude risk check | ticket, cevap, SLA ve eskalasyon |
| Satış ve pazarlık | GPT | Policy engine + insan | fiyat teklifi, limit kontrollü müzakere |
| Faturalama | Billing service | Finance policy | fatura, kredi, kullanım dökümü |
| Cüzdan/kredi | Ledger service | Security + compliance | bakiye, kullanım, mutabakat |
| Kart ödemesi | Stripe adapter | Fraud/risk rules | payment intent, webhook, refund |
| Kripto | Crypto adapter | Compliance + human | ikinci faz ödeme durumu |
| Muhasebe | Finance agent | Human accountant | gelir-gider, KDV/VAT, mutabakat |
| Güvenlik | Security agent | Human security owner | threat model, findings, remediation |
| KVKK/GDPR | Compliance agent | Human legal review | kayıt, rıza, silme/erişim prosedürü |
| Gizlilik | Privacy reviewer | Security | veri envanteri, retention, DPA maddeleri |
| Kalite güvence | QA agent | Orchestrator | unit/integration/e2e ve kabul raporu |
| DevOps | Cloud/CI agent | Security | build, deploy, rollback, health check |
| Gözlemlenebilirlik | SRE agent | Orchestrator | log, metric, trace, alarm |
| Maliyet optimizasyonu | Cost agent | Finance | token, GPU, connector maliyet raporu |
| Dokümantasyon | Claude | GPT | teknik doküman, runbook, changelog |
| Yönetim | Orchestrator | İnsan yönetici | durum, risk, karar ve ilerleme raporu |

## 10. AI ajanlarının tam görev tanımları

### A. Orchestrator / Yönetici Ajan

**Girdi:** kullanıcı amacı, tenant politikası, bütçe, risk seviyesi.

**Görev:** hedefi parçalara ayırmak; görevleri sıraya koymak; uygun sağlayıcıyı seçmek; durumu kaydetmek; başarısız işi checkpoint’ten sürdürmek; aynı işi iki kez yapmayı önlemek; insan onayı gereken adımı durdurmak.

**Çıktı:** yürütme planı, görev grafiği, durum raporu, maliyet ve risk raporu.

**Yetki sınırı:** para hareketi, dışarıya bağlayıcı taahhüt, veri silme ve politika dışı mesaj gönderemez.

### B. Ürün ve Proje Ajanı

İhtiyacı PRD’ye çevirir, kapsamı fazlara böler, bağımlılıkları çıkarır, kabul kriterlerini yazar ve iş listesini günceller. Devralan: Orchestrator ve QA.

### C. Mimari Ajan

Servis sınırlarını, veri akışını, API’leri, olayları, hata ve ölçek senaryolarını tasarlar. Her değişiklik için ADR üretir. Devralan: Claude denetimi, Security ve kod ajanı.

### D. Kodlama Ajanı

Onaylı sözleşmeye göre kod, migration, test ve dokümantasyon üretir. Sözleşme dışına çıkarsa görevi durdurur. Devralan: test ve code review.

### E. Kod İnceleme Ajanı

Diff’i güvenlik, performans, okunabilirlik, geriye uyumluluk ve test kapsamı açısından inceler. Onay, düzeltme veya blokaj kararı üretir; doğrudan deploy etmez.

### F. Veri ve Raporlama Ajanı

Event’leri normalize eder, KPI hesaplar, veri kalitesini kontrol eder, dashboard ve yönetim raporu üretir. Kaynak ve hesap formülünü rapora ekler.

### G. SEO ve Büyüme Ajanı

Search Console/Analytics verisini analiz eder; teknik SEO, içerik kümeleri, keyword, dönüşüm ve deney backlog’u üretir. İçerik yayınını marka ve politika kontrolünden geçirir.

### H. Reklam Ajanı

Kampanya amacı, hedef kitle, kreatif varyant, bütçe ve ölçüm planı oluşturur. Harcama limiti aşılırsa durur; reklam hesabında yayın için politika onayı ister.

### I. Marka ve Tasarım Ajanı

Design system, logo/renk/tipografi, UI, reklam ve sosyal içerik üretir. Marka kılavuzuna aykırı çıktıyı reddeder. Devralan: frontend ve pazarlama ajanı.

### J. Müşteri Asistanı

E-postayı alır, dili belirler, niyeti sınıflandırır, CRM geçmişini okur, bilgi ister, çözüm ve teklif taslağı hazırlar, SLA takibi yapar. İnsan onayı gereken konuları eskale eder.

### K. Pazarlık Ajanı

Yalnızca fiyat politikası içinde çalışır. Minimum fiyat, indirim, marj, ödeme ve teslim şartlarını aşamaz. Her teklifin gerekçesi, geçerlilik süresi ve hesaplaması audit kaydına girer.

### L. Finans ve Ledger Ajanı

Kredi/cüzdan bakiyesi, kullanım düşümü, iade, fatura ve mutabakat kayıtlarını çift taraflı ledger ile işler. Modelin serbestçe bakiye değiştirmesine izin vermez.

### M. Güvenlik Ajanı

Tehdit modeli, secret taraması, yetki matrisi, tenant izolasyonu, prompt injection, SSRF, veri sızıntısı, webhook imzası ve bağımlılık taraması yapar.

### N. Uyum ve Gizlilik Ajanı

KVKK/GDPR veri haritası, rıza, erişim/silme talepleri, saklama süresi, alt işleyen ve kullanıcı bildirimi taslaklarını üretir. Hukuki görüş yerine risk işareti verir.

### O. QA ve Release Ajanı

Test planı, fixture, regresyon, yük, hata kurtarma ve kullanıcı kabul testlerini çalıştırır. Kanıt olmadan sürüm geçirmez; rollback planını kontrol eder.

### P. SRE ve Maliyet Ajanı

Sağlık, latency, hata oranı, kuyruk, token/GPU/connector maliyeti ve bütçe sapmasını izler. Sağlayıcıyı maliyet/kalite politikasına göre değiştirir.

## 11. Ortak görev kartı şablonu

Her AI’ye gönderilen görev aşağıdaki alanlarla oluşturulur:

```yaml
task_id: CORE-000
title: ""
owner: "gpt|claude|grok|nvidia|tool|human"
reviewer: ""
phase: ""
objective: ""
inputs: []
allowed_tools: []
forbidden_actions: []
budget_usd: 0
risk_level: "low|medium|high|critical"
acceptance_criteria: []
required_evidence: []
handoff_to: ""
rollback: ""
status: "todo"
```

## 12. Tamamlanma ölçütü

Bir AI “tamamlandı” diyebilmek için yalnızca metin üretmez. Çıktı dosyası, test kanıtı, kaynaklar, maliyet, riskler, değişen kayıtlar ve sonraki görev kimliğini teslim eder. Eksik alan varsa Orchestrator görevi tamamlanmış saymaz.
