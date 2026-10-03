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

## Kapılar ve matematik

İhtiyaç → iş/finans → kapsam → organizasyon → mimari → prototip → uçtan uca geliştirme → kalite/güvenlik → pilot → yayın → satış → sürdürülebilir işletme. Kanıtı olmayan kapı geçmez.

Öncelik skoru = iş değeri + risk azaltma + aciliyet + bağımlılık etkisi − maliyet − belirsizlik. İlerleme = kabul edilmiş teslim ağırlığı / baseline toplamı. Baseline yoksa yüzde gösterilmez.

## Görev, rapor ve sapma

Her görev proje kodu, faz, gerekçe, tek sorumlu, bağımlılık, kaynak, kabul, tarih, durum ve kanıt taşır. Rapor sırası tamamlananlar, devam edenler, engeller, karar bekleyenler, finans/kalite/risk ve yönetici kanaatidir.

Yanlış repo, kanıtsız tamamlandı, kapsam artışı, bütçe/tarih sapması, eksik bağımlılık, aşırı WIP, veri yokken başarı yüzdesi ve doğrulanmamış canlı iddiası uyarı üretir. Her uyarı etki, sorumlu, düzeltme ve karar tarihi taşır.


# MAUSEAI Proje Uygulama Eki v2.0

## Projeye özel zorunlu maddeler
- Hedef ve bitiş koşulu → plan/araç seçimi → API/bilgisayar/uzman ajan yürütmesi → bağımsız doğrulama → teslim.
- Dur, yönlendir, devral, onay, bütçe, yetki ve insan müdahalesi.
- Checkpoint, idempotency, sınırlı retry, rollback, hafıza ve hata sonrası yeniden plan.
- API değişikliklerini takip eden, hata bulup öneri oluşturan, testten sonra yöntem sürümleyen ajan.
- Ekipçe kullanılan görevler; tenant/proje hafızası ayrı.
## İş ve finans
Abonelik ve kullanım kotası hipotezidir. Runner, connector, model, depolama, destek ve başarısız denemeler görev maliyetine girer.
## Sıradaki gerçek teslim
Auth/RLS → dayanıklı worker/checkpoint/audit → provider maliyeti → kontrollü runner/verifier → pilot fayda.

## Merkezi kullanıcı daveti ve onay ayrımı

Kullanıcı daveti normal operasyonu durduracak genel bir çift onay kapısına bağlanmaz. `owner` veya `admin` tarafından oluşturulan süreli `member` daveti, hedef kişinin kimlik/e-posta kabulünden sonra düşük ayrıcalıklı üyelik açar. İkinci onay yalnızca yüksek riskli rol veya erişimin etkinleştirilmesinde aranır: `admin`/`owner`, finans/ödeme, service-role/secret, production, tenantlar arası erişim, RLS/güvenlik ve geri döndürülemez işlemler.

Davet oluşturma ve yetki yükseltme ayrı audit olaylarıdır. Davet eden kişi kendi yükseltme onayını veremez. Davet endpoint’i, persistence migration’ı ve politika testleri branch’te teslim edilmiştir; canlı migration/Auth/RLS kabulü tamamlanana kadar durum `live-acceptance-pending` olarak kalır. Uygulama kabul testleri `docs/central-invitation-and-approval-contract.md` içinde zorunludur.
