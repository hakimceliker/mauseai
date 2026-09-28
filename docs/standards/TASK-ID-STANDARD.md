# MOUSE Görev Kimliği (TASK-ID) Standardı

## 1. Tanım ve Amaç

Her görev, branch, PR ve delivery raporunun benzersiz bir kimliği olmalıdır. Bu standart, görevlerin sistematik biçimde takip edilebilir, aranabilir ve koordine edilebilir olmasını sağlar.

## 2. Format

```
MOUSE-NNN
```

Burada:
- `MOUSE` — Proje sabit kodu
- `-` — Ayraç
- `NNN` — 3-5 haneli sıra numarası (001, 002, ..., 99999)

## 3. Örnekler

| Görev | Açıklama |
|---|---|
| `MOUSE-001` | Aşama 0, Merkezi Hazırlık, D01 Belgesi |
| `MOUSE-012` | Aşama 1, Task Registry |
| `MOUSE-100` | Aşama 1, Faz 1 Repository Skeleton |
| `MOUSE-200` | Aşama 2, Faz 1 Delivery |

## 4. Atama Kuralları

### Branch Adlandırması

```
feat/MOUSE-NNN-short-description
```

Örneğin:
- `feat/MOUSE-001-central-preparation`
- `feat/MOUSE-012-task-registry`
- `feat/MOUSE-100-repo-skeleton`

Kısaltmalı ve anlaşılır: maksimum 50 karakter toplam.

### Issue Başlığı

```
MOUSE-NNN: [Başlık] 
```

Örneğin:
- `MOUSE-001: Central Preparation Documents`
- `MOUSE-012: Task Registry Implementation`

### Pull Request Başlığı

```
MOUSE-NNN — [Başlık]
```

Örneğin:
- `MOUSE-001 — Central Preparation Documents`
- `MOUSE-012 — Task Registry Implementation`

## 5. Sira Numarası Ataması

### Otoritesi
Proje sorumlusu (koordinatör) / Orchestrator.

### Kural
- Her görev seri numarasını kendinden sonraki boş numarayı alır.
- Geri dönüş (reuse) olmaz.
- Kayıt: [Task Registry](../D12-task-registry.md)

### Statüsü

```json
{
  "task_id": "MOUSE-001",
  "title": "Central Preparation",
  "status": "in_progress|completed|blocked",
  "assigned_to": "gpt|claude|user|tool",
  "phase": 0,
  "stage": "Aşama 0",
  "created_at": "2026-09-28",
  "completed_at": "...",
  "pr_url": "https://github.com/hakimceliker/mauseai/pull/...",
  "evidence": []
}
```

## 6. Yaşam Döngüsü

1. **Oluşturma**: Koordinatör MOUSE-NNN atayarak GitHub Issue açar.
2. **Başlatma**: Sorumlu branch acar: `feat/MOUSE-NNN-...`
3. **Geliştirme**: Kod/belge yazılır.
4. **PR**: `MOUSE-NNN — [Title]` başlığında PR açılır.
5. **Gözden Geçirme**: Claude (ve gerekirse diğerleri) incelemesi.
6. **Merge**: Ana branch'e birleştirilir.
7. **Tamamlama**: Task Registry güncellenir, delivery raporu yazılır.

## 7. Kaydı

Her görev [Task Registry](../D12-task-registry.md) içinde bir giriş olmalıdır:
- Taşı, durum, atayan, tamamlanan tarih
- PR bağlantısı
- Evidence (kanıt) bağlantıları

## 8. Rezervasyon

Gelecek görevler için ön-ayrılan numaralar:

| Aralık | Amaç |
|---|---|
| MOUSE-001 to MOUSE-010 | Aşama 0 — Merkezi Hazırlık |
| MOUSE-011 to MOUSE-050 | Aşama 1 — Temel Kurulum (14 Faz) |
| MOUSE-051 to MOUSE-100 | Aşama 2 — MVP Geliştirme |
| MOUSE-101+ | Aşama 3 ve ötesi |

## 9. Kurallar

- **Tekrarlama yok**: Bir MOUSE-NNN verildikten sonra başka bir görev için yeniden kullanılamaz.
- **Boş numaralar**: Gereksiz görevler için numaralar atlanabilir.
- **Açıklık**: Her MOUSE-NNN benzersiz bir görev/PR/branch ilişkisine karşılık gelir.
- **Kasa duyarlılığı**: Tüm referanslarda büyük harf (MOUSE, değil Mouse veya mouse).

## 10. Araçlar ve Otomasyon

- **GitHub Actions**: Proje şablonlarında otomatik kontrol (branch adı MOUSE-NNN formatında mı?)
- **Task Registry**: Merkezi kontrol listesi
- **PR Template**: MOUSE-NNN başlığını zorunlu tutar

## Kaynaklar

- [D12 - Task Registry](../D12-task-registry.md)
- [D13 - Change Control](../D13-change-control.md)
- [PR-CI-RULES](./PR-CI-RULES.md)
- [DELIVERY-TEMPLATE](../DELIVERY-TEMPLATE.md)
