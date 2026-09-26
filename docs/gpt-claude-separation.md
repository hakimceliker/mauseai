# MouseAI — GPT ve Claude Ayrım Sözleşmesi

## 1. Temel ayrım

MouseAI iki ayrı uzman çalışma alanı kullanır. GPT ve Claude aynı görevi aynı anda sahiplenmez. Orchestrator her görevi tek bir birincil sahibine verir; diğer sistem yalnızca tanımlı kontrol veya tamamlayıcı rolüyle devreye girer.

| Alan | GPT / Codex | Claude |
|---|---|---|
| Birincil rol | Üretim, planlama, API, kod ve sistem yürütme | Denetim, uzun belge, eleştiri, kalite ve risk analizi |
| Araç kaynağı | Bu çalışma ortamındaki gerçek bağlı araçlar | Claude hesabında gerçekten etkin araçlar |
| Görev durumu | `gpt_owned` | `claude_owned` |
| Kod değişikliği | Üretebilir ve test edebilir | İnceler, önerir; açıkça atanmadıkça üretim değişikliği yapmaz |
| Deploy | Preview/CI hazırlayabilir; policy onayı gerekir | Deploy planını ve riskini denetler |
| Dış iletişim | Taslak üretir; politika/onay gerekir | Ton, tutarlılık ve risk kontrolü yapar |
| Finans/ödeme | Hesaplama ve entegrasyon akışını yürütür | Risk ve metin denetimi yapar |
| Nihai karar | Orchestrator + yetkili insan | Karar sahibi değildir |

## 2. GPT/Kodex çalışma alanının görevleri

GPT tarafı mevcut ortamda görünen araçları kullanır. Bunlar `available-tools-inventory.md` dosyasındaki araçlardır.

### GPT’ye ait ana işler

- Kullanıcı hedefini görev grafiğine çevirmek
- API, veri modeli, event ve entegrasyon sözleşmeleri üretmek
- Backend, frontend, mobil ve masaüstü kodu geliştirmek
- GitHub, Linear, Supabase, Vercel, Render ve AWS iş akışlarını yürütmek
- Gmail/Microsoft/Google araçlarıyla e-posta ve doküman akışını çalıştırmak
- Shopify ve CRM operasyonlarını yürütmek
- Firecrawl, Exa, Google ve vidIQ ile veri/SEO araştırması yapmak
- Figma, Canva, Runway, Viewmax, Descript ve InVideo ile üretim görevleri açmak
- Test, build, preview deploy, log ve hata kurtarma işlemlerini yönetmek
- Kullanım, maliyet, token, kuyruk ve görev durumunu kaydetmek

### GPT’nin üretim yetki sınırı

GPT; ödeme, iade, para transferi, production deploy, veri silme ve bağlayıcı müşteri taahhüdünü tek başına gerçekleştiremez. Bunlar görev seviyesinde izin ve gerekiyorsa insan onayı ister.

## 3. Claude çalışma alanının görevleri

Claude tarafında yalnızca Claude hesabında gerçekten bağlı ve test edilmiş araçlar kullanılacaktır. Bağlantısı görünmeyen araçlar uydurulmaz.

### Claude’a ait ana işler

- Uzun teknik dokümanları karşılaştırmak
- GPT’nin mimari ve kod çıktısını eleştirmek
- Kod diff, güvenlik açığı, test kapsamı ve geriye uyumluluk incelemek
- Büyük müşteri konuşmalarını ve e-posta arşivlerini özetlemek
- PRD, ADR, runbook, sözleşme ve politika tutarlılığı denetlemek
- Müşteri cevabının tonunu, iddia riskini ve politika uyumunu kontrol etmek
- Finansal/hukuki metindeki riskli ifadeleri işaretlemek
- Dokümanlar arası çelişki ve eksik görevleri çıkarmak
- GPT’nin ürettiği plan için ikinci görüş ve kalite raporu vermek

### Claude’un üretim yetki sınırı

Claude, Orchestrator görevi açıkça vermedikçe repo değiştirmez, deploy yapmaz, müşteri mesajı göndermez, fiyat/indirim belirlemez ve ödeme işlemi başlatmaz.

## 4. Görev paylaşım tablosu

| Görev | Birincil sahip | İkinci kontrol | Teslim |
|---|---|---|---|
| Ürün planı | GPT | Claude | PRD + kabul kriteri |
| Teknik mimari | GPT | Claude | C4 + ADR |
| Kodlama | GPT | Claude | commit + test |
| Kod inceleme | Claude | GPT düzeltme | review raporu |
| API sözleşmesi | GPT | Claude | OpenAPI |
| Veri modeli | GPT | Claude/Security | migration + ERD |
| Web araştırması | GPT/Exa/Firecrawl | Claude kaynak kontrolü | kaynaklı rapor |
| SEO | GPT/Google/vidIQ | Claude içerik kontrolü | SEO backlog |
| Tasarım | GPT/Figma/Canva | Claude marka kontrolü | tasarım çıktısı |
| Video | GPT/Runway/Viewmax | Claude kalite kontrolü | medya çıktısı |
| E-posta sınıflandırma | GPT | Claude risk kontrolü | Conversation |
| Müşteri cevabı | GPT | Claude ton/politika | gönderim taslağı |
| Pazarlık | GPT + policy engine | Claude risk kontrolü | Offer |
| Güvenlik | GPT/Security tools | Claude tehdit incelemesi | finding listesi |
| Test | GPT/CI | Claude test kapsamı | test raporu |
| Deploy | GPT/Vercel/Render | Claude release review | deployment kaydı |
| Ödeme | GPT/Billing adapter | Claude risk metni | payment intent |
| Nihai onay | Orchestrator + insan | GPT/Claude raporları | karar kaydı |

## 5. Devir formatı

GPT’den Claude’a:

```yaml
handoff: gpt_to_claude
task_id: TASK-000
artifact_paths: []
decision_needed: ""
review_scope: []
known_risks: []
acceptance_criteria: []
```

Claude’dan GPT’ye:

```yaml
handoff: claude_to_gpt
task_id: TASK-000
review_status: approved|changes_requested|blocked
findings: []
required_changes: []
residual_risk: low|medium|high|critical
next_action: ""
```

## 6. Çakışma kuralı

GPT ve Claude farklı sonuç verirse Orchestrator otomatik seçim yapmaz. Çelişki kaydı oluşturur, kaynakları ve test kanıtını karşılaştırır; yüksek riskli konularda insan onayı ister.

## 7. Dosya sahipliği

- `docs/gpt-claude-separation.md`: görev ayrımının ana sözleşmesi
- `docs/available-tools-inventory.md`: GPT/Kodex ortamında görünen gerçek araçların tam listesi
- `docs/claude-tools-inventory.md`: Claude bağlantısı kurulduğunda doldurulacak gerçek Claude araç listesi
- `docs/task-registry.md`: her görevin sahibi ve denetçisi

Claude araçları bağlandığında liste `planned` durumundan `connected` durumuna test kanıtıyla geçirilecektir.
