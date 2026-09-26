# MouseAI Son Akış ve İş Zekâsı Diyagramı

## Ana iş akışı

```mermaid
flowchart LR
    A[Kurumsal hedef veya müşteri e-postası] --> B[Kimlik ve tenant kontrolü]
    B --> C[Risk bütçe ve politika kontrolü]
    C -->|engelli| X[BLOCKED audit ve bildirim]
    C -->|uygun| D[MouseAI Orchestrator]
    D --> E[Hedefi görev grafiğine ayır]
    E --> F[Araç ve model yönlendirici]
    F --> G[GPT veya uzman model]
    F --> H[Claude denetim]
    F --> I[Connector ve masaüstü aracı]
    G --> J[Inngest dayanıklı worker]
    H --> J
    I --> J
    J --> K[Step idempotency ve retry]
    K --> L[Checkpoint]
    L --> M[Maliyet kaydı]
    M --> N[Audit ledger]
    N --> O{Sonraki adım}
    O -->|devam| J
    O -->|onay gerekli| P[İnsan onay kapısı]
    P -->|onay| J
    P -->|ret| X
    O -->|tamam| Q[Nihai rapor ve müşteri cevabı]
    Q --> R[Dashboard ve iş zekâsı]
    R --> S[Politika ve plan iyileştirmesi]
    S --> D
    J -.-> A1[Müşteri MouseAI Agent]
    A1 --> A2[Müşteri Docker veya sunucu ortamı]
    A2 --> A3[Yerel connector ve dosyalar]
    A3 --> J
```

## Görev ve araç paylaşımı

```mermaid
flowchart TB
    U[Ürün sahibi] --> GH[GitHub Issue ve kabul kriteri]
    GH --> GPT[GPT Kodex uygulama]
    GPT --> TEST[Test typecheck build güvenlik]
    TEST --> PR[Pull Request]
    PR --> CLAUDE[Claude bağımsız review]
    CLAUDE -->|değişiklik isteği| GPT
    CLAUDE -->|uygun| HUMAN[İnsan merge onayı]
    HUMAN --> MAIN[main dalı]
    MAIN --> DEPLOY[Vercel Supabase Inngest deployment]
    DEPLOY --> OBS[Langfuse Sentry PostHog ve audit]
    OBS --> BI[İş zekâsı panosu]

    GPT -.-> CURSOR[Cursor masaüstü editörü]
    GPT -.-> CODE[Claude Code terminal yardımcısı]
    GPT -.-> COPILOT[Copilot satır içi öneri]
    MAIN -.-> Figma[Figma Canva tasarım]
    MAIN -.-> SEO[Analytics Search Console vidIQ]
```

## İş zekâsı geri besleme döngüsü

```mermaid
flowchart LR
    A[Task ve workflow olayları] --> B[Audit ve maliyet verisi]
    C[AI token ve model verisi] --> B
    D[Connector başarı hata süre verisi] --> B
    E[Müşteri e-posta ve teklif sonucu] --> B
    B --> F[Veri modeli ve tenant izolasyonu]
    F --> G[Operasyon KPI’ları]
    F --> H[Finans KPI’ları]
    F --> I[Kalite ve güvenlik KPI’ları]
    F --> J[Müşteri ve satış KPI’ları]
    G --> K[Karar motoru]
    H --> K
    I --> K
    J --> K
    K --> L[Model seçimi maliyet politikası kapasite ve görev önceliği]
    L --> M[Orchestrator ayarları]
    M --> A
```

## İş zekâsı göstergeleri

| Alan | Temel göstergeler | Karar |
|---|---|---|
| Operasyon | Tamamlanma oranı, bekleme süresi, retry oranı, checkpoint’ten devam oranı | Worker kapasitesi ve öncelik |
| Maliyet | Task başı maliyet, model başı maliyet, tenant kredi tüketimi, bütçe aşımı | Model ve araç yönlendirme |
| Kalite | Hata oranı, review değişiklik oranı, müşteri memnuniyeti, tekrar iş oranı | Prompt, politika ve denetim |
| Güvenlik | BLOCKED oranı, yetkisiz erişim denemesi, secret tarama sonucu, L3/L4 onay sayısı | Politika sertleştirme |
| Satış | Tekliften dönüşüm, cevap süresi, indirim oranı, kaybedilen talepler | Teklif ve müşteri asistanı |
| SEO | Organik trafik, dönüşüm, içerik üretim maliyeti, anahtar kelime kazanımı | İçerik ve reklam planı |

## Akışın çalışma sırası

1. Kullanıcı veya müşteri e-postası sisteme girer.
2. Kimlik, tenant, rol, risk ve bütçe kontrol edilir.
3. Orchestrator hedefi görev grafiğine çevirir.
4. GPT/Kodex üretim veya planlama görevini yapar.
5. Claude denetim, güvenlik ve kalite görevini yapar.
6. Gerekirse connector veya masaüstü aracı kontrollü olarak çağrılır.
7. Inngest worker işi retry, checkpoint ve idempotency ile yürütür.
8. Maliyet, audit, kalite ve sonuç verileri kaydedilir.
9. Yüksek riskli işlemde insan onayı alınır.
10. Nihai çıktı müşteriye veya kullanıcıya gönderilir.
11. İş zekâsı katmanı sonucu analiz eder ve sonraki görev politikasını iyileştirir.

## Başlangıç noktası

İlk canlı olmayan demo şu senaryodur:

`hedef gir → task oluşur → worker çalışır → mock AI seçilir → checkpoint yazılır → maliyet ve audit oluşur → dashboard sonucu gösterir`

Bu senaryo geçmeden gerçek müşteri e-postası, ödeme, WhatsApp veya canlı masaüstü işlemi açılmaz.

## Hibrit yürütme eklemesi

İş yükü, `MouseAI Agent` üzerinden müşterinin Docker, Kubernetes, masaüstü veya özel bulut ortamında çalıştırılabilir. Cloud kontrol düzlemi task, politika, lisans, audit özeti ve iş zekâsını korur; Agent ise müşterinin yerel API, CRM, ERP, dosya ve masaüstü işlemlerini yürütür. Ayrıntılı karar `customer-hosted-agent-architecture.md` içindedir.
