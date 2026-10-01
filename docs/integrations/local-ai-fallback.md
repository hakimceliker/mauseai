# Local-first AI / Cloud fallback

MouseAI local AI çağrılarında yapılandırılmış private gateway’i önce dener. Local endpoint erişilemiyor, timeout oluyor, hata dönüyor veya geçersiz yanıt veriyorsa mevcut OpenAI/Anthropic provider’ına otomatik geçer. Production local AI’ye bağımlı değildir.

## Yapılandırma

```env
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=https://private-tunnel-or-gateway-url
LOCAL_AI_MODEL=qwen3:8b
LOCAL_AI_CONNECT_TIMEOUT_MS=3000
LOCAL_AI_INFERENCE_TIMEOUT_MS=45000
```

`localhost:11434` yalnızca aynı makinedeki geliştirme içindir. Production için Ollama portu doğrudan internete açılmaz; private network veya güvenli tunnel/gateway kullanılır.

## Güvenlik sözleşmesi

- Cloud provider credential’ları silinmez veya değiştirilmez.
- Secret, prompt, kişisel veri ve API anahtarı loglanmaz.
- Provider adapter’ları server-side çalışır.
- Local başarısızlığı kullanıcıya laptop bağlantı hatası olarak gösterilmez.
- Credential eksikliği `credential_not_configured` olarak kalır; sahte başarı üretilmez.

## Güvenli telemetry

Router yalnızca şu redakte alanları loglar: `LOCAL`/`CLOUD` rotası, provider/model, fallback durumu ve nedeni, latency, token sayısı ve tahmini maliyet. Prompt ve provider yanıtı application loguna yazılmaz.

## Kabul senaryoları

| Senaryo | Beklenen sonuç |
|---|---|
| Local gateway erişilebilir | Local provider kullanılır |
| Local gateway kapalı/timeout | Cloud provider otomatik kullanılır |
| Local routing disabled | Cloud provider doğrudan kullanılır |
| Local ve cloud credential eksik | `credential_not_configured`; PASS üretilmez |

Bu belge local-first standardının MauseAI kod karşılığıdır; gerçek production gateway/provider kanıtı ayrıca canlı kabul kaydına eklenmelidir.
