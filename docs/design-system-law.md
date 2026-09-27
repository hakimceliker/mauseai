# MouseAI Tasarım Kanunu v1.0

Bu belge, MouseAI arayüzleri için bağlayıcı görsel ve etkileşim standardıdır. Referans görsellerdeki ürün adı, kişi adları, sayılar ve görev metinleri örnektir; gerçek veri gibi sabitlenemez.

## Bağlayıcı arayüz kuralları

1. Ürün adı `MouseAI` olarak kullanılır; logo ve ana navigasyon sol üstte yer alır.
2. Ana yerleşim: sol navigasyon, üst arama/servis durumu çubuğu, ana içerik ve gerektiğinde sağ bağlam panelidir.
3. Genel bakış ekranı KPI, workflow/departman, insan onayı, maliyet-verimlilik ve güvenilirlik görünümünü destekler.
4. Görev detayında başlık, açıklama, durum, öncelik, ilerleme, numaralı adım zaman çizgisi ve canlı aktivite akışı bulunur.
5. Çalışma alanında AI ekip kartları, görev gelen kutusu, çıktı ve görev devri paneli bulunur.
6. Koyu temada lacivert-siyah yüzey, cyan/mavi vurgu, yeşil başarı, amber bekleme, kırmızı hata kullanılır. Açık temada aynı semantik renkler korunur.
7. Liste ve tablolar kısa, taranabilir ve durum rozetiyle gösterilir; uzun içerik detay panelinde açılır.
8. Durum adları tutarlı kalır: `Devam ediyor`, `Onay bekliyor`, `Beklemede`, `Tamamlandı`, `Hata / Yeniden dene`.
9. İnsan onayı gereken adımlar görünür olmalı; `İncele`, `Onayla`, `Reddet`, `Düzenleme iste` eylemleri ayrıdır.
10. GPT, Claude ve diğer ajanlar ad, ikon/avatar ve çevrimiçi durumu ile gösterilir. Gerçek provider yoksa `mock` veya `not_configured` açıkça belirtilir.
11. Klavye odağı, kontrast, erişilebilir adlar ve `lang="tr"` zorunludur; durum yalnızca renkle anlatılamaz.
12. Masaüstünde üç kolon; dar ekranda sağ panel aşağı iner ve sol navigasyon daralır. Yatay taşma kabul edilmez.
13. Görsellerdeki örnek credential veya kişisel veri gerçek secret olarak kullanılamaz.

## Tasarım kabulü

Bir ekran ancak dayandığı referans belirtilmiş, normal/loading/empty/error/approval/responsive durumları gösterilmiş ve `lint`, `typecheck`, testler ile production build geçmişse tasarım açısından tamamlanmış sayılır. Tasarım kanunu işlevin gerçek olduğunu tek başına kanıtlamaz; işlevsel kanıt kod ve testlerle sağlanır.
