# MouseAI — G0 Sahiplik Matrisi

**Last verified:** 2026-10-01

**G0:** `DECISION_PENDING`

| Alan | Sahip / rol | Yetki ve teslim | Onay durumu |
|---|---|---|---|
| Ürün ve kapsam | Hakim Çeliker (proposed product owner) | Scope, priority and acceptance decision | G0 sign-off `PENDING_USER_CONFIRMATION` |
| Yönetim sponsorluğu | Atanacak | Budget, capacity and strategic decision | `DECISION_PENDING` |
| Maliyet merkezi / finance | Atanacak | Funding, cost center, 13-week cash and limits | `DECISION_PENDING` |
| Operasyon risk / on-call | Atanacak | Incident, rollback, support, restore and G12 | `DECISION_PENDING` |
| Kod, migration, API, tests, CI | Copilot/Codex (technical contributor) | Feature branch, PR, verification and rollback record | Execution authority only; no business acceptance |
| Independent review | Authorized maintainer not yet assigned | Review findings and approval separate from author | `BLOCKED`; PRs #92/#95/#97 await review |
| Auth/database/RLS | Supabase + authorized test owner | Live Auth, tenant and RLS evidence | `NOT_RUN` |
| Deployment/environment | Vercel + authorized operator | Preview/production evidence and rollback | Production deployment SHA verified; change approval remains human-owned |
| Durable workflow | Inngest + authorized test owner | Trigger, worker, retry and checkpoint evidence | `NOT_RUN` |
| AI providers | OpenAI/Anthropic + authorized credential owner | Runtime call, token/cost and failure evidence | `credential_not_configured` / `NOT_RUN` |
| Payments | User + Stripe sandbox owner | Sandbox test and commercial decision | `NOT_RUN` |
| Legal/privacy | Qualified reviewer to be appointed | Terms, privacy, data use approval | `DECISION_PENDING` |

## Authority boundary

The user authorized this repository task, not a G0 sponsor/cost/operations
decision. Repository issue assignment and a contributor listing do not confer
acceptance authority. `claude` is listed as a contributor with `read`
permission; this does not establish maintainer review authority. No reviewer,
sponsor, budget owner, customer, or pilot participant has been invented or
assigned.
