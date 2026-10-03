# MouseAI — G0 Risk Kaydı

| ID | Risk | Seviye | Sahip | Azaltma | Durum |
|---|---|---:|---|---|---|
| R-G0-001 | Gerçek Auth credential eksikliği | Kritik | Ürün sahibi + Supabase | Onaylı secret kaynağı ve A/B test hesabı | Açık |
| R-G0-002 | Tenant izolasyonunun canlıda kanıtlanmaması | Kritik | Codex + Supabase | Cross-tenant negatif RLS testi | Açık |
| R-G0-003 | Inngest workflow kanıtının olmaması | Kritik | Codex + Inngest | Trigger/worker/checkpoint/retry testi | Açık |
| R-G0-004 | Provider maliyet sınırının canlı doğrulanmaması | Yüksek | Codex + ürün sahibi | Cost ledger ve bütçe alarmı | Açık |
| R-G0-005 | Gerçek müşteri verisiyle erken test | Kritik | Ürün sahibi | Sentetik veya onaylı pilot verisi | Kontrol altında |
| R-G0-006 | Secret sızıntısı | Kritik | Tüm ekip | Secret scan, rotate/revoke prosedürü | Kontrol altında |
| R-G0-007 | Yanlış repository’ye değişiklik | Kritik | Codex | Her işlem öncesi remote/branch doğrulaması | Kontrol altında |
| R-G0-008 | Backup/restore ve rollback provasının eksikliği | Yüksek | Operasyon risk sahibi | Restore ve rollback provası | Sahip bekliyor |
| R-G0-009 | Pilot faydasının ölçülmemesi | Yüksek | Ürün sahibi | Baseline/KPI/pilot raporu | Açık |
| R-G0-010 | Main branch üzerinde koruma ve review zorunluluğu olmaması | Kritik | Repository admin | PR, bağımsız approval, strict CI/security checks, no force-push/delete | Azaltıldı: main protection API ile doğrulandı; yeniden kontrol et |
| R-G0-011 | PR review bağımsızlığının bulunmaması | Kritik | Yetkili maintainer aranıyor | En az bir independent approval; son push için yeni approval | Açık; PR #92/#95/#97 `REVIEW_REQUIRED` |
| R-G0-012 | Kanun kaynaklarının hash/sürüm uyuşmazlığı | Yüksek | Kaynak sahibi | Hash/size/version register; önceki kayıt korunur; yetkili karar | Açık; SRC-02/SRC-05 ve iç sürüm etiketleri uyuşmuyor |
| R-G0-013 | Canlı integration credentials/test erişimi olmaması | Kritik | Kullanıcı + ilgili provider sahibi | Approved secret store ve sentetik staging run | Açık; Auth, Inngest, provider ve gateway live runs `NOT_RUN` |
| R-G0-014 | Pilot, KPI ve finance girdileri/kararları bulunmaması | Kritik | Sponsor/finance/ürün sahipleri | İki onaylı pilot, gerçek baseline ve 13 haftalık finance inputs | Açık; `VERİ YOK` / `DECISION_PENDING` |
