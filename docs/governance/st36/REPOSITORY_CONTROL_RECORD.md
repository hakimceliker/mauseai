# MouseAI — G0 Repository ve Branch Kontrol Kaydı

| Alan | Kayıt |
|---|---|
| Repository | `hakimceliker/mauseai` |
| Default branch | `main` |
| Aktif proje | MouseAI |
| Kanonik klasör | `C:\Users\Administrator\Documents\Codex\2026-09-26\ya\mouseai-core` |
| Branch kuralı | Main’e doğrudan push yok |
| PR kuralı | Her değişiklik ayrı branch ve PR |
| CI kapıları | lint, typecheck, test, build, audit, secret scan, Docker |
| Secret kuralı | Sohbete, koda, loga veya commit’e yazılmaz |
| Rollback | Revert PR veya önceki production deployment |
| Proje izolasyonu | Başka projelerin dosya/branch/secret/deployment’ına erişilmez |
| Son doğrulanan main | `04256ac21a1c95da957fab501fc87c7acdf4cdd2` |

## Güncel doğrulama — 2026-10-01 20:16 UTC

- Main CI run `36915074789`: quality, dependency audit, secret scan, Docker PASS.
- Main CodeQL run `36915074754`: PASS.
- Production deployment `6793405140`, commit `04256ac21a1c95da957fab501fc87c7acdf4cdd2`: SUCCESS.
- `/api/health`: HTTP 200, `healthy`, database `ready`; `/api/health/ready`: HTTP 200, `ready: true`.
- PR #92 head `7c8d2fbe23548ffdd26060a9f9114e7a8efb30d9`: CI and CodeQL PASS; independent review required.
- PR #95 head `2fe1b005e010f69d371f54c32c7497bd32cba769`: CI and CodeQL PASS; independent review required.
- PR #97 is the active governance/source reconciliation PR; this repository-control work is being added there to avoid parallel edits to canonical status records.
- `main-protection` requires a PR, one approval, `quality`, `CodeQL`, `secret-scan`, `dependency-audit`, `docker`, and `Vercel`; force-push and deletion are prohibited.
- GitHub Actions default token is read-only; workflow PR approval is disabled; `security-events: write` is scoped to CodeQL.
- Dependabot vulnerability alerts and security updates are enabled.
- Private vulnerability reporting is enabled and verified through the repository security API.
- Canonical MOUSE issues #53–#63 are assigned to `hakimceliker` and milestone `ST3.6 Production Acceptance`; seven duplicate issues are closed with canonical links.
- Stale package PRs #64–#74 are closed; branches are preserved.
- Production smoke evidence: [`../../evidence/README.md`](../../evidence/README.md).

## Active work branch and PR target

`chore/repository-governance-controls` — governance templates, ownership, dependency review, and status/evidence reconciliation. These changes are being integrated into the existing PR #97 to avoid competing edits to canonical status records; all required checks and independent approval still apply.

## Repository settings re-verification — 2026-10-01 20:26 UTC

- Ruleset `main-protection` is active with one required approval and required checks `quality`, `CodeQL`, `secret-scan`, `dependency-audit`, `docker`, and `Vercel`; force-push and deletion are blocked.
- Private vulnerability reporting is enabled.
- Actions default workflow permissions are read-only; workflows cannot approve pull requests; only CodeQL has `security-events: write`.
- The repository currently has only the PR author as a direct collaborator; independent maintainer review remains blocked.
