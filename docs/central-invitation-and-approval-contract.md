# MouseAI Merkezi Davet ve Çift Onay Sözleşmesi

**Durum:** `approved-by-policy / code-implemented / live-acceptance-pending`
**Yürürlük:** 3 Ekim 2026
**Kapsam:** Merkezi yönetim, tenant üyeliği, kullanıcı daveti ve rol/yetki değişiklikleri

## 1. Amaç

Kullanıcı davetini, yüksek riskli yetki değişikliğiyle aynı çift onay kapısına bağlamamak. Normal bir üyeyi davet etmek operasyonu durdurmamalı; buna karşılık yönetici, sahip, ödeme, service-role veya üretim yetkisi gibi riskli erişimler ikinci bir bağımsız onay olmadan etkinleşmemelidir.

## 2. Temel ayrım

Bir davet iki ayrı işlem olarak değerlendirilir:

1. **Davet oluşturma:** Belirli bir e-posta adresine, belirli tenant/proje ve düşük ayrıcalıklı bir başlangıç rolüyle süreli davet gönderilmesi.
2. **Yetki etkinleştirme:** Davet kabul edildikten sonra yüksek riskli bir rolün veya dış sistem erişiminin aktif edilmesi.

Bu iki işlem tek bir zorunlu çift onay adımında birleştirilemez.

## 3. Normal üye daveti

`member` rolüyle sınırlı, geri alınabilir ve süreli davet için:

- Bir yetkili `owner` veya `admin` daveti oluşturabilir.
- İkinci iç onay zorunlu değildir.
- Davet, davet edilen kişinin e-posta/kimlik doğrulaması ve açık kabulü olmadan üyelik oluşturmaz.
- Davet varsayılan olarak 72 saat sonra sona erer; kabul edilmeden iptal edilebilir.
- Kabul sonrası başlangıç rolü yalnızca `member` olabilir.
- Tenant, proje, davet eden kişi, hedef e-posta, rol, oluşturulma, kabul, iptal ve sona erme olayları audit kaydına yazılır.

## 4. Çift onayın zorunlu olduğu işlemler

Aşağıdaki işlemler normal davet akışından ayrı tutulur ve davet eden kişiden farklı ikinci bir yetkili onayı olmadan etkinleşemez:

- `owner` veya `admin` rolü verme/yükseltme
- Service-role, secret, API key veya production erişimi
- Ödeme, faturalama, wallet veya finansal işlem yetkisi
- Tenantlar arası erişim veya merkezi yönetim yetkisi
- RLS, güvenlik politikası, canlı deploy veya geri döndürülemez veri işlemi
- Davet politikasını, onay matrisini veya ana sözleşme kuralını değiştirme

İkinci onay, daveti oluşturan kişiyle aynı kişi olamaz. Self-approval reddedilir.

## 5. Güvenlik ve geri alma

- Davet tokenı tek kullanımlık, tahmin edilemez ve secret olarak loglanamaz.
- Davet yalnızca oluşturulduğu tenant/proje bağlamında geçerlidir.
- Davet kabul edilmeden rol yükseltilemez.
- Yetkili kişi daveti iptal edebilir; iptal edilmiş veya süresi dolmuş davet tekrar kullanılamaz.
- Şüpheli, tekrarlı veya tenant uyuşmazlığı bulunan davet `BLOCKED` durumuna alınır.
- Çift onay, davet oluşturmayı değil yalnızca yüksek riskli yetkinin etkinleşmesini bloke eder.

## 6. Durum makinesi

```text
CREATED
  → SENT
  → ACCEPTED_MEMBER
  → ACTIVE_MEMBER

ACCEPTED_MEMBER
  → PRIVILEGE_REQUESTED
  → SECOND_APPROVAL_REQUIRED
  → PRIVILEGE_ACTIVE

SENT → REVOKED | EXPIRED | BLOCKED
```

`ACTIVE_MEMBER` durumuna geçiş için ikinci iç onay aranmaz. `PRIVILEGE_ACTIVE` durumuna geçişte ikinci onay zorunludur.

## 7. Uygulama ve kabul şartı

Kod karşılığı artık aşağıdaki yüzeylerde bulunur:

- `POST /api/invitations`: yalnızca `owner/admin` tarafından süreli `member` daveti oluşturur.
- `POST /api/invitations/accept`: e-posta ve tek kullanımlık token ile üyeliği `member` olarak açar.
- `POST /api/invitations/:id/privilege`: `admin/owner` yükseltmesi için `SECOND_APPROVAL_REQUIRED` kaydı açar.
- `POST /api/invitations/approvals/:id`: davet edenden farklı ikinci yetkili onaylarsa rolü etkinleştirir.
- `supabase/migrations/0013_central_invitations_and_privilege_approvals.sql`: rol, davet, approval, hash/token, süre, audit ve tenant RLS şemasını kurar.

Canlı Supabase migration’ı ve gerçek Auth/RLS acceptance çalıştırılmadığı sürece production kabulü verilmez. Aşağıdaki regression/acceptance testleri zorunludur:

1. Normal `member` daveti tek yetkiliyle oluşturulur.
2. Davet kabul edilmeden üyelik aktifleşmez.
3. `admin`/`owner` yükseltmesi ikinci onay olmadan aktifleşmez.
4. Davet eden kişi kendi yüksek riskli onayını veremez.
5. Expired/revoked/token-tenant mismatch davetleri reddedilir.
6. Her geçişte secret/token içermeyen audit kaydı oluşur.
7. RLS tenant dışı davet ve approval kayıtlarını göstermez/değiştirmez.
8. Migration mevcut kullanıcıların sahiplik/rol atamasını insan onayı olmadan yükseltmez.

Bu belge `docs/change-control.md`, `docs/governance/STRATEJIK_ISLETIM_KANUNU_v2.0.md` ve `docs/governance/MAUSEAI_PROJE_UYGULAMA_EKI_v2.0.md` ile birlikte okunur.
