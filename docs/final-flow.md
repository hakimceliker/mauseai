# MouseAI Core — Son Çalışma Akışı

## 1. Hedeften göreve

Kullanıcı hedefi API üzerinden alınır. Sistem tenant, kullanıcı rolü, risk seviyesi ve bütçe sınırını doğrular; ardından task, workflow ve ilk step kayıtlarını oluşturur.

## 2. Dayanıklı yürütme

Task olayı production’da `task.execute` olarak Inngest’e gönderilir. Registered worker görevi alır, checkpoint’i okur ve kaldığı adımdan devam eder. Her adım deterministik kimlik, unique kayıt ve idempotency kontrolüyle çalışır. `mouseai/task.created` eski worker sözleşmesidir ve production route tarafından kayıtlı değildir.

## 3. AI yönlendirme

AI Router, görev riskine ve politikaya göre uygun sağlayıcıyı seçer. MVP’de mock GPT/mock Claude kullanılır. Gerçek sağlayıcılar yalnızca server-side adapter ve Vault/ortam sırrı üzerinden bağlanır.

## 4. Güvenlik ve politika

Kimlik doğrulama, tenant izolasyonu, rol kontrolü, bütçe limiti ve yüksek riskli işlem engeli yürütmeden önce uygulanır. Yetkisiz veya politika dışı işlem `BLOCKED` olur; otomatik olarak aşılmaz.

## 5. Maliyet ve kanıt

Her AI/araç çağrısı cost event olarak kaydedilir. Kritik adımlar audit ledger’a yazılır. Başarılı adım checkpoint’e, hata ise hata durumu ve audit kaydına işlenir.

## 6. Hata ve devam

Geçici ağ/timeout/429 hataları retry edilir. Yetki, doğrulama ve bütçe hataları retry edilmeden durur. Worker yeniden başlarsa son geçerli checkpoint’ten devam eder.

## 7. Kullanıcıya çıktı

Dashboard task durumunu gösterir: `PENDING → RUNNING → WAITING_APPROVAL/BLOCKED → COMPLETED/FAILED`. Nihai rapor, maliyet özeti ve audit kanıtı aynı task altında tutulur.

## 8. Faz sırası

1. MVP çekirdek: hedef, task, worker, checkpoint, mock AI, cost, audit, tenant güvenliği.
2. Gerçek model ve connector adapter’ları.
3. E-posta/conversation/offer ve politika motoru.
4. Web, desktop, mobile ve tarayıcı eklentileri.
5. Ödeme, cüzdan, kredi ve kullanım bazlı faturalama.
6. SEO, reklam, tasarım ve medya operasyonları.
7. Enterprise ölçek, gözlemleme, SLA ve gelişmiş yönetişim.

## 9. Başlama sırası

1. Supabase migration’ını bağlı projeye uygula.
2. Auth kullanıcısı, tenant ve profil seed’ini oluştur.
3. Inngest ve server ortam değişkenlerini bağla.
4. Health → task oluşturma → worker → checkpoint → audit/cost akışını uçtan uca dene.
5. Kabul testleri geçince `v0.1.0` sürümünü etiketle.

Bu akış, mevcut mimariyi değiştirmeden sonraki fazların üzerine eklenebileceği sabit çekirdektir.
