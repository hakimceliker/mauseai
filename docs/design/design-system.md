# MouseAI beyaz/şeffaf tasarım sistemi

Arayüz varsayılan olarak beyaz zeminli, düşük opaklıklı yüzeyli ve koyu metinli çalışır. Değerlerin tek kaynakları `src/styles/tokens.ts` ve `src/app/globals.css` içindeki `--mouseai-*` değişkenleridir.

## Kurallar

- Sayfa zemini `#ffffff`, kart/panel yüzeyi `rgba(248, 250, 252, 0.88)`.
- Ana metin `#0f172a`; ikincil metin `#475569`; sınır `#e2e8f0`.
- Başarı, uyarı ve hata renkleri beyaz zemin üzerinde WCAG AA kontrastını korur.
- Yeni sabit renk eklemek yerine token kullanılmalıdır.
- Referans görsellerdeki hiyerarşi korunur; koyu tema varsayılan değildir.

## Dünya standardı ürün referansı

Mevcut ekranın tasarım borcu kayda alınmıştır: bilgi hiyerarşisi, görev oluşturma
alanının önceliği, AI ekip kartlarının okunabilirliği, görev devri timeline'ı,
çıktı kartları ve güvenli yürütme göstergeleri tek bir tutarlı yüzeyde
birleştirilmelidir. Yeni görsel referans:

- [MouseAI world-class dashboard reference](mouseai-world-class-dashboard-reference.png)

Bu görsel uygulamanın tamamlandığını göstermez; tasarım hedefidir. Uygulama
sonrası responsive, erişilebilirlik, loading/empty/error state ve tenant
izolasyonu ayrıca test edilmelidir.
