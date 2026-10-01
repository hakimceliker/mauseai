# MouseAI Depo ve Storage Yönetim Kanunu

**Kanun sürümü:** 1.0
**Bağlayıcılık:** Zorunlu
**Kanonik repo:** `https://github.com/hakimceliker/mauseai`  
**Kanonik çalışma klasörü:** `C:\Users\Administrator\Documents\Codex\2026-09-26\ya\mouseai-core`  
**Kapsam:** Git deposu, çalışma branch'leri, Supabase Storage ve dosya kanıtları

Bu belge, depolarla ilgili dağınık tanımları tek kaynağa bağlayan bağlayıcı kanundur. Başka proje, repo, bucket veya çalışma klasörü bu projeye otomatik olarak dahil değildir. Bu kanun ihlal edilirse ilgili değişiklik merge edilmez ve production kabulü verilmez.

## 1. Kaynak-of-truth kuralları

| Alan | Tek kaynak | Kural |
|---|---|---|
| Kod | GitHub `hakimceliker/mauseai` | Main'e doğrudan push yok; değişiklik branch→PR→CI→review ile gider |
| Yerel çalışma | `mouseai-core` | Başka proje klasörüyle dosya/secret paylaşılmaz |
| Şema | `supabase/migrations/` | Migration sırası bozulmaz; production uygulaması kanıtlanır |
| Kanun/görev | `docs/governance/st36/` ve `docs/task-registry.md` | Aynı görev için ikinci kanonik kayıt açılamaz |
| Storage politikası | Bu belge | Bucket, path, tenant ve retention değişiklikleri burada kayda alınır |
| Kanıt | `docs/evidence/` veya redacted `tmp/` | Secret, token, PII ve ham response yazılmaz |

## 2. Ortam ayrımı

| Ortam | Repo/branch | Supabase | Storage |
|---|---|---|---|
| Local | feature branch | local/mock veya açıkça seçilmiş proje | local/test bucket; gerçek müşteri verisi yok |
| Preview | PR branch | preview/test bağlantısı | test bucket; production path yok |
| Production | merge edilmiş main deployment | yalnızca onaylı MouseAI production projesi | private bucket; tenant path zorunlu |

TechCriptoAI, STECH AI, LETFON AI veya başka projelerin repo, bucket, tenant, key ve deployment ayarları MouseAI kapsamına alınamaz.

## 3. Storage standardı

Uygulama Storage kullanmaya başladığında varsayılan düzen:

```text
bucket: mouseai-private
path: tenant/{tenantId}/{resourceType}/{resourceId}/{objectId}
```

Kurallar:

1. Bucket private olur; public URL kullanılmaz.
2. `tenantId` uygulama parametresinden değil, doğrulanmış Auth/RLS bağlamından alınır.
3. Kullanıcıdan gelen path doğrudan bucket path'i olarak kullanılmaz.
4. `..`, absolute path, farklı tenant prefix'i ve path traversal reddedilir.
5. Download için kısa süreli signed URL kullanılır; URL kalıcı kaydedilmez.
6. Upload/download/delete işlemleri audit kaydı üretir.
7. MIME type, dosya boyutu, uzantı ve malware/zararlı içerik kontrolü yapılmadan dosya kabul edilmez.
8. Silme işlemi soft-delete/retention kuralına tabi olur; geri döndürülemez silme ayrıca onay ister.
9. Production Storage'a seed, fixture veya gerçek müşteri verisi test amacıyla kopyalanmaz.
10. Bucket veya path değişikliği migration + PR + rollback planı olmadan yapılamaz.

## 4. Kabul testleri

Storage özelliği açılmadan önce aşağıdaki testler PASS olmalıdır:

- Kimliksiz upload/download/delete: `401`
- Tenant A'nın Tenant B dosyasını okuması: `403` veya `404`
- Tenant A'nın Tenant B path'ine yazması: reddedilir
- Geçersiz path/path traversal: reddedilir
- Public URL üretimi: yok
- Signed URL süresi: kısa ve kontrollü
- Dosya boyutu/MIME/uzantı kontrolü: PASS
- Audit kaydı: actor, tenant, action, object ve result mevcut
- Aynı idempotency anahtarı: ikinci yan etki yok
- Retention/restore: kabul edilen süre ve rollback kanıtı mevcut

Storage kullanılmayan mevcut sürümde bu testler `NOT_RUN` kalır; bu durum başarı olarak raporlanmaz.

## 5. Değişiklik protokolü

Bucket, path veya storage policy değişikliğinde PR açıklaması şunları içerir:

```text
Storage change:
Bucket/environment:
Tenant boundary:
Migration:
RLS/policy test:
Audit test:
Rollback:
Production evidence:
```

Bu alanlardan biri eksikse değişiklik merge edilmez.

## 6. Mevcut durum

- Git repo ve çalışma klasörü kanonik olarak tanımlandı.
- Supabase migration düzeni mevcut ve tenant RLS kapsamı var.
- Uygulamada aktif Storage upload/download akışı tespit edilmedi.
- Bu nedenle production bucket oluşturulmadı ve gerçek dosya verisi taşınmadı.
- Storage için kabul durumu: `NOT_RUN`.

Bu yaklaşım, kullanılmayan bir Storage yüzeyini sessizce açmak yerine sınırları önceden bağlar.
