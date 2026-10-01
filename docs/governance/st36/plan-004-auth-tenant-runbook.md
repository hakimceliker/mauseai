# PLAN-004 — Production Auth ve Tenant Kabul Runbook'u

**Sahip:** Codex + Supabase  
**Bağımlılık:** PLAN-003  
**Durum:** Test erişimi bekliyor; kod ve runner hazır.  
**Kabul:** Tüm negatif ve pozitif kontroller PASS olmadan G7/G8 kapanmaz.

## 1. Ön koşullar

- Production deployment health/readiness başarılı.
- Production `AUTH_PROVIDER` mock değil, Supabase olarak yapılandırılmış.
- İki ayrı, yalnızca test amacıyla kullanılan kullanıcı hesabı mevcut.
- Kullanıcı A ve B farklı tenant'lara bağlı.
- Token değerleri yalnızca runtime secret kaynağından okunur.
- Token, e-posta, PII veya ham response kanıta yazılmaz.

Eksik erişim durumunda sonuç `credential_not_configured` olur; sahte token veya sahte PASS kullanılmaz.

## 2. Çalıştırma

PowerShell'de secret değerleri ekrana yazdırmadan, yetkili runtime ortamında:

```powershell
$env:SMOKE_BASE_URL="https://mauseai.vercel.app"
$env:SMOKE_USER_A_TOKEN="<secret-source>"
$env:SMOKE_USER_B_TOKEN="<secret-source>"
$env:SMOKE_WORKFLOW_ID="<approved-workflow-id>"
$env:SMOKE_EVIDENCE_FILE="tmp/plan-004-acceptance.json"
npm run acceptance:production
```

`<secret-source>` gerçek değerin sohbete, dosyaya veya loga yazılması anlamına gelmez; değer onaylı secret kaynağından runtime'a aktarılır.

## 3. Kontrol sırası

| Kod | Kontrol | PASS ölçütü |
|---|---|---|
| AUTH-01 | Anonymous erişim | `/api/tasks` `401` döner |
| AUTH-02 | Geçersiz token | `401` döner |
| AUTH-03 | Kullanıcı A okuma | Sadece A tenant verisi döner |
| AUTH-04 | Kullanıcı B okuma | Sadece B tenant verisi döner |
| TENANT-01 | Tenant ayrımı | A ve B tenant kimlikleri farklıdır |
| TENANT-02 | Çapraz task okuma | B, A task’ına `403` veya `404` alır |
| AUTH-05 | Logout | Logout sonrası korumalı çağrı `401` döner |
| AUTH-06 | Süresi dolmuş token | `401` ve veri yok |
| DATA-01 | Response redaction | Token/secret/PII loglanmaz |

## 4. Kanıt

Kanıt dosyası yalnızca şu bilgileri içerir:

- Kontrol kodu
- PASS/FAIL/NOT_RUN durumu
- HTTP durum kodu
- Tarih ve ortam
- Redacted run referansı

Şu bilgiler kesinlikle yazılmaz:

- Bearer token
- Secret değerleri
- Kullanıcı parolası
- Tam e-posta veya PII
- Ham production response

## 5. Kabul kararı

- Bütün `AUTH-*` ve `TENANT-*` kontrolleri PASS: PLAN-004 `PASS`.
- Herhangi bir kontrol çalıştırılamadı: `NOT_RUN`.
- Credential yok: `credential_not_configured`.
- Yetkisiz erişim başarılı olduysa: kritik güvenlik hatası, `FAIL`.

PLAN-004 PASS olmadan PLAN-005 canlı workflow, PLAN-006 gerçek provider ve PLAN-007 ledger kabulü production kabulü olarak raporlanamaz.

## 6. Rollback ve olay yönetimi

Beklenmeyen veri sızıntısı, yanlış tenant veya auth bypass görülürse:

1. Production test durdurulur.
2. İlgili test kullanıcıları ve tokenlar devre dışı bırakılır.
3. Olay `security` kanıtına redacted olarak yazılır.
4. Etkilenen branch/PR merge edilmez.
5. Düzeltme branch'i açılır; main'e doğrudan push yapılmaz.
6. Negatif testler yeniden çalıştırılmadan kabul verilmez.
