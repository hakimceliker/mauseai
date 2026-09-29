# MouseAI — Değişiklik ve Onay Kontrolü

## Kural

Kullanıcı tarafından gönderilen her metin, öneri veya kod parçası önce taslak kabul edilir. Mevcut mimari, veri modeli, güvenlik kanunu ve iş akışıyla karşılaştırılmadan bağlayıcı karar sayılmaz.

## Uygulama sırası

1. Mevcut dosya ve sözleşme kontrol edilir.
2. Şema, event adı, yetki ve tenant sınırı karşılaştırılır.
3. Çakışan maddeler düzeltilir veya reddedilir.
4. Değişiklik test edilebilir ve geri alınabilir hale getirilir.
5. Sadece uyumlu madde kod/migration’a uygulanır.
6. Belgeye karar, risk ve açık kalan konu yazılır.

## Bu turda düzeltilen örnekler

- Pasted checkpoint metnindeki `step_id text` yerine mevcut `steps.id uuid` korundu.
- Production task execution uses the registered `task.execute` event. The older
  `mouseai/task.created` worker contract is retained only as unregistered legacy
  code and must not be used for production triggers.
- `profiles.id` yerine mevcut `profiles.user_id` kullanıldı.
- API tenant bilgisi JWT metadata’dan varsayılmadı; RLS korumalı `profiles` kaydından alındı.
- Service role ve RLS sınırları gevşetilmedi.

## Durum etiketleri

- `approved`: mimariyle uyumlu ve uygulanmış
- `adapted`: kullanıcı önerisi mevcut şemaya uyarlanmış
- `planned`: dokümante edilmiş, henüz uygulanmamış
- `rejected`: güvenlik/uyumluluk/akış nedeniyle uygulanmamış
