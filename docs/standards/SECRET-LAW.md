# MauseAI Secret Kanunu (Secret Management Policy)

## 1. Temel Kural (The Golden Rule)

```
Secret ≠ Code
Secret = Environment Panel
```

**ASLA** aşağıdakilere secret yazma:
- ✗ Kod dosyaları (src/, test/)
- ✗ Commit message'ları
- ✗ GitHub Issue'lar
- ✗ PR açıklamaları
- ✗ Chat / Discord / Slack
- ✗ Documentation (docs/)
- ✗ .env.example, .env.local (gitignore'da olsa bile)

## 2. Secret Türleri

| Secret | Örnek | Saklayacak Yer |
|---|---|---|
| API Key | `sk_test_...`, `pk_live_...` | Vercel/Render Panel |
| Token | `Bearer eyJ...` | Vercel/Render Panel |
| Database URL | `postgresql://user:pwd@host/db` | Supabase Console |
| Private Key | `.pem` | Vercel Panel (File) |
| Webhook Secret | `whsec_...` | Inngest Console |
| Master Key | `master_key_...` | Vercel Panel |

## 3. Saklama Yerleri

### ✓ Doğru Saklama Yerleri

#### Vercel Environment Panel

```
https://vercel.com/dashboard/projects/[project]/settings/environment-variables

OPENAI_API_KEY=sk_test_...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
STRIPE_API_KEY=sk_test_...
INNGEST_API_KEY=...
```

Kuralları:
- Node.js runtime'da erişilebilir
- Deploy zamanı inject edilir
- Git'e yazılmaz
- Otomatik şifrelenmiş

#### Render Environment Panel

```
https://dashboard.render.com/[service]/environment

DATABASE_URL=postgresql://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

#### Supabase Console

```
https://supabase.com/dashboard/project/[project]/settings/api

API_KEY (anon)
SERVICE_ROLE_KEY
Database Password
```

Kuralları:
- JWT secret veya API key
- Supabase dashboard'da kalıcı
- Rotation policies uygulanır

#### Inngest Dashboard

```
https://app.inngest.com/

INNGEST_API_KEY
INNGEST_SIGNING_SECRET
```

#### 1Password / LastPass (Opsiyonel)

```
MauseAI / Production Credentials
├─ OPENAI_API_KEY
├─ ANTHROPIC_API_KEY
├─ DATABASE_URL
└─ ...
```

Kuralları:
- Backup amaçlı
- Acil durum erişimi
- 2FA korumalı

### ✗ Yanlış Saklama Yerleri

- ✗ `.env.local` (gitignore'da olsa bile, production'a push edilebilir)
- ✗ `.env` dosyası
- ✗ Config JSON
- ✗ Lambda environment (console'da görülür)
- ✗ Application logs
- ✗ README.md ("example only")
- ✗ GitHub Gists
- ✗ Email
- ✗ Slack/Discord

## 4. Local Development

### .env.local (Development Only)

```bash
# .env.local (Gitignore'da)

# Mock/Test credentials (geçerli değerler DEĞİL)
OPENAI_API_KEY=sk_test_MockKeyNotReal123
ANTHROPIC_API_KEY=sk-ant-MockKeyNotReal456

# Local database (Docker)
DATABASE_URL=postgresql://user:password@localhost:5432/mauseai_dev

# Vercel Tunnel (opsiyonel)
VERCEL_TUNNEL_TOKEN=...
```

### .env.example (Code Repository)

```bash
# .env.example (GIT'E YAZILIR - No secrets!)

# API Keys (Get from Vercel/Render environment)
OPENAI_API_KEY=sk_test_...
ANTHROPIC_API_KEY=sk-ant-...

# Database URL (Supabase)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Inngest
INNGEST_API_KEY=evt_...
INNGEST_SIGNING_SECRET=signkey_...

# Public URLs
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Loading

```typescript
// ✓ Doğru: Vercel'den gelen secret
const apiKey = process.env.OPENAI_API_KEY;

// ✗ Yanlış: Hardcoded
const apiKey = "sk_test_123...";

// ✗ Yanlış: .env dosyasından
import dotenv from 'dotenv';
dotenv.config(); // Production'da yapma!
```

## 5. Git Scan Kuralları

### Otomatik Kontrol (CI/CD)

```yaml
# .github/workflows/secret-scan.yml

name: Secret Scan
on: [push, pull_request]

jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Scan for exposed secrets
        run: |
          # Git log scan
          git log -p -S 'sk_test_' && exit 1 || true
          git log -p -S 'sk_live_' && exit 1 || true
          git log -p -S 'pk_test_' && exit 1 || true
          git log -p -S 'pk_live_' && exit 1 || true
          git log -p -S 'OPENAI_API_' && exit 1 || true
          git log -p -S 'ANTHROPIC_API_' && exit 1 || true
          git log -p -S 'Bearer eyJ' && exit 1 || true
          
          # Semgrep scan
          # npm install -g semgrep
          # semgrep --config=p/owasp-top-ten
```

### npm audit

```bash
$ npm audit

# Vulnerability scanning
# Privat key detection
# URL patterns check
```

### Manual Kontrol (PR Review)

Claude gözden geçirirken:

```markdown
## Security Review

- [ ] No hardcoded API keys?
- [ ] No database passwords?
- [ ] No private keys in code?
- [ ] No tokens in commits?
- [ ] .env.local in .gitignore?
- [ ] .env.example has no real values?
```

## 6. Secret Rotation

### Sık Rotation (Her 90 gün)

| Secret | Rotation | Owner |
|---|---|---|
| API Keys | 90 days | Ops |
| Tokens | 30 days | Ops |
| Database Password | 180 days | DBA |
| SSH Keys | 1 year | Ops |

### Rotation Prosedürü

```
1. New secret generate (Vercel/Supabase panel)
2. Set new secret in environment
3. Test in staging
4. Activate in production
5. Revoke old secret
6. Document in changelog
```

## 7. Secret Exposure — Acil Durum

Eğer secret yanlışlıkla expose olursa:

```
1. ⚠ IMMEDIATELY revoke key in Vercel/Supabase
2. Create new secret
3. Update in all environments
4. Check GitHub logs: git log -S 'exposed_key'
5. If found → Force push (if main not changed yet)
6. GitHub secret scanning raporu check
7. Create post-mortem issue
```

Örnek:

```bash
# Secret expose edildi: sk_test_abc123
# 1. Vercel dashboard'da revoke et
# 2. GitHub secret scanning aktivat
# 3. Check commits
$ git log -p | grep "sk_test_"
# 4. If in commit → git reset (before verification)
# 5. Create new key
# 6. Deploy
```

## 8. Secret Access Tiers

### Tier 1: Public (No Secrets)

```
GitHub Issue, PR description, README, public docs
```

### Tier 2: Limited (Anon Keys Only)

```
Frontend code (Next.js browser bundles)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Kurallar:
- `NEXT_PUBLIC_` prefix ile başla
- Read-only veriler (public veri tabanı)
- Sensitive RLS politikaları ile korunmak
- Public'te görülmesi güvenli

### Tier 3: Protected (Private Keys)

```
Backend environment variables
OPENAI_API_KEY
ANTHROPIC_API_KEY
DATABASE_URL (internals)
STRIPE_API_KEY
```

Kurallar:
- Sadece server-side (Node.js)
- Vercel/Render panel'de
- CI/CD context'te
- Logs'ta görülmez

### Tier 4: Restricted (Master Keys)

```
Database master password
JWT secret
Service role keys
```

Kurallar:
- DBA / Ops sadece
- Vault veya 1Password'de
- Minimal access
- Audit logging

## 9. Code Review Checklist

Her PR'da Claude kontrol eder:

```markdown
## Secret Management Check

**Files Changed:**
- [ ] src/config.ts — no hardcoded keys?
- [ ] .env.example — no real secrets?
- [ ] package.json — no credentials in scripts?
- [ ] Dockerfile — no secrets in image?
- [ ] .github/workflows — secrets only in ${{ secrets.VAR }}?

**Commit Messages:**
- [ ] No API keys?
- [ ] No passwords?
- [ ] No tokens?

**Logs & Monitoring:**
- [ ] console.log doesn't print secrets?
- [ ] Error messages don't leak credentials?
- [ ] Logs are sanitized?

**Database:**
- [ ] Connection strings in code? No!
- [ ] RLS policies defined? Yes!
- [ ] Service keys never in frontend? Correct!
```

## 10. Documentation

### README Secret Setup

```markdown
## Environment Setup

1. Create `.env.local` (NOT committed)
2. Copy from Vercel environment:
   ```bash
   vercel env pull .env.local
   ```
3. Verify `.env.example` for format
4. Never commit `.env.local`
```

### Developer Onboarding

```markdown
## Secret Management

1. **DO NOT** store secrets in code
2. **DO** use Vercel environment panel
3. **DO** verify .env.local is in .gitignore
4. **DO** scan commits: `git log -p -S 'sk_'`
5. **DO** report exposure immediately

Contacts:
- Ops team: ops@mauseai.com
- Security: security@mauseai.com
```

## 11. Monitoring & Alerts

### GitHub Secret Scanning

Enable in repository settings:

```
Settings → Security & analysis → Secret scanning → Enable
```

Alerts go to:
- maintainers@mauseai.com
- Slack #security channel

### Log Monitoring

```bash
# Weekly scan
$ git log --all -p | grep -i 'password\|api.*key\|token'

# Semgrep CI check
$ semgrep --config=p/security-audit
```

### Vault Audit

```
Vercel Audit Log:
  - Who accessed which secret
  - When
  - For how long
```

## 12. Breaking the Rules

| Violation | Consequence |
|---|---|
| Secret in code commit | PR blocked, forced revert |
| Hardcoded API key | Emergency revoke + secret rotation |
| Exposed in log | Emergency log cleanup + PR revert |
| GitHub Issue leak | Issue content redacted + post-mortem |

## 13. Tools

### Local Check

```bash
# Check git history
$ git log -p -S 'sk_test_'

# Check current tree
$ grep -r 'OPENAI_API_KEY=' src/ 2>/dev/null

# Semgrep
$ npm install -g semgrep
$ semgrep --config=p/owasp-top-ten
```

### CI Integration

```bash
# .github/workflows/secret-scan.yml
npm run secret:scan

# scripts/secret-scan.sh
#!/bin/bash
git log -p -S 'sk_' && exit 1 || true
```

## 14. Kaynaklar

- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [FILE-OWNERSHIP.md](./FILE-OWNERSHIP.md)
- [PR-CI-RULES.md](./PR-CI-RULES.md)

## Summary

```
┌─────────────────────────────────────────┐
│ NEVER commit secrets to Git             │
│ ALWAYS use Vercel/Render environment    │
│ ALWAYS scan code before push            │
│ ALWAYS rotate keys regularly            │
│ ALWAYS report leaks immediately         │
└─────────────────────────────────────────┘
```
