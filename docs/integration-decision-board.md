# MouseAI — Bağlantı Karar Ekranı

**Amaç:** Bağlanamayan veya henüz doğrulanmamış sistemleri görünür hale getirmek. Her satır için kullanıcı kararı `ONAY`, `RED` veya `YÖNLENDİR` olabilir.

**Güvenlik:** Secret değeri bu ekrana, sohbete, GitHub'a veya loglara yazılmaz. Secret gereken satırlarda yalnızca onaylı secret kaynağı kullanılır.

## Karar bekleyen bağlantılar

| Kod | Sistem | Durum | Neden bekliyor | Önerilen işlem | Karar |
|---|---|---|---|---|---|
| C01 | PR #6 → PR #7 akışı | `BLOCKED` | PR #7 hâlâ `main` tabanlı ve PR #6 kodunu kapsıyor | PR #7 base’ini PR #6 branch’ine al, kapsamı yeniden doğrula | `ONAY/RED/YÖNLENDİR` |
| C02 | PR #8 | `OPEN` | PR #7 branch’ine bağlı | PR #7 kapsamı temizlendikten sonra birlikte denetle | `ONAY/RED/YÖNLENDİR` |
| C03 | Supabase production | `NOT_CONFIGURED` | Production URL/key runtime ortamında doğrulanmadı | Vercel/secret manager üzerinden server-only bağla; RLS smoke test çalıştır | `ONAY/RED/YÖNLENDİR` |
| C04 | Inngest production | `NOT_CONFIGURED` | Event signing/production ortamı doğrulanmadı | Server-side env ile bağla; retry/checkpoint/resume testi yap | `ONAY/RED/YÖNLENDİR` |
| C05 | OpenAI GPT provider | `CREDENTIAL_NOT_CONFIGURED` | Gerçek API credential’ı yok veya bu ortamda doğrulanmadı | Approved secret store’a koy; mock fallback korunur | `ONAY/RED/YÖNLENDİR` |
| C06 | Anthropic Claude provider | `CREDENTIAL_NOT_CONFIGURED` | Gerçek API credential’ı yok veya bu ortamda doğrulanmadı | Approved secret store’a koy; mock fallback korunur | `ONAY/RED/YÖNLENDİR` |
| C07 | Slack MouseAI kanalı | `PARTIAL` | Workspace görüldü, özel MouseAI kanalı doğrulanmadı | Kullanılacak kanal adını/ID’sini yönlendir; yanlış kanala mesaj gönderilmez | `ONAY/RED/YÖNLENDİR` |
| C08 | Gmail / Microsoft Graph | `PLANNED` | OAuth uygulaması ve webhook kapsamı yok | Faz 3 connector görevi aç; salt-okuma ile başla | `ONAY/RED/YÖNLENDİR` |
| C09 | Stripe / cüzdan | `PLANNED` | Ödeme hesabı ve ledger production kanıtı yok | Faz 5; önce mock ledger, sonra sandbox, en son production | `ONAY/RED/YÖNLENDİR` |
| C10 | Google Analytics / Search Console | `PLANNED` | Property/site bağlantısı doğrulanmadı | Faz 5 SEO connector; salt-okuma ve tenant izolasyonu | `ONAY/RED/YÖNLENDİR` |
| C11 | Figma / Canva / vidIQ | `PLANNED` | Connector çağrısı ve hesap kapsamı doğrulanmadı | Tasarım/SEO görevleri için ayrı connector kartları aç | `ONAY/RED/YÖNLENDİR` |
| C12 | WhatsApp | `PLANNED` | Ücretli API, izin ve müşteri iletişim politikası yok | Faz 3+; e-posta asistanından sonra, policy ile | `ONAY/RED/YÖNLENDİR` |
| C13 | Sentry / Langfuse / PostHog | `PLANNED` | Project ve DSN/endpoint kanıtı yok | Faz 2 gözlemleme paketi; hassas veri maskeleme zorunlu | `ONAY/RED/YÖNLENDİR` |
| C14 | Tauri / Expo / Browser Extension | `PLANNED` | Ürün yüzeyleri henüz derlenip dağıtılmadı | Faz 4; ortak Task API üzerinden bağla | `ONAY/RED/YÖNLENDİR` |

## Kurulu ama otomatik bağlı sayılmayan masaüstü araçları

| Araç | Durum | Gerçek anlamı |
|---|---|---|
| Cursor | `AVAILABLE` | Kod yazma aracı; MouseAI connector’ı değildir |
| GitHub Desktop | `AVAILABLE` | Git işlemleri için kullanıcı aracı; otomatik görev kanalı değildir |
| Docker Desktop | `AVAILABLE` | Lokal test ortamı; production bağlantısı değildir |
| Chrome / Edge | `AVAILABLE` | Tarayıcı otomasyonu gerektiğinde kontrollü yüzey |
| Claude Desktop | `AVAILABLE/CONNECTED BY SESSION` | Claude oturumu görev alabilir; kalıcı MouseAI connector’ı ayrıca gerekir |

## Karar formatı

Kullanıcı aşağıdaki kısa formatla cevap verebilir:

```text
C01 ONAY
C02 ONAY
C03 YÖNLENDİR: Vercel server env
C04 ONAY
C05 YÖNLENDİR: secret manager
C07 YÖNLENDİR: <Slack kanal adı veya ID>
C08 ONAY
C09 RED
```

Bir satır `ONAY` olmadan dış sisteme mesaj, ödeme, deploy, secret yazma veya veri değişikliği yapılmaz. `RED` olan bağlantı plan dışına alınır. `YÖNLENDİR` olan bağlantı kullanıcının belirttiği kaynak ve kapsamla ilerletilir.

