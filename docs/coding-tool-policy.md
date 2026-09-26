# MouseAI Kod Üretim Araçları Politikası

## 1. Standart geliştirme kombinasyonu

| Araç | Birincil görev | Yetki sınırı |
|---|---|---|
| **Cursor** | Günlük geliştirme, multi-file düzenleme, repo içinde hızlı uygulama | Commit/merge/deploy kararı veremez |
| **Claude Code** | Terminal, büyük repo analizi, karmaşık refactor ve hata ayıklama | Görev kapsamı dışına çıkamaz; production yazamaz |
| **GPT/Kodex** | Mimari, API, veri modeli, test planı, görev koordinasyonu | Onaylanmamış kodu üretime gönderemez |
| **GitHub Copilot** | Satır içi tamamlama, küçük fonksiyon ve test önerisi | Mimari karar veremez; öneri otomatik doğru kabul edilmez |
| **Windsurf** | Cursor alternatifi ve bağımsız geliştirme ortamı | Aynı anda Cursor ile aynı dosyayı sahiplenemez |
| **Cline/Aider** | Kendi API anahtarıyla opsiyonel açık kaynak ajan | Sadece izinli branch ve görev alanında çalışır |

## 2. İş akışı

```text
GPT/Kodex: gereksinim + mimari + görev kartı
        ↓
Cursor: günlük kodlama ve dosya düzenleme
        ↓
Claude Code: terminal testi, büyük refactor ve hata analizi
        ↓
GPT/Kodex: API/test/entegrasyon kontrolü
        ↓
Claude: bağımsız kod ve güvenlik incelemesi
        ↓
CI: test + lint + typecheck + security scan
        ↓
İnsan onayı
        ↓
Preview deploy → kabul testi → production
```

## 3. Araç seçme kuralları

1. Günlük küçük ve orta değişikliklerde Cursor kullanılır.
2. Büyük repo taraması, terminal işleri ve refactor’da Claude Code kullanılır.
3. Mimari, API, sözleşme ve test planında GPT/Kodex birincildir.
4. Copilot yalnızca küçük ve yerel öneri üretir.
5. Windsurf, Cursor’ın alternatifi olarak kullanılır; aynı dosyada iki ajan eş zamanlı çalışmaz.
6. Cline/Aider yalnızca açıkça atanmış görevde ve izinli API anahtarıyla kullanılır.
7. Fiyat veya model gücü tek başına araç seçme gerekçesi değildir; kalite, güvenlik, bağlam, maliyet ve kanıt birlikte değerlendirilir.

## 4. Kod görev kartı zorunluluğu

Her kod görevi şu alanlara sahip olur:

```yaml
task_id: CODE-000
primary_tool: cursor|claude_code|gpt|copilot|windsurf|cline|aider
review_tool: claude|gpt|human
branch: feature/...
allowed_paths: []
forbidden_paths: [.env, production-secrets]
objective: ""
acceptance_criteria: []
tests_required: [unit, integration]
security_checks: []
rollback: ""
```

## 5. Kod kalitesi kapıları

Kod tamamlanmış sayılmaz; aşağıdaki kontroller geçmeden merge edilemez:

- typecheck
- lint/format
- unit test
- integration test
- gerekli ise end-to-end test
- dependency/security scan
- migration geri alma kontrolü
- log ve hata yönetimi
- diff incelemesi
- kabul kriteri kontrolü

## 6. AI kaynaklı risk kontrolü

AI tarafından üretilen kod için şu riskler özellikle kontrol edilir:

- halüsinasyon ve var olmayan API kullanımı
- güncel olmayan/kaldırılmış kütüphane
- yanlış dosya ve mimari sınır değişikliği
- secret sızıntısı
- injection, SSRF, yetki yükseltme ve veri erişimi
- sessiz veri kaybı
- gereksiz token ve cloud maliyeti
- test varmış gibi görünen ama çalışmayan test

## 7. Commit ve merge kuralı

Hiçbir AI doğrudan ana branch’e yazamaz. Değişiklik branch üzerinde yapılır, görev kimliğiyle commit edilir, test kanıtı eklenir ve inceleme tamamlanır. Production deploy yalnızca CI ve yetkili onaydan sonra yapılır.

## 8. Bağlam yönetimi

AI’ye bütün repo kontrolsüz şekilde verilmez. Görev için gerekli dosyalar, mimari özeti, sözleşmeler, değişmez kurallar ve test hedefleri görev paketine eklenir. AI bağlamı yetersizse tahmin yürütmez; `CONTEXT_REQUIRED` durumuna geçer.

## 9. Maliyet yönetimi

Önce düşük maliyetli model/araçla keşif ve küçük düzeltme yapılır. Büyük model ve uzun ajan çalışması yalnızca görev gerektiriyorsa açılır. Her kod görevi token, süre, araç ve cloud maliyetini kaydeder.

## 10. Nihai ilke

Cursor, Claude Code, GPT, Copilot, Windsurf, Cline veya Aider hiçbir zaman “tek başına yazılımcı” kabul edilmez. Her biri görev kapsamı içinde çalışan, çıktısı test ve incelemeyle doğrulanan bir yardımcıdır.
