# Local-first AI / Cloud fallback

MouseAI local AI çağrılarında yapılandırılmış private gateway’i önce dener. Local endpoint erişilemiyor, timeout oluyor, hata dönüyor veya geçersiz yanıt veriyorsa mevcut OpenAI/Anthropic provider’ına otomatik geçer. Production local AI’ye bağımlı değildir.

## Yapılandırma

```env
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=<approved-private-gateway-in-runtime-secret-store>
LOCAL_AI_PROTOCOL=gateway
LOCAL_AI_MODEL=qwen3:8b
LOCAL_AI_CONNECT_TIMEOUT_MS=3000
LOCAL_AI_INFERENCE_TIMEOUT_MS=45000
```

`LOCAL_AI_BASE_URL` satırındaki ifade yalnızca bir yer tutucudur; gerçek adres repoya
yazılmaz. Staging/production için yalnız onaylı private tunnel, VPN veya gateway
kullanılır. Ollama'nın `11434` portu internete açılmaz; production adapter doğrudan
`11434` ve loopback adreslerini reddeder. Gateway protokolünde `LOCAL_AI_MODEL`
istek gövdesine eklenir ve varsa gateway'in yanıtladığı modelle doğrulanır.

`AI_PROVIDER` ve mevcut OpenAI/Anthropic credentials cloud fallback olarak kalır.
Bunlar değiştirilmez ve hiçbir zaman rapora/loga alınmaz.

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
| Local yanıt boş/geçersiz veya farklı model bildirir | Cloud provider'a geçilir; redakte neden kaydedilir |
| Local routing disabled | Cloud provider doğrudan kullanılır |
| Local ve cloud credential eksik | `credential_not_configured`; PASS üretilmez |

## Gerçek ortam kabulü

Gerçek gateway bağlantısı ancak onaylı private endpoint runtime secret/config
alanında tanımlandıktan sonra staging'de çalıştırılır. Kabul sırası:

1. Hassas olmayan sentetik istekle `provider=local`, `route=LOCAL`,
   `model=qwen3:8b` ve gateway run referansını doğrula.
2. Yalnız izole staging yapılandırmasında Local gateway erişimini durdur; aynı
   isteğin mevcut cloud provider'ında tamamlandığını ve redakte fallback nedenini
   doğrula.
3. Gateway erişimini geri aç; sonraki isteğin tekrar Local'e gittiğini doğrula.

Canlı kullanıcı trafiği veya paylaşılan gateway bu test için kesilmez. Gerçek
bağlantı ve üç adımın kanıtı olmadan entegrasyon `BLOCKED`/`NOT_RUN` kalır.
2026-10-01 tarihinde bu çalışma ortamında onaylı endpoint/runtime secret mevcut
değildi; canlı test çalıştırılmadı.
