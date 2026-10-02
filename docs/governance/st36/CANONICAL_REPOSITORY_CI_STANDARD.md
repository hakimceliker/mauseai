# MouseAI — Güncel Depo ve Aynalama Kanunu

**Sürüm:** 03.10.2026  
**Durum:** `IN_PROGRESS — POLICY UPDATED, MIRROR VERIFICATION PENDING`

## 1. Kaynak ve yedek modeli

| Sistem | Rol | Yetki modeli |
|---|---|---|
| GitHub | Kanonik çalışma kaynağı | Branch, PR, CI, güvenlik ve kabul kayıtlarının kaynağı |
| Forgejo v15.0.9 | Yerel salt-okunur pull-mirror/yedek | GitHub’dan çeker; geliştirme kaynağı değildir |
| GitLab | Bu standartta kullanılmayan harici kaynak | MouseAI için kanonik kaynak değildir |
| Codeberg | Yalnızca açıkça uygun projelerde opsiyonel mirror | Platform ve içerik politikası önkoşuludur |

Forgejo’dan GitHub/GitLab’a otomatik push, force-push, silme veya kaynak değiştirme yapılmaz. Kaynak depolar yedekleme amacıyla korunur ve silinmez.

## 2. Yetki ve güvenlik

- GitHub aynalama yetkisi yalnızca `Contents: Read-only` ve `Metadata: Read-only` kapsamındadır.
- Mirror hesabında yazma ve silme yetkisi bulunmaz.
- Secret, token, API key veya private key mesajlara, dosyalara ve loglara yazılmaz.
- Canlı emirler kapalıdır; finansal testler paper/non-production modundadır.
- Production, DNS, secret, ödeme, repository silme ve geri dönüşü zor işlemler için açık insan onayı gerekir.

## 3. Proje sınırları

TechCriptoAI, STECH AI, MouseAI ve LETFON AI ayrı projelerdir.

- Dosya, branch, commit, deployment ve secret paylaşılmaz.
- Bir projedeki değişiklik başka projenin deposuna kopyalanmaz.
- Her proje kendi GitHub deposunda geliştirilir.
- Forgejo yalnızca aynı GitHub deposunu ayrı isimle aynalar.

## 4. Çalışma akışı

1. Değişiklik kanonik GitHub deposunda ayrı branch’te yapılır.
2. PR, CI, test, build, güvenlik ve kabul kanıtları GitHub’da doğrulanır.
3. Forgejo aynası periyodik olarak GitHub’dan pull eder.
4. Forgejo’ya manuel geliştirme, kaynak değiştirme veya GitHub’a geri yazma yapılmaz.
5. Her görev şu alanlarla raporlanır: proje, kaynak repo, kabul edilen commit SHA, test sonucu, mirror durumu ve kalan engeller.
6. GitHub planı, production secret’ı, yetkili Supabase hesabı, domain/DNS, hukuk veya ticari onay isteyen işler `BLOCKED`/`PARTIAL` kalır.

## 5. Kanıt sözleşmesi

Her görev için GitHub repo/branch, kabul edilen commit SHA, PR ve CI bağlantıları, Forgejo mirror adı/son çekme zamanı/kaynak SHA, test-güvenlik sonucu, deployment durumu, sahip, zaman damgası ve rollback yolu kaydedilir.

Mirror senkronizasyonu başarıyla gerçekleşmiş olsa bile bu, production kabulü değildir.

## 6. Mevcut MouseAI durumu

- Kanonik geliştirme kaynağı: `hakimceliker/mauseai` GitHub deposu.
- Forgejo mirror: erişim ve son SHA doğrulaması ayrıca kanıtlanacak.
- Canlı production emirleri ve finansal işlemler kapalı.
- Gerçek credential, production, hukuk ve işletme kanıtı olmayan kapılar `BLOCKED`/`NOT_RUN` kalır.

## Rollback

Mirror senkronizasyonunu durdur, kanonik GitHub commit’ini koru ve yalnızca Forgejo mirror ref’ini geri al. Kanonik kaynağı silme veya değiştirme.
