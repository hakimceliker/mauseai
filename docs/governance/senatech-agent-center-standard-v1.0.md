# Senatech Ajan Merkezi Çalışma Standardı v1.0

Bu belge MauseAI’nin Senatech Ajan Merkezi çalışma modeline uyum sınırını tanımlar.

## Zorunlu çalışma modeli

Her istek merkezi Control Plane üzerinden kimlik, proje, tenant, risk, capability, model, validator ve audit bilgileriyle yürütülür. Yerel runtime önceliklidir. Knowledge Fabric kullanılıyorsa kaynak ve provenance sonuçla birlikte taşınır.

Kaynak ve çalışma zinciri:

```text
GitHub Source of Truth
  -> GitLab secondary CI / private pipeline / backup mirror
  -> Forgejo read-only mirror / DR / local CI
  -> Windows/Docker local runtime
  -> Ollama/Qwen local-first
  -> NVIDIA NIM / OpenAI / Claude / Cloudflare fallback
  -> Doctor / Observability / Watchdog / Recovery
  -> Judge / Evidence / Audit / Human Approval
```

## Proje sahibi kabul listesi

- `senatech.project.yaml` manifesti güncel olmalı.
- Proje sahibi, teknik sahibi, karar sahibi, veri sınıfı ve risk seviyesi atanmış olmalı.
- `/api/health` ve `/api/health/ready` kanıtlanmalı.
- Gerçek E2E akışı, yalnızca mock veya statik doküman değil, kanıt zinciriyle doğrulanmalı.
- Secret değerleri kaynak koduna, commitlere ve loglara yazılmamalı.
- High/Critical, finansal, silme, dış iletişim, production, DNS ve yetki değişiklikleri insan onayı olmadan yürütülmemeli.
- Bu standart README’den bağlanmalı.

## Kabul kararı

Eksik bilgi, yetki veya canlı bağımlılık `BLOCKED` olarak raporlanır. Ajan kendi işine nihai PASS veremez. `CLOSED/PASS` için doğru branch/SHA, başarılı gerekli CI/test, yeterli evidence, bağımsız review ve gerekiyorsa Judge doğrulaması gerekir.

Bu kayıt teknik uyum çerçevesidir; kurumsal politika onayının veya insan sahiplik atamasının yerine geçmez.
