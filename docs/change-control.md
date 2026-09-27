# MouseAI — Değişiklik ve Onay Kontrolü

## Kural

Kullanıcı tarafından gönderilen her metin, öneri veya kod parçası önce taslak kabul edilir. Mevcut mimari, veri modeli, güvenlik kanunu ve iş akışıyla karşılaştırılmadan bağlayıcı karar sayılmaz.

## Çalışma alanı ve repo ayrımı (temel kural)

- MauseAI yalnızca `https://github.com/hakimceliker/mauseai` reposunda çalışır. Yerel çalışma dizini makineye göre değişebilir; bu çalışma kopyasının doğrulanmış yolu `C:\Users\Administrator\Documents\Codex\2026-09-26\ya\mouseai-core` ve ilişkili worktree'leridir. Belge içinde sabitlenmiş başka bir yerel yol yetkili kabul edilmez.
- TechCriptoAI ayrı bir projedir: kendi reposunda ve yerelde `C:\Users\Administrator\Documents\Codex\2026-09-26\ya-3\techcriptoai-backend` altında çalışır.
- İki proje arasında dosya, branch, commit veya PR karıştırılmaz. Commit öncesinde `git remote -v` çıktısının `hakimceliker/mauseai` olduğu doğrulanır.
- `main` dalına doğrudan push yapılmaz; her değişiklik bir özellik branch'inde yapılır ve PR ile gelir.
- Her iş raporunda repo URL'si, branch adı, commit SHA'sı ve PR numarası açıkça yazılır.

## Merkezi kaynak politikası

- GitHub repository, branch ve PR kayıtları merkezi kaynaktır; local kopya yalnızca geliştirme ve doğrulama ortamıdır.
- `git remote -v`, branch ve base SHA işlem öncesinde doğrulanır.
- Local ve remote farklıysa dosya ezilmez; diff, test ve bilinçli merge/rebase kararı gerekir.
- Secret merkezi GitHub'a yazılmaz; onaylı env/secret kaynağından runtime'da okunur.

## Uygulama sırası

1. Mevcut dosya ve sözleşme kontrol edilir.
2. Şema, event adı, yetki ve tenant sınırı karşılaştırılır.
3. Çakışan maddeler düzeltilir veya reddedilir.
4. Değişiklik test edilebilir ve geri alınabilir hale getirilir.
5. Sadece uyumlu madde kod/migration’a uygulanır.
6. Belgeye karar, risk ve açık kalan konu yazılır.

## Bu turda düzeltilen örnekler

- Pasted checkpoint metnindeki `step_id text` yerine mevcut `steps.id uuid` korundu.
- `task/run` yerine mevcut `mouseai/task.created` event sözleşmesi korundu.
- `profiles.id` yerine mevcut `profiles.user_id` kullanıldı.
- API tenant bilgisi JWT metadata’dan varsayılmadı; RLS korumalı `profiles` kaydından alındı.
- Service role ve RLS sınırları gevşetilmedi.

## Durum etiketleri

- `approved`: mimariyle uyumlu ve uygulanmış
- `adapted`: kullanıcı önerisi mevcut şemaya uyarlanmış
- `planned`: dokümante edilmiş, henüz uygulanmamış
- `rejected`: güvenlik/uyumluluk/akış nedeniyle uygulanmamış
