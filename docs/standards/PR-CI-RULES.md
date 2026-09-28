# MauseAI Pull Request ve CI/CD Kuralları

## 1. Genel İlkeler

Tüm kodun main branch'e yazılması **sadece PR üzerinden** geçer. CI kontrolleri başarısız olursa merge yapılmaz.

```
Branch → PR → Review → CI Green → Approve → Merge → Main
```

## 2. Branch Adlandırması

### Kod Branches (Feature, Fix)

```
feat/MOUSE-NNN-short-description
fix/MOUSE-NNN-short-description
docs/MOUSE-NNN-short-description
test/MOUSE-NNN-short-description
```

Kurallar:
- Küçük harf ve tire (kebab-case)
- MOUSE-NNN ile başla (görev ID)
- Max 50 karakter toplam
- Açık ve kısa açıklama

Örnekler:
- ✓ `feat/MOUSE-020-repo-skeleton`
- ✓ `fix/MOUSE-042-router-bug`
- ✗ `feature/add-new-stuff`
- ✗ `work-in-progress`

### Aşama 0 Branches

```
stage/0-central-preparation
feat/MOUSE-001-central-prep-docs
```

### Release Branches

```
release/v1.0.0
hotfix/MOUSE-NNN-critical-fix
```

## 3. Pull Request Kuralları

### PR Başlığı

```
MOUSE-NNN — [İngilizce başlık]
```

Örnekler:
- ✓ `MOUSE-020 — Repository Skeleton Setup`
- ✓ `MOUSE-070 — AI Router Implementation`
- ✗ `fix bug`
- ✗ `update stuff`

### PR Açıklaması (Body)

Şablon:

```markdown
## Description
[Ne yapıldığı, neden yapıldığı — 2-3 cümle]

## Changes
- [Dosya 1: Ne yaptı]
- [Dosya 2: Ne yaptı]
- [Dosya 3: Ne yaptı]

## Tests
- [Test 1 yeni: Coverage %]
- [Test 2 yeni: Coverage %]
- npm test: ✓ 123 passing

## Checklist
- [ ] Lint: npm run lint
- [ ] TypeCheck: npm run typecheck
- [ ] Tests: npm run test
- [ ] Build: npm run build
- [ ] No secrets in commits
- [ ] README updated (if needed)
- [ ] CHANGELOG updated (if needed)

## Evidence
- CI: [link to GitHub Actions run]
- Test coverage: [screenshot or report]

## Related
Closes #123 (Issue)
Relates to MOUSE-019 (Parent task)
Blocked by MOUSE-021 (Dependency)
```

### PR Checklist Örneği

```markdown
- [x] npm run lint — 0 errors
- [x] npm run typecheck — 0 errors
- [x] npm run test — 479 passing, 0 failing
- [x] npm run build — success
- [x] npm audit — no vulnerabilities
- [x] No secrets in code (git log -S 'sk_' etc.)
- [x] Code review: Claude approved
- [x] CHANGELOG.md updated
- [ ] Performance benchmark (if applicable)
```

## 4. Commit Kuralları

### Commit Mesajı Formatı

```
<type>(<scope>): <subject>

<body>

<footer>

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SZAKusGjc8oqkHLFVzWJio
```

### Type Kategorileri

| Type | Kullanım | Örnek |
|---|---|---|
| `feat` | Yeni özellik | `feat(router): add GPT-Claude selector` |
| `fix` | Hata düzeltmesi | `fix(costs): handle zero-value metering` |
| `docs` | Belge | `docs(standards): add TASK-ID format` |
| `test` | Test ekleme | `test(router): add edge case coverage` |
| `refactor` | Kod düzenlemesi | `refactor(auth): simplify JWT validation` |
| `perf` | Performance | `perf(db): add index on task_id` |
| `chore` | Maintenance | `chore: update dependencies` |
| `ci` | CI/CD değişikliği | `ci: add secret-scan workflow` |

### Scope Kategorileri

```
router, orchestrator, costs, auth, conversations, offers, domain, utils, ci, docs
```

### Body Yazı Kuralları

- İmperatif, şimdiki zaman: "add" değil "added"
- Neden yapıldığını açıkla, nasıl değil
- İlgili issue'ları referans et: `Closes #123`
- Eski davranıştan farkı belirt

Örnek:

```
feat(router): add GPT-Claude selector with cost optimization

This commit implements the AI router that selects between GPT and Claude
based on task type, cost budget, and latency requirements. Routing rules
are defined in domain contracts and can be updated without redeployment.

Closes #45
Related to MOUSE-070
```

### Yazan Bilgisi (Attribution)

Her commit sonunda:

```
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SZAKusGjc8oqkHLFVzWJio
```

## 5. CI/CD Pipeline

### Workflow Dosyaları

```
.github/workflows/
├─ lint.yml          # ESLint, Prettier
├─ typecheck.yml     # TypeScript compiler
├─ test.yml          # Jest, coverage
├─ build.yml         # npm run build
├─ audit.yml         # npm audit, secret scan
└─ deploy.yml        # (manual approval gerekli)
```

### Her Step'te Failken Merge Yapılamaz

| Step | Aracı | Failure → PR Block |
|---|---|---|
| **Lint** | ESLint | ✓ Blocking |
| **TypeCheck** | TypeScript | ✓ Blocking |
| **Test** | Jest | ✓ Blocking (coverage %80+) |
| **Build** | Next.js | ✓ Blocking |
| **Security Audit** | npm audit | ✓ Blocking |
| **Secret Scan** | git-secrets / semgrep | ✓ Blocking |
| **Coverage Report** | jest-coverage | ⚠ Warning (threshold %80) |

### Lint Job Örneği

```yaml
name: Lint
on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run lint
      - name: Annotate PR
        if: failure()
        run: |
          echo "Lint failed. Fix errors and push again."
          exit 1
```

### TypeCheck Job Örneği

```yaml
name: TypeCheck
on: [pull_request]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run typecheck
```

### Test Job Örneği

```yaml
name: Test
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test -- --coverage
      - name: Check Coverage
        run: |
          if grep -q '"lines".*"[0-7][0-9]\.' coverage/coverage-summary.json; then
            echo "Coverage below 80%"
            exit 1
          fi
      - uses: codecov/codecov-action@v3
```

### Security Audit Job Örneği

```yaml
name: Security Audit
on: [pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm audit --audit-level=moderate
      - name: Secret Scan
        run: |
          git log -p -S 'sk_test_|sk_live_|pk_test_|pk_live_' && exit 1 || true
          git log -p -S 'OPENAI_API_|ANTHROPIC_API_' && exit 1 || true
```

### Deploy Job Örneği (Manual Approval)

```yaml
name: Deploy
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - name: Deploy to Vercel
        run: vercel deploy --prod --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 6. Review Süreci

### Code Review Kuralları

1. **Her PR Claude tarafından gözden geçirilir**
   - Mimari tutarlılık
   - Security gaps
   - Test coverage
   - Kod kalitesi
   - Belge tamamlığı

2. **Approval Kuralı**
   - Claude: ✓ Approve zorunlu
   - Human/Owner: ✓ Merge yetkisi
   - CI: ✓ Tüm checks green

3. **Changes Requested**
   - Claude yorum yazarsa, PR'ı "Changes requested" kılabilir
   - Yazar güncellemeli, Claude re-review eder

4. **Conversation Resolution**
   - Yrum çözüldüğünde, reviewer resolve eder
   - Veri kaybı yok, tarih kalır

### Review Checklist (Claude)

```markdown
## Architecture
- [ ] Mimari kurallara uygun mu?
- [ ] Orchestrator integre edildi mi?
- [ ] Domain contracts kullanıldı mı?

## Security
- [ ] Secret'lar hardcoded mı?
- [ ] API keys exposed mu?
- [ ] SQL injection risk var mı?
- [ ] RLS policies doğru mu?

## Quality
- [ ] Code duplications var mı?
- [ ] Tests coverage yeterli mi?
- [ ] Error handling var mı?
- [ ] TypeScript types doğru mu?

## Documentation
- [ ] Code comments yeterli mi?
- [ ] README güncellenmiş mi?
- [ ] API docs eklendi mi?
- [ ] CHANGELOG güncellenmiş mi?

## Testing
- [ ] npm test: %80+ coverage?
- [ ] npm run typecheck: ✓?
- [ ] npm run lint: ✓?
- [ ] npm run build: ✓?
```

## 7. Merge Kuralları

### Merge Koşulları

Tüm şunlar yerine getirilmelidir:

1. ✓ Branch main'den oluşturulmuş
2. ✓ Branch adı `feat/MOUSE-NNN-*` formatında
3. ✓ Commit'ler `<type>(<scope>):` formatında
4. ✓ PR başlığı `MOUSE-NNN — [Title]` formatında
5. ✓ Lint pass (`npm run lint`)
6. ✓ TypeCheck pass (`npm run typecheck`)
7. ✓ Tests pass (`npm run test`, %80+ coverage)
8. ✓ Build pass (`npm run build`)
9. ✓ Audit pass (`npm audit`)
10. ✓ Secret scan pass (no exposed keys)
11. ✓ Claude approval
12. ✓ No merge conflicts

### Merge Stratejisi

```
Squash: Faz PRs (Clean history)
Merge Commit: Main releases (Traceability)
Rebase: Hotfixes (Linear history)
```

Öneride: **Squash** (feature esnasında clean history)

## 8. Rollback Kuralı

Eğer merge sonrası hata bulunursa:

```
1. CI'da hata alır → alert
2. GitHub Issue aç: "REGRESSION: ..."
3. Yazar acil PR açar: `hotfix/MOUSE-NNN-regression`
4. CI green → merge
5. Post-mortem yapılır
```

## 9. Release Versioning

Semantic Versioning: `MAJOR.MINOR.PATCH`

```
v0.0.1 → v0.1.0 → v1.0.0 → v1.1.0 → ...
```

- MAJOR: Breaking change (DB migration, API break)
- MINOR: New feature (backward compatible)
- PATCH: Bug fix

CHANGELOG.md içinde tüm değişiklikler kaydedilir.

## 10. Templates

### PR Template Dosyası

Lokasyon: `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
# MOUSE-NNN — [Başlık]

## Description
[Ne yapıldığı ve neden]

## Changes
- [ ] ...

## Tests
- [ ] npm test: ...
- [ ] npm run typecheck: ...
- [ ] npm run lint: ...
- [ ] npm run build: ...

## Related
Closes #123
```

### Issue Template

Lokasyon: `.github/ISSUE_TEMPLATE/task.md`

```markdown
# MOUSE-NNN: [Başlık]

## Description
[Görevin tanımı]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Related
- Phase: [faz-N]
- Blocked by: [MOUSE-XYZ]
```

## 11. SLA / Timing

| Event | SLA | Owner |
|---|---|---|
| PR → Review | 4 saat | Claude |
| Review → Approval/Changes | 4 saat | PR author |
| Approval → Merge | 1 saat | Main maintainer |
| Merge → Deploy (auto) | 30 dk | CI/CD |
| Merge → Production (manual) | 2 saat | Ops |

## 12. Monitoring & Alerts

- Merge başarısızlığı → Slack alert
- Test failure → PR comment
- Coverage drop → PR warning
- Secret detected → Immediate block + alert
- Deploy failure → Pagerduty alert

## Kaynaklar

- [TASK-ID-STANDARD.md](./TASK-ID-STANDARD.md)
- [PHASE-NAMING-STANDARD.md](./PHASE-NAMING-STANDARD.md)
- [FILE-OWNERSHIP.md](./FILE-OWNERSHIP.md)
- [SECRET-LAW.md](./SECRET-LAW.md)
- [D01 - Final Constitution](../D01-final-constitution.md)
