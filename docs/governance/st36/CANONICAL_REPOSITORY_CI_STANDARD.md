# MauseAI — Güncel depo ve aynalama standardı

**Yürürlük:** 03.10.2026  
**Durum:** `PARTIAL — POLICY UPDATED; FORGEJO MIRROR ACCEPTANCE NOT VERIFIED`

## 1. Kaynak ve yedek modeli

| Sistem | Rol | Yetki ve kullanım |
|---|---|---|
| GitHub `hakimceliker/mauseai` | Kanonik çalışma kaynağı | Branch, PR, CI, güvenlik ve kabul kayıtlarının kaynağı |
| Forgejo v15.0.9 | Özel, salt-okunur pull-mirror ve yedek | Yalnızca GitHub’dan çeker; geliştirme kaynağı değildir |

Forgejo aynasının GitHub erişim kimliği yalnızca `Contents: Read-only` ve `Metadata: Read-only` kapsamındadır; yazma ve silme yetkisi yoktur. Forgejo’dan GitHub’a otomatik push, force-push, silme veya kaynak değiştirme yapılmaz. Kanonik GitHub kaynak depoları korunur ve yedekleme amacıyla silinmez.

## 2. Yetki ve güvenlik

- Secret, token, API key veya private key değeri mesajlara, dosyalara ya da loglara yazılmaz.
- Canlı emirler kapalıdır. Finansal testler yalnızca paper/non-production modunda yürütülür.
- Production, DNS, secret, ödeme, repository silme ve geri dönüşü zor işlemler için ayrıca açık insan onayı gerekir.
- Gerçek credential veya yetkili dış hesap gerektiren kabul adımları `BLOCKED`/`PARTIAL` olarak raporlanır; PASS uydurulmaz.

## 3. Proje sınırları

TechCriptoAI, STECH AI, MauseAI ve LETFON AI ayrı projelerdir.

- Dosya, branch, commit, deployment ve secret projeler arasında paylaşılmaz.
- Bir projede yapılan değişiklik başka projenin deposuna kopyalanmaz.
- Her proje kendi GitHub deposunda geliştirilir; Forgejo yalnızca aynı depoyu ayrı adla aynalar.

## 4. Çalışma akışı

1. Değişiklik kanonik GitHub deposundaki ayrı branch’te yapılır.
2. PR, CI, test, build, güvenlik ve kabul kanıtları GitHub’da doğrulanır.
3. Forgejo aynası GitHub’dan periyodik olarak pull eder.
4. Forgejo’da geliştirme, kaynak değiştirme veya GitHub’a geri yazma yapılmaz.
5. Her görevde proje adı, kaynak repo, kabul edilen commit SHA, test sonucu, mirror durumu ve kalan engeller kaydedilir.
6. GitHub planı, production secret’ı, yetkili Supabase hesabı, domain/DNS, hukuk veya ticari onay gerektiren konular `BLOCKED`/`PARTIAL` kalır.

## 5. Kabul kanıtı

Her görev için GitHub repo/branch, commit SHA, PR ve CI bağlantıları; Forgejo mirror repo, son çekme zamanı, kaynak SHA ve tree eşliği, branch/tag sayıları, yerel CI ve restore tatbikatı; test/güvenlik sonucu, deployment durumu, sorumlu, tarih ve rollback yolu kaydedilir. Kanıt kayıtlarına credential değeri konmaz.

Mirror eşliği veya restore kanıtı production kabulü değildir.

## 6. Mevcut MauseAI durumu

- Kanonik kaynak: `hakimceliker/mauseai` GitHub deposu.
- Forgejo pull-mirror erişimi, son çekme zamanı, SHA/tree eşliği ve restore tatbikatı henüz doğrulanmadı.
- Canlı production emirleri ve finansal işlemler kapalıdır.
- Gerçek credential, production, hukuk veya işletme kanıtı olmayan kapılar `BLOCKED`/`NOT_RUN` kalır.

## Rollback

Aynalama bozulursa Forgejo pull işini durdur, kanonik GitHub commit’ini koru ve yalnızca yedek aynayı son doğrulanmış duruma geri al. Kanonik kaynağı silme veya değiştirme.
