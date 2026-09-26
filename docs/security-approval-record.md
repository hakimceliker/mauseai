# MouseAI Güvenlik Onay Kaydı

**Kapsam:** MouseAI Core MVP geliştirme ve güvenlik yapılandırması  
**Durum:** Kullanıcı tarafından proje içi çalışma için onaylandı  
**Yürürlük:** 26.09.2026

## Onaylanan işlemler

- Repo ve klasör yapısının oluşturulması
- TypeScript sözleşmeleri ve Zod şemaları
- Task API ve servis katmanı
- Supabase migration ve RLS politikaları
- Inngest worker/checkpoint altyapısı
- Mock GPT/Claude provider’ları
- Audit, maliyet ve policy testleri
- Güvenlik negatif testleri
- Doküman, PDF, Word ve teslim dosyalarının oluşturulması
- MouseAI dosya teslim klasörünün kullanılması

## Değişmez güvenlik sınırları

- API anahtarları sohbet mesajından alınmaz ve düz metin olarak yazılmaz.
- `.env.local`, secret key ve service-role key repoya veya teslim klasörüne kopyalanmaz.
- Service role yalnızca server-side worker’da kullanılabilir.
- Ödeme, para transferi, production deploy, veri silme ve bağlayıcı müşteri mesajı ayrı işlem onayı ister.
- Yetkisiz veya belirsiz işlem `BLOCKED` durumuna alınır.

## Onay sonucu

Bu kayıt, proje içi geliştirme yetkisini doğrular; gizli anahtar güvenliğini veya sistem güvenlik sınırlarını kaldırmaz.
