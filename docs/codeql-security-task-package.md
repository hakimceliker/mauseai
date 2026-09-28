# MouseAI CodeQL Güvenlik Görev Paketi

## Amaç

JavaScript/TypeScript production kodunu GitHub CodeQL ile düzenli ve kanıtlanabilir biçimde taramak. CodeQL sonucu, insan güvenlik incelemesinin yerine geçmez; yalnızca otomatik güvenlik kapısıdır.

## Çalıştırma kapsamı

- Pull request açıldığında.
- `main` branch’e push sonrasında.
- Haftalık zamanlanmış taramada.
- Sorgu paketi: `security-extended`.
- Üretim kaynakları taranır; `.next`, `coverage`, `dist`, `node_modules`, `docs` ve `tests` hariç tutulur.

## Görev dağılımı

### GPT/Codex

1. `.github/workflows/codeql.yml` dosyasını değiştirmeden önce workflow sözdizimini doğrular.
2. `.github/codeql/codeql-config.yml` kapsamını güncel tutar.
3. CodeQL alertlerini önem derecesine göre sınıflandırır.
4. Gerçek bulgu varsa düzeltme branch’i açar; main’e doğrudan push yapmaz.
5. Her düzeltmeyi test, commit, PR ve CI kanıtı ile teslim eder.

Örnek doğrulama:

```powershell
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

### Claude/Copilot

1. Workflow triggerlarını ve minimum GitHub izinlerini inceler.
2. CodeQL alertinin gerçek bulgu mu, false positive mi olduğunu değerlendirir.
3. Secret, tenant izolasyonu, SSRF, injection, unsafe deserialization ve auth bypass risklerini ayrıca kontrol eder.
4. Sonucu `APPROVE`, `CHANGES_REQUESTED` veya `BLOCKED` olarak verir.

### Kullanıcı

- GitHub güvenlik/branch protection onaylarını verir.
- Secret veya provider değerlerini CodeQL çıktısına yazmaz.
- Gerçek müşteri verisiyle tarama yapılmasına izin vermez.

## Kabul kriterleri

- [ ] CodeQL workflow PR üzerinde çalıştı.
- [ ] `javascript-typescript` analizi başarılı oldu.
- [ ] `security-extended` sorguları kullanıldı.
- [ ] CodeQL’de yeni high/critical alert yok.
- [ ] Alert varsa her biri için triage veya düzeltme PR’ı var.
- [ ] `security-events: write` yalnızca CodeQL workflow’unda mevcut.
- [ ] Secret değerleri log, artifact, issue veya rapora yazılmadı.
- [ ] CodeQL sonucu insan güvenlik incelemesiyle birlikte değerlendirildi.

## Kanıt formatı

```text
Repository: hakimceliker/mauseai
Workflow: CodeQL
Commit: <sha>
Run: <github-actions-url>
Language: javascript-typescript
Queries: security-extended
Alerts: 0 veya triage listesi
Human review: APPROVE / CHANGES_REQUESTED / BLOCKED
Final: PASS / FAIL
```

## Engelleme kuralı

CodeQL çalışmadıysa, sonuç yüklenmediyse veya high/critical alert açık kaldıysa güvenlik kapısı PASS sayılmaz. Credential gerektiren bir düzeltme gerekiyorsa değer istenmez; `credential_not_configured` olarak raporlanır.
