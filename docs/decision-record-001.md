# ADR-001: Bağımsız çekirdek ve sağlayıcıdan bağımsız yönlendirme

## Karar

MouseAI Core, diğer projelerden ayrı depo ve ayrı çalışma ortamı olarak kurulacaktır. Sağlayıcılar doğrudan iş akışına gömülmeyecek; ortak bir Provider Adapter sözleşmesi üzerinden AI Gateway'e bağlanacaktır.

## Neden

- Sağlayıcı değişiminde iş akışının bozulmaması
- Maliyet ve gecikme karşılaştırması
- Mock sağlayıcı ile anahtar olmadan test
- Hata sonrası checkpoint'ten devam
- Tenant ve audit sınırlarının tek merkezde tutulması

## Kısıt

Gerçek API anahtarları bu depoya yazılmayacak. Secret bağlantısı kurulmadan gerçek sağlayıcı çağrısı açılmayacak.
