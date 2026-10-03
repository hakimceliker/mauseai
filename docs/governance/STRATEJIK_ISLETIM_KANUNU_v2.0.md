# Senatech Stratejik İşletim ve Proje Uygulama Kanunu v2.0

Yürürlük: 1 Ekim 2026 • İş sahibi: Abdulhakim Çeliker • Kapsam: TechCriptoAI, MAUSEAI, STECH AI ve LETFON AI

## Kanunun amacı

Bu kanun her projeyi beş modelle yönetir: iş modeli, finans modeli, yönetim modeli, operasyon modeli ve AI modeli. Bu modellerden biri eksikse proje teknik geliştirme olarak kalır; ürün ve işletme kabulüne geçemez.

## Beşli model

**İş modeli:** Hedef müşteri, kullanıcı, ödeme yapan, sorun, mevcut alternatif, değer önerisi, kanal, paket, fiyat hipotezi, satın alma ve iptal nedeni yazılır. Varsayım doğrulama yöntemi, sahibi ve tarihi taşır.

**Finans modeli:** Aylık gelir = aktif müşteri × paket fiyatı + işlem/lisans/hizmet geliri. Değişken maliyet = model/API + veri/connector + altyapı + ödeme + işlem destek maliyeti. Katkı kârı = net gelir − değişken maliyet. Başabaş müşteri = sabit gider / müşteri başına katkı. CAC = satış/pazarlama gideri / yeni müşteri. Churn, retention, 12 aylık düşük/temel/yüksek senaryo ve 13 haftalık nakit planı ayrı tutulur. Rakam verilmezse uydurulmaz; KARAR BEKLİYOR yazılır.

**Yönetim modeli:** İş sahibi yatırım ve hedefi; proje sorumlusu sıra ve bağımlılığı; ürün sorumlusu kullanıcı/kapsamı; teknik sorumlu mimariyi; kalite sorumlusu kabulü; ticari sorumlu fiyat/satışı; finans sorumlusu nakdi; operasyon sorumlusu canlı hizmeti yönetir. Bir kararın sahibi ve son tarihi vardır.

**Operasyon modeli:** İş başlatma, doğrulama, yürütme, onay, teslim, faturalama, destek, olay, iptal, iade, timeout ve rollback akışları tanımlanır. İnsan, AI, yazılım ve dış hizmet adımları ayrılır.

**AI modeli:** Görev, izinli girdi, kaynak, model/sağlayıcı, araç yetkisi, bütçe, çıktı şeması, verifier, hafıza, fallback, insan devri ve ölçüm kaydı olmadan AI özelliği kabul edilmez. Başarılı API çağrısı görev başarısı değildir.

## Merkezi davet ve çift onay hükmü

Kullanıcı daveti ile yüksek riskli yetki etkinleştirmesi ayrı işlemlerdir. Geri alınabilir, süreli ve yalnızca `member` başlangıç rolü veren normal davet, bir yetkili `owner` veya `admin` tarafından oluşturulabilir; ikinci iç onay davetin oluşturulmasını bloke etmez. Davet edilen kişi doğrulayıp kabul etmeden üyelik aktifleşmez.

`admin`/`owner`, ödeme, finans, service-role, secret, production, tenantlar arası erişim, RLS/güvenlik veya geri döndürülemez veri yetkisi ancak davet edenden farklı ikinci yetkili tarafından onaylandıktan sonra etkinleşir. Self-approval yasaktır. Davet tokenı tek kullanımlık ve süreli olur; iptal, sona erme, tenant uyuşmazlığı ve bütün onay geçişleri secret içermeyen audit kaydı taşır. Uygulama ayrıntısı `docs/central-invitation-and-approval-contract.md` içindedir.

## Kapılar ve matematik

İhtiyaç → iş/finans → kapsam → organizasyon → mimari → prototip → uçtan uca geliştirme → kalite/güvenlik → pilot → yayın → satış → sürdürülebilir işletme. Kanıtı olmayan kapı geçmez.

Öncelik skoru = iş değeri + risk azaltma + aciliyet + bağımlılık etkisi − maliyet − belirsizlik. İlerleme = kabul edilmiş teslim ağırlığı / baseline toplamı. Baseline yoksa yüzde gösterilmez.

## Görev, rapor ve sapma

Her görev proje kodu, faz, gerekçe, tek sorumlu, bağımlılık, kaynak, kabul, tarih, durum ve kanıt taşır. Rapor sırası tamamlananlar, devam edenler, engeller, karar bekleyenler, finans/kalite/risk ve yönetici kanaatidir.

Yanlış repo, kanıtsız tamamlandı, kapsam artışı, bütçe/tarih sapması, eksik bağımlılık, aşırı WIP, veri yokken başarı yüzdesi ve doğrulanmamış canlı iddiası uyarı üretir. Her uyarı etki, sorumlu, düzeltme ve karar tarihi taşır.


# Uygulama Denetimi ve Revizyon v2.0

Önceki paket yönetim iskeleti ve taslak plan seviyesinde kaldı. Beşli stratejik model, finans matematiği, operasyon akışları, konuşmalardaki proje özel maddeleri ve gerçek kabul katmanı ayrı ayrı uygulanmamıştı. Bu revizyon her projeye ortak kanunu ve proje özel eki ekler.

Belgelerin hazır olması ürün kodu, canlı entegrasyon, pilot veya satış kabulünün tamamlandığı anlamına gelmez. Bundan sonraki kabul; kişi, bütçe, tarih, görev eşlemesi, test sonucu ve kullanıcı ölçümüyle yapılır.

Uygulama sırası: proje kartı ve sorumlu → iş/finans modeli → eski işler ile eşleme → P0 teknik/güvenlik kapıları → ana iş akışı → pilot fayda → satış/işletme kabulü → PR inceleme ve yayın.
