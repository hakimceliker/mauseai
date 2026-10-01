# MouseAI Master Gap Roadmap

**Sürüm:** 1.1
**Kapsam:** Teknik sistem, ürün, iş modeli, finans, yönetim, güvenlik, entegrasyon, pilot ve işletme kabulü
**Kanonik repo:** `hakimceliker/mauseai`

## 1. Bu sürümün amacı

Bu belge, `MAUSEAI_Master_Kanun_ve_Sartname_v1.0.docx`, `MAUSEAI_Eksikler_ve_Kabul_Plani_v1.0.csv`, `MAUSEAI_Diyagram_Atlasi_v1.0.html` ve repo içindeki güncel kod/CI kayıtlarını tek bir yürütme planında birleştirir. Hedef mimari ile kanıtlanmış mevcut durum birbirinden ayrılır. Bir madde kodda bulunuyor diye üretimde kabul edilmiş sayılmaz.

## 2. Mevcut nokta

| Alan | Gerçek durum | Karar |
|---|---|---|
| Repo ve branch düzeni | `docs/full-project-roadmap` üzerinde PR #83 açık; main’e doğrudan yazılmadı | PR CI ve review beklenir |
| Kod kalite kapıları | Local lint, typecheck, 266 test, build, npm audit ve Docker başarılı | Kod tabanı çalışır durumda |
| Production health | Health/readiness daha önce başarılı doğrulandı | Sağlık kanıtı var |
| Auth ve tenant | Gerçek iki tenant negatif testi yok | Production kabulü kapalı |
| Inngest | Worker/checkpoint kodu var; canlı `task.execute` kanıtı yok | Production kabulü kapalı |
| AI sağlayıcıları | Adapter ve mock var; gerçek credential testi yok | `credential_not_configured` |
| Audit/cost | Kod ve test temeli var; canlı uzlaştırma yok | Canlı görev kanıtı beklenir |
| UI | Beyaz/şeffaf referans ve diyagram atlası var | Ana ekranların kullanıcı testi beklenir |
| İş modeli/finans | Şartname kapsamı var; bütçe, fiyat ve baz ölçüm atanmadı | Karar bekliyor |
| Dış entegrasyonlar | Her connector için kapsam ve ayrı hesap gerekir | MVP’ye otomatik dahil edilmez |

## 3. Kabul kapısı

MouseAI production kabulü ancak şu dört grup kanıtlandığında verilir:

```text
Auth PASS
+ Tenant isolation PASS
+ Inngest workflow PASS
+ Production logs / audit PASS
= ACCEPT
```

Eksik credential, test çalıştırılmadı veya kanıt yoksa sonuç `NOT_RUN`, `BLOCKED` veya `credential_not_configured` kalır.

## 3.1 ST3.6 kontrol envanteri

ST3.6 paketi repo’ya `docs/governance/st36/` altında alınmıştır. Envanter 377 kontrol, 13 kapı, 30 PLAN kaydı, 22 uyarlama işi ve 18 KPI kartı içerir. Paket doğrulamasına göre runtime henüz doğrulanmamış, tüm kapılar beklemede ve 377 kontrolün tamamı insan incelemesi istemektedir. Bu nedenle envanter tamlığı ile uygulama kabulü ayrı tutulur.

## 4. P0 — Canlı kabulü açan kritik yol

| Kod | İş | Sahip | Çıktı | Bağımlılık |
|---|---|---|---|---|
| PLAN-001 | Proje kartı, bütçe, sorumlu ve ilk teslim tarihini atama | Kullanıcı/ürün sahibi | Onaylı proje kartı | Karar |
| PLAN-002 | Hedef müşteri ve mevcut süreç baz ölçümü | Ürün/satış | Görüşme, süre, maliyet ve problem kanıtı | PLAN-001 |
| PLAN-003 | Branch, commit, PR, CI ve ortam envanteri | Codex | Tarihli envanter | Repo erişimi |
| PLAN-004 | Auth, iki tenant ve çapraz tenant negatif testleri | Codex + Supabase | PASS/FAIL kanıtı | Test hesabı, tenant A/B |
| PLAN-005 | Inngest trigger, worker, checkpoint, retry ve duplicate event testi | Codex + Inngest | Run ve DB kanıtı | Production sync, test workflow |
| PLAN-006 | OpenAI/Anthropic gerçek çağrısı, maliyet ve hata davranışı | Codex + kullanıcı | Redacted provider kanıtı | Secret store |
| PLAN-007 | Audit ve maliyet ledger uzlaştırması | Codex + finans | Task maliyeti = ledger kanıtı | PLAN-005/006 |

P0 tamamlanmadan gerçek müşteri verisi, canlı ödeme veya geniş connector kapsamı açılmaz.

## 5. P1 — Ürün sözleşmesi ve araç güvenliği

| Kod | İş | Kabul |
|---|---|---|
| PLAN-008 | Hedef, başarı koşulu ve `expected_output` sözleşmesi | Bitti koşulu olmadan yürütme başlamaz |
| PLAN-009 | Tool/connector kataloğu | Sürüm, scope, yan etki sınıfı, timeout, retry, idempotency ve verification kayıtlı |
| P1-API | Task/Conversation/Offer API sözleşmeleri | Zod/OpenAPI, tenant ve audit testleri |
| P1-APPROVAL | İnsan onayı ve devralma | WAITING_APPROVAL/WAITING_INPUT/WAITING_DEVICE doğrulanır |
| P1-OBS | Correlation ID, redaction ve log politikası | Secret/PII loglanmaz |

## 6. P2 — API bakım pilotu

İlk ürün pilotu: sağlayıcı/API değişikliğini tespit etme, etki analizi, düzeltme, test ve incelemeye hazır PR.

1. Kaynak changelog, sürüm ve deprecation kaydı alınır.
2. Etkilenen endpoint/SDK/call-site eşleştirilir.
3. Ayrı branch açılır; küçük değişiklik yapılır.
4. Test, lint, typecheck, build, audit ve secret scan çalışır.
5. PR, rollback ve bağımsız verifier kanıtıyla kapanır.

## 7. P3 — Bilgisayar runner pilotu

Runner; cihaz, aktif pencere, uygulama kimliği, URL/dosya yolu ve şirket hesabını doğrulamadan yazma eylemi yapmaz.

- Gözlem → eylem → tekrar gözlem ayrı olaylardır.
- Offline durum `WAITING_DEVICE`, iptal sonrası yeni eylem yoktur.
- CAPTCHA/MFA ve login duvarı kullanıcıya devredilir.
- Clipboard, ekran görüntüsü ve dosya erişimi minimize edilir.
- Kill switch, heartbeat, lease ve rollback test edilir.
- İlk pilot Windows ve tek eşzamanlı interactive iş ile sınırlıdır.

## 8. P4 — Verifier, belirsizlik ve toparlanma

- Executor sonucu tek başına başarı kanıtı değildir.
- `UNKNOWN` durumda önce uzak sistem sorgulanır.
- Retry en fazla üç geçici deneme, jitter ve deadline ile sınırlıdır.
- Idempotency anahtarı proje/tenant/görev/adım/eylem kapsamındadır.
- Geri alınabilir işlem için telafi; geri alınamaz işlem için açık insan kapısı vardır.
- Yanlış sonuç `SUCCEEDED` olamaz; verifier ve örnekleme raporu zorunludur.

## 9. P5 — Ortak çalışma ve hafıza

- İki kullanıcının aynı görevi izlemesi, yönlendirmesi ve devralması test edilir.
- Hafıza kaynağı, tarih, kapsam, silme ve şirket izolasyonu taşır.
- Dış sayfa veya mesaj içeriği yetki oluşturmaz.
- Ajanlar yalnız görev kapsamındaki araç ve veriyi görür.

## 10. P6 — Testli yöntem geliştirme

Eval veri seti, kalite metriği, maliyet/latency, canary, sürüm, rollback ve hata sınıfları tanımlanır. Model ağırlığı kendiliğinden eğitilmez. Yeni yöntem pilot ve bağımsız verifier geçmeden varsayılan yapılmaz.

## 11. P7 — İş zekâsı, finans ve fiyat modeli

### KPI sözlüğü

Her KPI şu alanları taşır: tanım, pay/payda, kaynak, sahip, güncelleme sıklığı, hedef, eksik veri davranışı ve karar eşiği.

Minimum KPI seti:

- Başarılı doğrulanmış görev oranı
- İnsan devri oranı
- Ortalama tamamlanma süresi
- Yeniden işleme oranı
- Görev başına AI/altyapı maliyeti
- Tenant başına brüt katkı
- Aktif tenant, retention ve destek yükü
- Hata, UNKNOWN ve rollback oranı

### Finans modeli

İlk workbook üç senaryo içermelidir: düşük, temel ve yüksek. Her senaryoda kullanıcı/tenant sayısı, abonelik geliri, kullanım geliri, AI maliyeti, altyapı, destek, satış, vergi/ödeme maliyeti ve net nakit ayrı gösterilir.

```text
Gelir = abonelik + kullanım + ek hizmet
Değişken maliyet = model + araç + altyapı + ödeme
Brüt katkı = gelir - değişken maliyet
Başa baş tenant = sabit gider / tenant başına aylık katkı
```

Gerçek pilot ölçümü olmadan fiyat, SLA veya kârlılık iddiası verilmez.

## 12. Hazırlık — marka, site, SEO ve satış

Bu işler teknik P0’ı bloklamadan paralel yürüyebilir:

- Marka/domain sahipliği ve hedef pazar
- Beyaz/şeffaf UI referansına uygun landing, demo ve trial akışı
- Public/private erişim, robots, sitemap ve SEO ölçümü
- Sosyal içerik, demo videosu ve içerik sahibi
- Satış lead akışı, teklif, onboarding, destek ve iptal/iade metni

Site yayında olması ürün işletme kabulü değildir.

## 13. P8 — Hukuk, yayın ve işletme

- Gizlilik, retention, veri silme, kullanıcı/müşteri şartları
- Açık kaynak lisansları, SBOM ve tedarikçi listesi
- Veri bölgesi ve subprocessor kararı
- Backup/restore, rollback ve incident runbook
- DNS, deployment, alarm, destek devri ve sorumlu kişi
- İlk müşteri onboarding, satın alma, fatura ve destek yolu

## 14. P9 — Kurumsal ölçek

Ölçülen kapasite ve ilk pilot kanıtı olmadan enterprise özellik açılmaz. Sonraki kapsam: SSO/SCIM, özel tenant, private deployment, data residency, connector marketplace, geliştirici SDK, webhook ve revenue share.

## 15. Paralel çalışma matrisi

| Aynı anda yapılabilir | Önceki kapıya bağlı |
|---|---|
| Proje kartı, ihtiyaç görüşmeleri, dokümantasyon envanteri | Auth testi → tenant izolasyonu |
| UI prototipi, site/SEO taslağı, KPI sözlüğü | Production sync → Inngest canlı test |
| Tool kataloğu, threat model, runner protokolü | Provider credential → gerçek AI testi |
| Finans şablonu, hukuk soru listesi, destek runbook | Live task → audit/cost uzlaştırması |
| API bakım pilotu hazırlığı, PR şablonları | Pilot faydası → fiyat/SLA/yayın kararı |

## 16. Teslim ve GitHub kanıtı

Her iş için tek issue, ayrı branch, PR, CI ve kanıt dosyası gerekir:

```text
Repo: hakimceliker/mauseai
Task: PLAN-xxx
Branch: <branch>
PR: <link>
Değişen dosyalar: <liste>
Testler: lint/typecheck/test/build/audit/Docker
Sonuç: PASS/FAIL/NOT_RUN
Secret durumu: configured/credential_not_configured
Rollback: <yöntem>
Kalan engel: <liste>
```

## 17. Bir sonraki yürütme sırası

1. PR #83 CI ve review kanıtını kapat.
2. PLAN-001 proje kartı, bütçe sahibi ve ilk tarih.
3. PLAN-002 ihtiyaç ve baz ölçüm.
4. PLAN-004 Auth + tenant A/B canlı negatif test.
5. PLAN-005 Inngest canlı task/checkpoint/audit/retry/idempotency.
6. PLAN-006 gerçek provider testi.
7. PLAN-007 maliyet/audit uzlaştırma.
8. API bakım pilotu ve verifier.
9. Finans, hukuk, destek ve satış kabulü.
10. Pilot faydası kanıtlanınca yayın ve fiyat kararı.

## 18. Nihai durum dili

`COMPLETE` yalnız çıktı, test, kanıt, sorumlu ve rollback kaydı varsa kullanılır. Hedef mimari `PLANNED`, kod olup canlı kanıt yoksa `CODE_COMPLETE_LIVE_TEST_PENDING`, dış erişim yoksa `credential_not_configured`, karar veya kaynak yoksa `DECISION_PENDING` olarak işaretlenir.
