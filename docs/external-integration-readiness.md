# MouseAI — Dış Entegrasyon Hazırlık Matrisi

Bu belge, üçüncü taraf bağlantılarının MouseAI üretim kabulüyle karıştırılmasını önlemek için salt-okunur durum kaydıdır. Bağlantı görülmesi, entegrasyonun MouseAI’ye bağlandığı veya üretime hazır olduğu anlamına gelmez.

| Sistem | Gözlenen durum | MouseAI kararı | Sonraki kanıt |
|---|---|---|---|
| Windsor.ai | Bağlı kaynak `Techcriptoai` olarak görünüyor | **Kullanılamaz**; proje ayrılığı nedeniyle MouseAI verisi kabul edilmez | MouseAI adına ayrı bağlantı ve veri kapsamı |
| Stripe | Canlı hesap mevcut | MVP’de canlı ödeme yok; yalnızca test/sandbox akışı | Testmode webhook replay ve ledger kanıtı |
| Slack | `senatech` çalışma alanı erişilebilir | Runtime bağımlılığı değil; bildirim entegrasyonu sonraki kapsam | MouseAI workspace/channel ve redacted mesaj testi |
| Shopify | Bağlı mağaza deneme planında | MVP çekirdeği değil; gerçek ürün/sipariş verisi kullanılmaz | Ayrı sandbox/mock mağaza ve connector sözleşmesi |
| Notion | Son erişilen sayfa bulunamadı | Kaynak doküman olarak kullanılmıyor | MouseAI doküman alanı açıkça belirlenirse salt-okunur okuma |
| vidIQ | Sınırlı kredi mevcut | Pazarlama/SEO yardımcı aracı; çekirdek runtime bağımlılığı değil | Ayrı pazarlama görevi ve rapor kabulü |
| OpenAI / Anthropic | Kod adapter’ları mevcut | Gerçek credential yoksa `credential_not_configured` | Kontrollü test çağrısı ve maliyet/audit kanıtı |
| Supabase / Inngest / Vercel | MouseAI production temel bağlantıları mevcut | Health/readiness tamam; canlı kabul kapıları açık | Auth/tenant + workflow/checkpoint/audit testi |

## Güvenlik ve proje ayrılığı

- Bir projeye ait hesap, secret, müşteri verisi veya bağlantı başka projede kullanılamaz.
- Secret değerleri sohbet, kod, commit veya rapora yazılmaz.
- Bağlantı yoksa veya kapsam belirsizse durum `credential_not_configured` / `NOT_RUN` kalır.
- Bu belge tek başına production kabulü vermez; kabul için `docs/production-acceptance-task-distribution.md` içindeki dört kapı tamamlanmalıdır.

## Yol haritasına etkisi

1. Çekirdek MouseAI üretim kabulü: Auth, tenant izolasyonu, Inngest workflow, checkpoint/audit.
2. Gözlemlenebilirlik ve provider canlı testleri: OpenAI/Anthropic, Sentry/Langfuse/PostHog.
3. Sandbox entegrasyonları: Stripe testmode, bildirim, connector sözleşmeleri.
4. Enterprise/connector fazı: Shopify, Gmail, GitHub, Slack ve Windsor gibi dış kaynaklar; her biri ayrı hesap/kapsam ve ayrı PR ile.
