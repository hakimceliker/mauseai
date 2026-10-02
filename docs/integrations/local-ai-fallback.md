# Local-first AI / Cloud fallback

MouseAI local AI çağrılarında yapılandırılmış private gateway’i önce dener. Local endpoint erişilemiyor, timeout oluyor, hata dönüyor veya geçersiz yanıt veriyorsa mevcut OpenAI/Anthropic provider’ına otomatik geçer. Production local AI’ye bağımlı değildir.

## Yapılandırma

```env
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=https://private-tunnel-or-gateway-url
LOCAL_AI_MODEL=qwen3:8b
LOCAL_AI_CONNECT_TIMEOUT_MS=3000
LOCAL_AI_INFERENCE_TIMEOUT_MS=45000
LOCAL_AI_PROTOCOL=ollama
LOCAL_AI_HEALTH_PATH=/api/tags
# Add both headers for production Cloudflare Access service tokens in secret storage.
LOCAL_AI_ACCESS_CLIENT_ID=...
LOCAL_AI_ACCESS_CLIENT_SECRET=...
```

`localhost:11434` yalnızca aynı makinedeki geliştirme içindir. Production için Ollama portu doğrudan internete açılmaz; HTTPS ile güvenli private tunnel ve Cloudflare Access service token gerekir. Local health probe 3 saniyede başarısız olursa mevcut cloud provider devreye girer. Inference ve response body için ayrı 45 saniyelik üst sınır vardır.

## Güvenlik sözleşmesi

- Cloud provider credential’ları silinmez veya değiştirilmez.
- Secret, prompt, kişisel veri ve API anahtarı loglanmaz.
- Provider adapter’ları server-side çalışır.
- Local başarısızlığı kullanıcıya laptop bağlantı hatası olarak gösterilmez.
- Credential eksikliği `credential_not_configured` olarak kalır; sahte başarı üretilmez.

## Güvenli telemetry

Router yalnızca şu redakte alanları loglar: `LOCAL`/`CLOUD` rotası, provider/model, fallback durumu ve nedeni, latency, input/output/total token sayısı, cost basis ve cost. Usage yoksa token ve cloud cost alanları `null` kalır. Mevcut OpenAI/Anthropic model-rate değerleri tahmindir; provider faturası değildir. Local API cost sıfırdır; donanım/enerji giderini içermez. Prompt ve provider yanıtı application loguna yazılmaz.

## Kabul senaryoları

| Senaryo | Beklenen sonuç |
|---|---|
| Local gateway erişilebilir | Local provider kullanılır |
| Local gateway kapalı/timeout | Cloud provider otomatik kullanılır |
| Local routing disabled | Cloud provider doğrudan kullanılır |
| Local ve cloud credential eksik | `credential_not_configured`; PASS üretilmez |

Bu belge local-first standardının MauseAI kod karşılığıdır; gerçek production gateway/provider kanıtı ayrıca canlı kabul kaydına eklenmelidir.
