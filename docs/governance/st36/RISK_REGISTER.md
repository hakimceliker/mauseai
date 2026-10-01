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

