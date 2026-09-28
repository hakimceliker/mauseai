# MauseAI Dosya Sahipliği ve Yazma Yetkileri

## 1. Tanım ve Amaç

Hangi araç / kişi hangi dosyaya yazabileceğini tanımlar. Amacı:
- Çatışmaları ve yanlış yazmaları önlemek
- Mekansal sahiplik ve sorumluluk tanımlamak
- PR ve review akışını optimize etmek

## 2. Dosya Kategorileri

| Kategori | Sahip | Yazabilecekler | Notlar |
|---|---|---|---|
| **Kod (src/)** | GPT / Codex | GPT, sonra Claude (review) | PR → main |
| **Test (test/, spec/)** | GPT / Codex | GPT → PR | Claude review zorunlu |
| **Belge (docs/)** | GPT + Claude | GPT (draft) → Claude (review) → main | Ortak yazan |
| **Standart (docs/standards/)** | Koordinatör | GPT + Claude (draft) | Onay almış sürüm → main |
| **CI/CD (.github/)** | GPT / Ops | GPT → Claude (review) | Kritik — review zorunlu |
| **Kuruluş (.gitignore, package.json)** | GPT | GPT (öneri) → Human (onay) | Minimum değişiklik |
| **Dış entegrasyon (Supabase, Inngest)** | GPT | GPT (config) + Human (secret) | Secret → env panel, asla code |
| **Secret (env, key, token)** | Ortam Panel | **Hiç kod içinde yazılmaz** | `.env.local` (gitignore) veya panel |

## 3. Araçlar ve Sahiplik Haritası

### Kod Yazma (src/)

```
GPT / Codex → Draft
  ↓
PR açma (feat/MOUSE-NNN-...)
  ↓
Claude → Review (diff, mimari, test)
  ↓
CI → Test, Lint, TypeCheck, Build
  ↓
Human → Approve & Merge
```

**Kural**: GPT asla main branch'e doğrudan yazamaz. Her yazma PR üzerinden geçer.

### Test Yazma (test/, spec/)

```
GPT → Test code
  ↓
PR + Claude review (coverage, mantık)
  ↓
CI → npm test (green gerekli)
  ↓
Merge to main
```

**Kural**: %80+ code coverage hedefi.

### Belge Yazma (docs/)

```
GPT → Draft (D01, D12, ...)
  ↓
Claude → Review (tutarlılık, eksik, risk)
  ↓
PR + Human/Claude approve
  ↓
Merge to main
```

**Kural**: Teknik belgeler GPT tarafından, gözden geçiş Claude tarafından.

### Standart Yazma (docs/standards/)

```
Koordinatör → Define (örneğin, "TASK-ID formatı şu olsun")
  ↓
GPT → Draft standardı
  ↓
Claude + Human → Gözden geçir
  ↓
Approve → main
```

**Kural**: Standartlar değişmez. Yeni standart gerekirse, eski versyon arşivlenir.

### Secret ve Ortam Değişkenleri

```
Secret → NEVER code commit
         → .env.local (gitignore)
         → OR Vercel/Render panel
```

**Kural**: `npm audit` tüm secrets bulacak şekilde konfigüre edilir. Failure on secret detection.

### CI/CD Kuralları (.github/workflows)

```
GPT → Workflow draft
  ↓
Claude + Human → Security review (no curl secrets, etc.)
  ↓
PR + Approve
  ↓
Merge
```

**Kural**: Kritik jobs (deploy, secret-scan) manuel onay gerekli.

## 4. Yazma Yetkileri (Role-Based)

| Rol | Dosyalar | PR | Main Write | Direct Write |
|---|---|---|---|---|
| **GPT** | src/, test/, docs/ | ✓ (oluştur) | ✗ | ✗ |
| **Claude** | docs/ (review) | ✓ (review only) | ✓ (merge) | ✗ |
| **Human/Owner** | CI, standart, secret | ✓ | ✓ | ✓ |
| **Supabase Console** | RLS policies | — | — | ✓ |
| **Inngest Dashboard** | Event definitions | — | — | ✓ |
| **Vercel/Render Panel** | env secrets | — | — | ✓ |

## 5. Ortak Yazma Protokolü (GPT + Claude)

Belge yapıldığında her iki araç da katkıda bulunur:

```markdown
# D01 — Final Constitution

## Yazarlar
- **GPT / Codex**: Ana yapı, teknik detaylar (Sections 1-5)
- **Claude**: Security review, risk assessment (Sections 6-8)
- **Koordinatör**: Onay ve publish

## Dosya Yaşam Döngüsü
1. GPT → Draft (D01-draft.md)
2. Claude → Review + Feedback
3. GPT → Update → D01.md
4. Claude → Final check
5. PR → main
6. Merge → production
```

## 6. Dosya Listeleri ve Sorumluları

### Kod Dosyaları (Sahip: GPT)

```
src/
  ├─ orchestrator/       [GPT] Task CRUD, routing
  ├─ domain/             [GPT] Data models, validators
  ├─ ai-router/          [GPT] GPT/Claude seçimi
  ├─ costs/              [GPT] Cost metering
  ├─ conversations/      [GPT] Chat history
  ├─ offers/             [GPT] Pricing engine
  ├─ auth/               [GPT] JWT, RLS (Supabase)
  └─ utils/              [GPT] Helpers, constants
```

### Test Dosyaları (Sahip: GPT → Claude review)

```
test/
  ├─ unit/               [GPT] Function tests
  ├─ integration/        [GPT] API tests
  └─ e2e/                [GPT] Cypress/Playwright
```

### Belge Dosyaları (Sahip: GPT + Claude)

```
docs/
  ├─ D01-*.md            [GPT draft] → [Claude review]
  ├─ D12-*.md            [GPT draft] → [Claude review]
  ├─ D13-*.md            [GPT draft] → [Claude review]
  ├─ D14-*.md            [GPT draft] → [Claude review]
  ├─ D15-*.md            [GPT draft] → [Claude review]
  ├─ D20-*.md            [GPT draft] → [Claude review]
  ├─ DELIVERY-TEMPLATE.md [GPT draft] → [Claude review]
  │
  └─ standards/
      ├─ TASK-ID-STANDARD.md      [GPT]
      ├─ PHASE-NAMING-STANDARD.md [GPT]
      ├─ FILE-OWNERSHIP.md        [GPT]
      ├─ PR-CI-RULES.md           [GPT]
      └─ SECRET-LAW.md            [GPT]
```

### CI/CD Dosyaları (Sahip: GPT → Claude + Human review)

```
.github/
  ├─ workflows/
  │  ├─ lint.yml         [GPT] linting
  │  ├─ typecheck.yml    [GPT] TypeScript
  │  ├─ test.yml         [GPT] Jest
  │  ├─ build.yml        [GPT] npm run build
  │  ├─ audit.yml        [GPT] npm audit (secret scan)
  │  └─ deploy.yml       [GPT] (deployment, manual approval)
  │
  └─ TASK-ISSUE-TEMPLATE.md [GPT]
```

### Kuruluş Dosyaları (Sahip: GPT → Human onay)

```
/
  ├─ package.json        [GPT] (minor) → [Human] (major deps)
  ├─ package-lock.json   [Otomatik]
  ├─ tsconfig.json       [GPT] (minor) → [Human] (breaking)
  ├─ .eslintrc.json      [GPT]
  ├─ .gitignore          [GPT + Human] (secrets, build artifacts)
  ├─ .env.example        [GPT] (template, NO secrets)
  ├─ .env.local          [Gitignore] (user, NEVER commit)
  └─ README.md           [GPT + Claude]
```

### Ortam / Operasyon (Sahip: Human / Panel)

```
Vercel/Render Environment Variables
├─ DATABASE_URL         [Panel] (Supabase)
├─ OPENAI_API_KEY       [Panel] (secret)
├─ ANTHROPIC_API_KEY    [Panel] (secret)
└─ INNGEST_API_KEY      [Panel] (secret)

Supabase Console
├─ RLS policies         [Human/GPT] (config as code → PR)
├─ Database schema      [GPT → PR] (migration)
└─ Secrets             [Panel] (never code)

Inngest Dashboard
├─ Event definitions    [GPT → PR as code]
└─ Scheduling           [Human manual]
```

## 7. PR Review Sorumluluğu

| Dosya Türü | Reviewer | Onay Kuralı |
|---|---|---|
| src/ | Claude | ✓ (kod kalitesi, güvenlik) |
| test/ | Claude | ✓ (coverage, mantık) |
| docs/ | Claude | ✓ (tutarlılık, eksik) |
| .github/workflows/ | Claude + Human | ✓ (security, deployment) |
| .env* | Human | ✓ (secret check) |
| package.json | Human | ✓ (major version changes) |

## 8. Çakışma Çözümü

Aynı dosya üzerinde GPT ve Claude yazacaksa:

```
Senaryo 1: D01-constitution.md
├─ GPT yazıyor (Sections 1-5: Architecture)
├─ Claude yazıyor (Sections 6-8: Security & Risks)
└─ PR → Claude'un final merge (her iki katkı kontrol eder)

Senaryo 2: src/router.ts
├─ GPT yazıyor (200 satır)
├─ Claude review eder (comments inline PR'de)
├─ GPT günceller → Claude re-review → Merge
└─ Çakışma: GPT günceller, Claude onaylar

Senaryo 3: .env.local
├─ GPT asla yazamaz
├─ Human → panel → env vars
├─ .env.example → GPT (sample, no secret)
```

## 9. Gitignore Kuralları

```gitignore
# Secrets (NEVER commit)
.env.local
.env*.local

# Build
dist/
build/
.next/

# Dependencies
node_modules/
.pnpm-lock.yaml
yarn.lock

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test coverage
coverage/

# Temporary
tmp/
temp/
```

## 10. Denetim (Audit)

Haftalık kontroller:

1. **Secret Scan**: `npm audit` + `git log -S '[A-Z0-9]{32}'` (api key patterns)
2. **Ownership Check**: PR'lerin doğru reviewers'ı var mı?
3. **File Permissions**: .gitignore eksik mi?
4. **Merge Authority**: kim merge etti? (Ana branch'e dokunmalar)

## 11. Acil Durum

Eğer GPT tarafından yazılmış dosya kritik bir hata içeriyorsa ve Human/Claude kontrol edemiyorsa:

1. Hata bildirimi → GitHub Issue
2. Human → hot-fix branch açar
3. PR → urgent label + immediate review
4. Merge → main + deployment
5. Post-mortem → review süreci iyileştirilir

## Kaynaklar

- [TASK-ID-STANDARD.md](./TASK-ID-STANDARD.md)
- [PR-CI-RULES.md](./PR-CI-RULES.md)
- [SECRET-LAW.md](./SECRET-LAW.md)
- [D01 - Final Constitution](../D01-final-constitution.md)
