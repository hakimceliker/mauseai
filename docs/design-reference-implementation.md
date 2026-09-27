# MouseAI Tasarım Referansı Uygulaması

## Kaynak

Bu ekranlar, `Downloads/MAUSEAİ` klasöründeki üç referans görsel ve `design-system-law.md` içindeki bağlayıcı kurallara göre uygulanır:

1. Çalışma alanı: sol navigasyon, AI ekip kartları, görev gelen kutusu ve görev devri paneli.
2. Görev detayı: numaralı adım zaman çizgisi, ilerleme, insan onayı ve canlı aktivite.
3. Operasyon genel bakışı: KPI, departman akışları, maliyet/verimlilik, güvenilirlik ve onay kuyruğu.

## Uygulama sırası

- `/operations`: operasyon genel bakışı ve KPI katmanı.
- `/tasks/new`: çalışma alanı, AI ekip seçimi ve görev oluşturma.
- `/tasks/[id]`: görev zaman çizgisi ve canlı aktivite.
- Sağ bağlam paneli: görev devri, çıktılar ve sonraki adımlar.

## Veri dürüstlüğü

Referans görsellerdeki isim, sayı ve görevler yalnızca tasarım verisidir. Canlı tenant verisi bağlanana kadar arayüz bunu `MOCK DATA` olarak gösterir; hiçbir örnek değer production metriği gibi sunulmaz.

## Kabul

- Sol navigasyon ve üst durum çubuğu üç ekranda tutarlı.
- Durumlar metin + renk + ikonla gösterilir.
- İnsan onayı eylemleri `İncele`, `Onayla`, `Reddet` ve `Düzenleme iste` olarak ayrılır.
- Dar ekranlarda sağ panel aşağı taşınır; yatay taşma olmaz.
- Canlı provider bağlanmadığında `mock` veya `not configured` açıkça gösterilir.
