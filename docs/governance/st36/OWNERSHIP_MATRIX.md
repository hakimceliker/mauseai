# MouseAI — G0 Sahiplik Matrisi

| Alan | Sahip | Yetki ve teslim | Onay durumu |
|---|---|---|---|
| Ürün ve kapsam | Hakim Çeliker | Kapsam, öncelik, kabul | `PENDING_USER_CONFIRMATION` |
| Yönetim sponsorluğu | Atanacak | Bütçe, kapasite, stratejik karar | `PENDING_USER_CONFIRMATION` |
| Kod, migration, API, test, CI | GPT/Codex | Branch, PR, CI, rollback notu | Öneri |
| Mimari ve güvenlik review | Claude/insan reviewer | Bulgular ve review kararı | Öneri |
| Auth, database, RLS, storage | Supabase + Codex | Tenant/Auth/RLS kanıtı | Öneri |
| Deployment ve environment | Vercel + Codex | Preview/production kanıtı | Öneri |
| Durable workflow | Inngest + Codex | Trigger, worker, retry, checkpoint | Öneri |
| AI sağlayıcıları | OpenAI/Anthropic + Codex | Adapter ve runtime testi | Öneri |
| Ödeme | Kullanıcı + Stripe sandbox | Sandbox ve ticari karar | Öneri |
| Operasyon ve risk | Atanacak | Olay, rollback, destek, G12 | `PENDING_USER_CONFIRMATION` |

## Yetki sınırı

Codex; teknik dosyaları, testleri ve kanıt kayıtlarını hazırlayabilir. İnsan sahibi
adına sponsor atayamaz, maliyet kararı veremez, hukuki kabul imzalayamaz ve G0’ı
tek başına geçemez.

