# MouseAI Uygulama ve Araç Görev Dağılımı

## Amaç

Bu belge, MouseAI Core’un GitHub, GPT/Kodex, Claude, diğer yapay zekâ sağlayıcıları, masaüstü araçları, bulut servisleri ve connector’lar ile nasıl geliştirileceğini ve işletileceğini belirler. Her araç yalnızca tanımlı görevini yapar. Hiçbir model kendi başına mimariyi, güvenlik politikasını, bütçeyi veya canlıya çıkışı değiştiremez.

## Tek gerçek kaynak

- Kodun gerçek kaynağı: GitHub deposu.
- Görev ve kararların gerçek kaynağı: GitHub Issues, Pull Request ve `docs/` klasörü.
- Çalışan ürün kaynağı: `main` dalındaki onaylanmış kod.
- Kullanıcı dosya teslim klasörü: `C:\Users\Administrator\Downloads\MAUSEAİ`.
- Sırlar ve anahtarlar: yalnızca yerel ortam değişkeni, Supabase Vault veya deployment secret store. GitHub’a veya sohbet mesajına yazılmaz.
- Değişiklikler bu belge, `change-control.md` ve güvenlik kurallarına aykırı olamaz.

## Ana görev sahipleri

| Sahip | Birincil görev | Yapabilecekleri | Yapamayacakları |
|---|---|---|---|
| MouseAI Orchestrator | İşleri dağıtmak ve durumlarını yönetmek | Task, workflow, step, checkpoint, retry, maliyet ve audit yönetmek | Yetkisiz aracı, bütçeyi veya insan onayını aşmak |
| GPT/Kodex | Birincil uygulama üreticisi | Kod, migration taslağı, API, test, dokümantasyon, küçük düzeltme | Onaysız canlı deploy, gizli anahtar okuma, politika değiştirme |
| Claude | Bağımsız denetçi ve zor refactor uzmanı | Kod inceleme, güvenlik inceleme, mimari risk, büyük refactor önerisi | İncelemediği kodu onaylanmış saymak veya doğrudan üretime almak |
| GitHub | Kaynak, review ve CI merkezi | Branch, commit, PR, review, Actions, release kaydı | İş mantığını kendi başına belirlemek |
| Cursor | Geliştirici editörü | Çok dosyalı düzenleme, hızlı uygulama, lokal test | PR onayı ve canlı yetkisi |
| Claude Code | Terminal ve büyük repo yardımcısı | Refactor, test, dependency analizi, hata ayıklama | Güvenlik/ürün kararını tek başına kesinleştirmek |
| Copilot | Satır içi yardımcı | Küçük kod tamamlama, test önerisi | Mimari karar, migration veya secret işlemi |
| Diğer modeller | Uzman tamamlayıcı | Araştırma, özet, görsel/video, sınıflandırma, alternatif çözüm | Görevi devralmak veya kanıtsız çıktı yayınlamak |
| İnsan sahibi | Kritik onay makamı | Ürün, ödeme, canlı, yüksek risk ve veri silme onayı | Gizli anahtarı sohbet metnine yapıştırmak |

## GitHub görevleri

GitHub, uygulamanın çalışma masasıdır. Her iş aşağıdaki sırayla yürür:

1. Issue açılır: amaç, kapsam, risk seviyesi, kabul kriteri ve beklenen dosyalar yazılır.
2. GPT/Kodex işi ayrı branch üzerinde uygular.
3. Değişiklikler küçük ve açıklanabilir commit’lere ayrılır.
4. Typecheck, test, build ve güvenlik kontrolleri çalıştırılır.
5. Pull Request açılır; özet, değişen dosyalar, test kanıtı ve kalan risk yazılır.
6. Claude bağımsız review yapar.
7. Kritik risk yoksa insan sahibi merge onayı verir.
8. `main` dalı yalnızca onaylı PR ile güncellenir.
9. Tag ve release yalnızca kabul kriterleri tamamlandıktan sonra oluşturulur.

Branch standardı:

- `feature/<issue-no>-kisa-ad`
- `fix/<issue-no>-kisa-ad`
- `security/<issue-no>-kisa-ad`
- `docs/<issue-no>-kisa-ad`

Commit örneği: `feat(tasks): add idempotent task continuation`.

## Kod üretim ve review akışı

### GPT/Kodex

GPT/Kodex her issue için önce mevcut kodu ve `docs/` kararlarını okur. Sonra en küçük uyumlu değişikliği yapar. Her teslimde değişen dosyaları, uygulanan kararı, çalıştırılan kontrolleri, bilinen eksikleri ve PR açıklamasını verir.

### Claude

Claude kodu yeniden üretmek yerine önce diff’i inceler. Kontrol sırası: mimari sözleşme, tenant ve yetki izolasyonu, secret ve hassas log kontrolü, retry/idempotency, test eksikleri ve bakım maliyetidir. Sonucu `approve`, `changes_requested` veya `blocked` olur. `approve` doğrudan merge anlamına gelmez.

## Masaüstü araçlarının kullanım standardı

| Araç türü | Kullanım | Çıktı | Sınır |
|---|---|---|---|
| Cursor | Günlük çok dosyalı kodlama | Commit’e hazır değişiklik | Ana dalda doğrudan değişiklik yok |
| Claude Code | Büyük repo, terminal, refactor ve debug | PR veya patch | Secret, canlı DB ve deploy yok |
| GitHub Copilot | Satır içi tamamlama ve küçük test | Kod önerisi | Mimari karar yok |
| VS Code veya benzeri editör | Dosya inceleme, diff ve lokal çalışma | Lokal değişiklik | Onaysız merge yok |
| Terminal | Paket, test ve migration hazırlığı | Log ve kanıt | Yıkıcı komutlar yasak; canlı işlemler onaylı |
| Docker Desktop | Yerel izole servisler, test ortamı ve tekrar üretilebilir çalışma | Container ve compose kanıtı | Production secret yok; onaysız container veya port açılmaz |
| Tarayıcı | GitHub, Supabase, Vercel, Inngest panelleri | Ekran/ayar kanıtı | Anahtarlar görüntülenip paylaşılmaz |
| Tauri masaüstü istemcisi | Kullanıcı arayüzü | Ürün istemcisi | MVP çekirdeğine eklenmez |

Masaüstü araçları MouseAI’nin üretim ortamı değildir; geliştirme ve kontrollü yönetim yüzeyidir. Sisteme bağlanan her araç için connector kaydı, izin kapsamı, maliyet sınırı, timeout, retry ve audit alanları gerekir.

## Ürün ve bulut araçlarının görevleri

| Araç veya servis | MouseAI görevi | Faz |
|---|---|---|
| Next.js | Web paneli, API ve yönetim yüzeyi | 1 |
| Docker Desktop | Lokal geliştirme ve gerektiğinde Supabase/test servisleri | 1–2 |
| Supabase | PostgreSQL, Auth, RLS, Storage | 1 |
| Inngest | Uzun iş, retry, checkpoint ve bekleme | 1 |
| Vercel AI SDK ve AI Gateway | Model çağrı sözleşmesi ve akış | 1–2 |
| GPT | Planlama, yapılandırma, kod ve genel görevler | 1–2 |
| Claude | Denetim, güvenlik, büyük refactor ve karmaşık analiz | 1–2 |
| Gemini/Grok ve diğer modeller | Fallback veya uzman görevler | 2+ |
| NVIDIA servisleri | Görsel/video veya GPU gerektiren uzman işler | 2+ |
| Exa veya web araştırma aracı | Kaynaklı araştırma ve doğrulama | 2+ |
| GitHub | Kod, issue, PR, Actions ve release | 1 |
| Vercel | Web/API deployment | 1–2 |
| Render veya benzeri worker platformu | Uzun çalışan özel worker’lar | 2+ |
| Langfuse/Sentry/PostHog | Trace, hata, maliyet ve davranış analizi | 2+ |
| Gmail/Microsoft Graph | E-posta conversation girişi ve gönderimi | 3 |
| Stripe | Abonelik, kredi, ödeme ve cüzdan ledger bağlantısı | 5 |
| Google Analytics/Search Console | SEO trafik ve performans verisi | 6 |
| vidIQ ve benzeri SEO araçları | Video anahtar kelime ve içerik analizi | 6 |
| Figma/Canva | Tasarım, marka ve görsel üretim akışı | 6 |
| WhatsApp | Ücretli, izinli müşteri kanalı; ilk MVP dışında | 3+ |

Bağlı olmayan bir araç kullanılabilir kabul edilmez. Araç kataloğunda `connected` durumu, yetki kapsamı ve son test zamanı bulunmadan üretim görevi atanmaz.

## Görev teslim şablonu

```text
Görev ID:
Sahip:
Denetçi:
Girdi sürümü:
Değişen dosyalar veya üretilen çıktı:
Çalıştırılan kontroller:
Maliyet:
Risk seviyesi:
Kalan eksik:
Sonraki sahip:
```

Eksik çıktı, kanıtsız başarı veya belirsiz sahiplik kabul edilmez.

## Onay kapıları

- L1: Otomatik; test ve audit yeterli.
- L2: GPT/Kodex uygular, Claude inceler.
- L3: Claude ve güvenlik kontrolü zorunlu.
- L4: İnsan onayı olmadan çalışmaz.
- Canlı deploy, gerçek ödeme, gerçek e-posta gönderimi, veri silme, service role ve müşteri adına pazarlık her zaman insan onayı veya önceden yazılmış politika gerektirir.

## İlk uygulanacak sıra

1. GitHub deposunda bu belgeyi ve mevcut karar belgelerini ana referans yap.
2. Supabase migration, Auth, tenant ve profile seed’ini hazırla.
3. Health → task create → Inngest worker → checkpoint → audit/cost akışını bağla.
4. GPT/Kodex ile implementasyon PR’ını aç.
5. Claude ile bağımsız review ve güvenlik kontrolü yaptır.
6. Test ve build kanıtlarını PR’a ekle.
7. İnsan onayı sonrası merge ve `v0.1.0` tag’i oluştur.

Bu dağılım mevcut MouseAI iş akışını değiştirmez; yalnızca kim neyi, hangi sınırla ve hangi kanıtla yapacak sorusunu kesinleştirir.
