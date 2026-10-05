# Forgejo Mirror Parity — 2026-10-06

**Canonical source:** `https://github.com/hakimceliker/mauseai.git`

**Mirror:** local Forgejo v15.0.9 (`15.0.9+gitea-1.22.0`), repository `hakimceliker/mauseai-github-mirror.git`

**Verification time:** `2026-10-06T02:29:05+03:00`

## Read-only parity check

The mirror was updated only by pulling the canonical GitHub branch. No push, force-push, deletion, or source-repository mutation was performed.

| Check | Result |
|---|---|
| GitHub heads/tags | 81 refs |
| Forgejo heads/tags | 81 refs |
| Missing Forgejo refs | 0 |
| Stale Forgejo refs | 0 |
| Extra Forgejo heads/tags | 0 |
| GitHub `main` | `04256ac21a1c95da957fab501fc87c7acdf4cdd2` |
| Forgejo `main` | `04256ac21a1c95da957fab501fc87c7acdf4cdd2` |
| PR #118 branch | `ad1d75a607b431a176dcc5fdfcdf889ede8e2ee9` on both sides |
| Restore drill | PASS: temporary checkout from Forgejo `main`, SHA matched, 274 tracked files and `package.json` present |

## Acceptance limitation

This proves repository-ref parity and a source-tree restore only. It does not prove local CI acceptance, production readiness, independent review, Judge approval, or live Auth/RLS, Inngest, provider, pilot, KPI, or finance acceptance.
