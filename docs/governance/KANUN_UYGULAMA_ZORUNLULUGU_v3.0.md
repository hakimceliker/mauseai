# Senatech Proje Üretim ve İşletme Kanunu v3.0

**Yürürlük:** 1 Ekim 2026  
**Kapsam:** TechCriptoAI, MAUSEAI, STECH AI ve LETFON AI dahil Senatech tarafından yürütülen tüm yazılım, yapay zekâ, veri, otomasyon ve platform projeleri.

## Madde 1 — Bağlayıcılık

Bu belgede ve önceki kabul edilmiş proje kanunlarında tanımlanan aşamalar, modeller, kapılar, görev seviyeleri, kabul ölçütleri ve raporlar zorunludur. Hiçbir proje sahibi, ajan, geliştirici veya yönetici bunları kendi kararıyla atlayamaz, birleştiremez veya “sonra tamamlarız” diyerek yayın kapısını geçemez.

Bir gereklilik projeye uygulanmıyorsa **UYGULANAMAZ** kaydı açılır; nedeni, teknik/ticari gerekçesi, karar sahibi, tarihi ve yerine kullanılan kontrol yazılır. Kayıt olmadan gereklilik atlanmış sayılır.

## Madde 2 — Zorunlu proje yaşam döngüsü

Her proje şu sırayla kayıtlı olarak ilerler:

1. Fikir ve sorun
2. Müşteri ve ihtiyaç doğrulama
3. İş modeli
4. Finansal fizibilite
5. İlk sürüm kapsamı ve yol haritası
6. İş süreçleri ve sorumluluklar
7. Teknik mimari, veri ve entegrasyon
8. AI ve otomasyon mimarisi
9. UX, arayüz ve prototip
10. Yazılım ve altyapı geliştirme
11. Test, güvenlik ve kalite
12. Gerçek kullanıcı pilotu
13. Hukuk, lisans ve ticari hazırlık
14. Site, dokümantasyon, SEO, medya ve satış
15. Yayın hazırlığı ve geri dönüş planı
16. Canlı işletme, destek ve izleme
17. İş zekâsı, finans ve sürekli iyileştirme

Bu sıralama bir teslim zinciridir. Paralel yürütülebilen hukuk, finans, dokümantasyon, satış, SEO ve medya işleri yine kayıtlı aşamasında yürür; sonraki kapının kabulü için gereken çıktı eksikse kapı geçmez.

## Madde 3 — Zorunlu beşli model

Her proje için aşağıdaki beş model ayrı bölüm ve kayıt olarak bulunur:

- **İş modeli:** müşteri, sorun, değer, kanal, fiyat, paket, gelir, satın alma ve iptal.
- **Finans modeli:** gelir, değişken/sabit maliyet, katkı kârı, başabaş, CAC, churn, retention, üç senaryo ve 13 haftalık nakit.
- **Yönetim modeli:** roller, yetki, karar sahibi, toplantı ritmi, bütçe ve rapor.
- **Operasyon modeli:** süreç, insan/AI/yazılım adımları, SLA, hata, destek, iade, olay ve geri dönüş.
- **AI modeli:** görev, veri, model, araç, yetki, çıktı, verifier, hafıza, fallback, maliyet ve insan devri.

Bu modellerden biri yoksa proje **ÜRETİM KABULÜNE HAZIR DEĞİL** durumundadır.

## Madde 4 — A–L iş kırılımı

A ihtiyaç/pazar, B iş/finans, C kapsam/yol haritası, D süreç/organizasyon, E teknik mimari/veri, F AI/otomasyon, G tasarım/UX, H yazılım/depo, I kalite/güvenlik/pilot, J hukuk/ticaret, K site/SEO/medya, L yayın/satış/işletme başlıkları her projede bulunur.

Her başlık; sorumlu, çıktı, bağımlılık, kabul ölçütü ve kanıtla kapatılır. Başlıkların yalnızca dokümanda bulunması “tamamlandı” anlamına gelmez.

## Madde 5 — Kapı zorunluluğu

G1 ihtiyaç, G2 fizibilite, G3 kapsam, G4 organizasyon, G5 mimari, G6 prototip, G7 uçtan uca geliştirme, G8 kalite/güvenlik, G9 pilot, G10 yayın, G11 satış ve G12 sürdürülebilir işletme kapıları sırayla değerlendirilir.

Her kapı şu durumlardan birini taşır:

- **BEKLEMEDE:** çıktı veya kanıt eksik.
- **DÜZELTME:** çıktı var, kabul ölçütü sağlanmadı.
- **GEÇTİ:** kanıt, kabul sahibi ve tarih mevcut.
- **UYGULANAMAZ:** Madde 1 kaydı mevcut.

G1–G12 içinde GEÇTİ veya UYGULANAMAZ kaydı olmayan kapı geçilmiş sayılmaz.

## Madde 6 — Görev ve kabul

Görev hiyerarşisi portföy → proje → faz → iş paketi → özellik/süreç → görev → alt görev → kabul/kanıttır.

Her görevde proje kodu, görev kodu, gerekçe, tek sorumlu, bağımlılık, kaynak, tarih, durum, kabul ölçütü, teslim kanıtı ve karar bulunur. “Sistemi tamamla” görev değil iş paketidir.

Tamamlandı durumu; çalışan sonuç, test, kabul eden kişi ve tarih olmadan verilemez. Kod yazılması, preview açılması veya dokümanın hazırlanması tek başına kabul değildir.

## Madde 7 — İş zekâsı ve finans gerçeği

Her gösterge tanım, pay/payda, kaynak, sahip, sıklık, hedef ve eksik veri davranışı taşır. Eksik veri **VERİ YOK** olarak gösterilir; sıfır veya başarı kabul edilmez.

İlerleme yalnızca kabul edilmiş teslim ağırlığı / baseline toplamıyla hesaplanır. Baseline yoksa ilerleme yüzdesi gösterilmez. Bütçe, gelir, maliyet veya kârlılık için kaynak veya varsayım yoksa değer **KARAR BEKLİYOR** olarak kalır.

## Madde 8 — Sapma ve uyarı

Yanlış depo, yanlış proje, eksik görev, kanıtsız tamamlandı, bağımlılık ihlali, aşırı WIP, tarih/bütçe sapması, eksik veri, doğrulanmamış canlı iddiası, hukuk/finans belirsizliği veya çalışmayan özelliğin satışta anlatılması sapmadır.

Uyarı; kural, gözlenen durum, beklenen durum, etki, sorumlu, düzeltme, son tarih ve yönetim kararını taşır. Kritik güvenlik/veri ihlalinde ilgili işlem durur.

## Madde 9 — Yayın ve işletme yasağı

G12 geçmeden ve aşağıdaki teslimler kabul edilmeden proje canlı işletme kabulü alamaz:

- Kullanıcı faydası ve pilot ölçümü
- Satın alma/tahsilat veya bilinçli kapsam dışı kararı
- Destek ve olay sorumlusu
- İzleme ve alarm
- Yedek ve geri yükleme
- Rollback
- Güvenlik ve erişim testi
- Hukuk/lisans/gizlilik düzeni
- Site, dokümantasyon, SEO ve satış akışı
- Finansal mutabakat ve maliyet ölçümü

## Madde 10 — Kanun değişikliği

Bu kanunda değişiklik sürüm numarası, gerekçe, etkilenen projeler, etkilenen görevler, risk ve yürürlük tarihiyle yapılır. Yeni kullanıcı talebi kanunla çelişiyorsa karar kaydı açılır; sessizce uygulanmaz.

**Bağlayıcı sonuç:** Dört projenin hiçbiri tüm kapıları kanıtla geçmeden tamamlandı, yayına hazır veya işletme kabulü yapılmış gösterilemez.
