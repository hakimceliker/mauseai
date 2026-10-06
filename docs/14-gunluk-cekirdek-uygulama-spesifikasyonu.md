# MouseAI — 14 Günlük Çekirdek Uygulama Spesifikasyonu

> **Plan statüsü:** Bu, eski bir teknik slice taslağıdır; günler göreli sıra
> etiketidir, tarih/teslim taahhüdü veya üst kanun değildir. Yalnız P0/P1
> kapsamında ve G0–G12 kanıt kapılarına bağlı uygulanabilir. Canlı Auth/RLS,
> provider, pilot, verifier/recovery veya G10–G12 kabulü bu dokümandaki demo ile
> verilmiş sayılmaz. Kanonik yol haritası:
> [`mouseai-master-phase-plan-v1.0.md`](mouseai-master-phase-plan-v1.0.md).

## Hedef

14 gün sonunda hedef alan, görev oluşturan, Inngest worker ile çalışan, checkpoint’ten devam eden, mock GPT/Claude yönlendiren, maliyet ve audit kaydı tutan, tenant izolasyonu uygulayan çalışan bir demo teslim edilir.

## Sabit MVP stack

| Katman | Seçim |
|---|---|
| Framework | Next.js 15 App Router + TypeScript strict |
| Database/Auth | Supabase PostgreSQL + Auth + RLS + Storage |
| Orchestration | Inngest |
| Task Graph | Basit custom graph + hafif LangGraph |
| AI Router | Vercel AI SDK + mock providers |
| Validation | Zod |
| Data access | Supabase client; migration SQL, ihtiyaçta Drizzle |
| Quality | ESLint + Prettier + Husky |
| Observability | Console + Supabase logs |
| Deploy | Vercel |
| Test | Unit + integration + end-to-end |

## Günlük teslim ve kabul kriteri

| Gün | Teslim | Kabul kriteri |
|---:|---|---|
| 1 | Repo, Next.js, TypeScript strict, ESLint/Prettier/Husky, GitHub/Vercel/Supabase ortamı | local build ve lint başarılı; secret repoda yok |
| 2 | `Task`, `Workflow`, `Step`, `Checkpoint`, `AuditEvent` sözleşmeleri | Zod validasyonu geçerli/geçersiz girdiyi ayırıyor |
| 3 | `/api/tasks` create/get/cancel | authenticated tenant yalnızca kendi görevini görüyor |
| 4 | `tenants`, `profiles`, `tasks`, `workflows`, `steps`, `checkpoints`, `audit_logs`, `conversations`, `messages`, `offers`; Auth, roller ve RLS | migration tekrar çalıştırılabilir; kimliksiz/yanlış tenant erişimi engellenir |
| 5 | Inngest event, worker ve checkpoint | görev her adım sonunda state yazıyor |
| 6 | retry, timeout, idempotency | aynı `task_id + step_id` iki kez yan etki üretmiyor |
| 7 | mock GPT/Claude provider ve `AIRouter` | provider seçimi ve mock çıktı sözleşmeye uyuyor |
| 8 | token/maliyet/tenant günlük kredi limiti | limit aşımında görev duruyor ve audit yazıyor |
| 9 | audit/event ledger | kim, ne zaman, hangi araçla, hangi maliyetle kaydediliyor |
| 10 | `conversations`, `messages`, Conversation state machine | e-posta mock mesajı doğru duruma geçiyor |
| 11 | `offers`, basit Policy Engine, mock teklif/review | indirim/fiyat tavanı aşılamıyor; onay durumu oluşuyor |
| 12 | Secret/log/prompt kontrolü ve negatif güvenlik testleri | yanlış tenant, eksik token, yanlış rol ve service-role client çağrısı engelleniyor |
| 13 | uçtan uca ve hata testleri | hedef → görev → checkpoint → devam → audit/maliyet akışı geçiyor |
| 14 | demo arayüzü, README, runbook, kabul raporu, `v0.1.0` | tüm kabul kriterleri kanıt dosyasıyla işaretli |

## İlk 14 gün kapsam dışı

- Gerçek GPT/Claude üretim anahtarları
- Gerçek Gmail/GitHub/Shopify connector’ları
- Tauri desktop
- Expo mobile
- WhatsApp
- Stripe canlı ödeme
- Kripto transferi
- Production’da serbest masaüstü otomasyonu
- Marketplace ve enterprise SSO

Bu özellikler ilgili P0–P9 paketlerinin ve G0–G12 kapılarının sırasına tabidir;
bu eski demo taslağına göre otomatik olarak sonraki faz sayılmaz.

## Demo senaryosu

1. Kullanıcı giriş yapar.
2. “SEO raporu hazırla” hedefini girer.
3. Sistem Task/Workflow/Step oluşturur.
4. Inngest worker ilk adımı çalıştırır ve checkpoint yazar.
5. Mock GPT plan çıktısı üretir.
6. Mock Claude denetim çıktısı üretir.
7. Worker durur ve yeniden başladığında checkpoint’ten devam eder.
8. Maliyet, audit, risk ve sonraki işlem kaydedilir.
9. Kullanıcı raporu web ekranında görür.

## Gün 14 teslim paketi

- çalışan web demo
- API sözleşmesi
- Supabase migration’ları
- seed/mock provider’lar
- test raporu
- audit ve maliyet kanıtları
- güvenlik/RLS testleri
- README ve runbook
- v0.1.0 sürüm etiketi
