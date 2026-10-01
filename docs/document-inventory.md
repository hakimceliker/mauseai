# MouseAI — Toplu Doküman Envanteri

**Tarama tarihi:** 26.09.2026  
**Çekirdek docs sayısı:** 24  
**Orkestrasyon ve dayanıklı iş akışı docs sayısı:** 7
**Toplam numaralı doküman:** 31
**Ana çıktı sayısı:** 7  
**Downloads kök dosya sayısı:** 25  

## A. Ana proje ve teknik teslimler

1. `MouseAI_Nihai_Mimari_ve_Isletim_Anayasasi.md` — yüksek seviye mimari ve işletim anayasası
2. `MouseAI_Nihai_Mimari_ve_Isletim_Anayasasi.docx` — anayasanın Word sürümü
3. `MouseAI_Nihai_Mimari_ve_Isletim_Anayasasi.pdf` — anayasanın PDF sürümü
4. `MouseAI_Nihai_Mimari_ve_Isletim_Anayasasi.extracted.txt` — metin çıkarımı
5. `MouseAI_Teknik_Sistem_Dokumani.md` — A’dan Z’ye teknik sistem
6. `MouseAI_Teknik_Sistem_Dokumani.docx` — teknik sistem Word sürümü
7. `MouseAI_Teknik_Sistem_Dokumani.pdf` — teknik sistem PDF sürümü
8. `mouseai-tam-projeksiyon.md` — ana ürün, faz, teknoloji ve iş projeksiyonu

## B. Plan ve uygulama

9. `14-gunluk-uygulama-plani.md` — ilk plan
10. `14-gunluk-cekirdek-uygulama-spesifikasyonu.md` — sabit MVP stack ve günlük kabul kriterleri
11. `14-gunluk-master-backlog.md` — 14 günün tam görev backlog’u
12. `task-registry.md` — görev sahipliği ve teslim kayıtları
13. `change-control.md` — gelen önerilerin değerlendirme ve onay süreci

## C. AI, araç ve kod görevleri

14. `ai-tool-role-matrix.md` — AI/uygulama görev dağılımı
15. `gpt-claude-separation.md` — GPT ve Claude ayrımı
16. `coding-tool-policy.md` — Cursor, Claude Code, Copilot ve diğer kod araçları
17. `available-tools-inventory.md` — çalışma ortamında görünen 1.478 aracın tam listesi
18. `claude-tools-inventory.md` — Claude bağlantısı için bekleyen gerçek envanter
19. `tool-catalog-and-routing.md` — araç yetenekleri ve yönlendirme sistemi

## D. Yetki, güvenlik ve uyum

20. `mouseai-ai-gorev-yetki-arac-kanunu.md` — bağlayıcı AI görev/yetki kanunu
21. `security-approval-record.md` — proje güvenlik onay kaydı
22. `security-acceptance-report.md` — Gün 12 güvenlik kabul raporu
23. `security/rls-performance-and-edge-functions.md` — RLS performans ve Edge standardı
24. `security/secret-management-and-inngest-scheduling.md` — secret/Vault ve zamanlama standardı

## E. Orkestrasyon ve dayanıklı iş akışı

25. `decision-record-001.md` — bağımsız çekirdek ve provider-neutral yönlendirme
26. `decision-record-002-temporal-vs-inngest.md` — Inngest/Temporal kararı
27. `inngest-retry-and-edge-functions.md` — retry ve Edge uygulama standardı
28. `inngest-step-functions-and-edge-boundary.md` — Step Functions/Edge sınırı
29. `inngest-step-idempotency.md` — deterministik step ve idempotency kararı
30. `idempotency-and-final-rls-decision.md` — idempotency ve final RLS kararı
31. `temporal-determinism-rules.md` — yalnızca gelecekteki Temporal referansı

## F. Teknik repo dosyaları

- `storage-and-repository-registry.md` — Git çalışma alanı, Supabase Storage bucket/path, tenant izolasyonu ve dosya kabul standardı

- `supabase/migrations/0001_core.sql` — tablolar, index, RLS, helper ve idempotency
- `src/types/` — domain tipleri
- `src/lib/schemas/` — Zod şemaları
- `src/server/services/` — task, checkpoint, idempotency servisleri
- `src/inngest/` — Inngest client ve worker
- `app/api/tasks/` — task create/get/cancel/continue API’leri
- `tests/security/rls-negative.test.ts` — negatif güvenlik test iskeleti
- `supabase/functions/` — health ve task-status Edge Function iskeleti

## G. Tekrarlı dosyalar

Downloads kökünde `MouseAI_Nihai_Mimari_ve_Isletim_Anayasasi` dosyasının `(1)`, `(2)`, `(3)` kopyaları vardır. Bunlar tarihsel kopyalardır; çalışma için ana güncel dosya kopyasız isimli sürümdür. Eski kopyalar silinmedi.

## H. Çalışma kuralı

Yeni gönderilen her belge önce bu envanterdeki ilgili başlıkla karşılaştırılır. Aynı konunun tekrarıysa yeni dosya açılmaz; mevcut belge güncellenir. Çelişen içerik otomatik uygulanmaz, `change-control.md` sürecinden geçirilir.

## I. Uygulama ve araç yönetimi

- `execution-and-tool-responsibility-plan.md` — GitHub, GPT/Kodex, Claude, masaüstü araçları, bulut servisleri, onay kapıları ve teslim şablonu
- `mouseai-final-flow-and-bi.md` — ana iş akışı, görev paylaşımı ve iş zekâsı geri besleme diyagramları
