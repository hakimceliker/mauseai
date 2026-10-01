# ST3.6 Gap Closure Register

**Repository:** `hakimceliker/mauseai`  
**Snapshot:** 2026-10-01  
**Decision:** `NOT_ACCEPTED` until technical, pilot, financial and operational evidence is complete.

This is the execution register for the ST3.6 instruction. It is deliberately
evidence-driven: a document, a draft PR or a green health endpoint is not a
substitute for a completed gate.

## G0–G12 gate register

| Gate | Required result | Owner | Evidence required | Status |
|---|---|---|---|---|
| G0 | Owner, team, authority and project boundary | User/product owner | Signed project card | BLOCKED — decision needed |
| G1 | Customer problem and demand validated | Product/sales | Two problem interviews or approved pilot briefs | BLOCKED — data missing |
| G2 | Five founding models completed | Product/finance | Business, operating, technical, risk and governance records | PARTIAL — templates exist |
| G3 | Scope, pilot and success contract | Product + pilot owner | Pilot charter with baseline/target/exit criteria | BLOCKED — pilot not run |
| G4 | Budget and capacity limits | Finance/owner | 13-week cash flow, provider budget, capacity ceiling | BLOCKED — real inputs missing |
| G5 | Architecture and security review | Codex + reviewer | Threat model, CI, CodeQL, secret scan, RLS design | PARTIAL — code gates green; live proof open |
| G6 | API/data/workflow contracts | Codex | Contract tests and rollback evidence | PARTIAL |
| G7 | Auth, tenant isolation and storage boundary | Supabase + Codex | Positive and cross-tenant negative tests | BLOCKED — live tokens absent |
| G8 | Durable execution | Inngest + Codex | Trigger, worker, checkpoint, retry, idempotency, rollback | BLOCKED — production run absent |
| G9 | Provider, cost and observability | Codex + providers | Redacted provider call, cost ledger, trace and alert | BLOCKED — runtime credentials/evidence absent |
| G10 | Pilot and KPI benefit | Product/pilot owner | Two pilot reports with baseline vs outcome | BLOCKED — no real pilot |
| G11 | Release/legal/support readiness | Owner + operations | Release checklist, terms, backup/restore, incident/support plan | PARTIAL |
| G12 | Operating/customer acceptance | Owner/customer | Signed acceptance, runbook handover, rollback rehearsal | BLOCKED — not performed |

## Financial model — required fields

The provided 13-week CSV is a template, not evidence. Populate only from
approved source data; unknown values remain `VERİ YOK`.

| Model section | Required fields | Current status |
|---|---|---|
| Cash | Opening cash, weekly inflow/outflow, closing cash, minimum cash, funding gap | VERİ YOK |
| Development cost | Engineering hours, review/QA, infrastructure, tools | VERİ YOK |
| Provider cost | AI tokens, Inngest runs, Supabase, Vercel, observability | VERİ YOK |
| Unit economics | Cost per task, cost per tenant, gross margin, support cost | VERİ YOK |
| Revenue | Plan, price, paid conversion, collection timing, churn | TEYİT BEKLENİYOR |
| Pilot | Setup cost, support hours, incentive, success value | TEYİT BEKLENİYOR |
| Downside | 50% volume, 2x provider cost, delayed payment, failure/rework | HAZIRLANACAK |

## Pilot acceptance template

Two pilots are required before G10 can close. Use synthetic or approved test
data until a customer explicitly authorizes real data.

| Field | Pilot A | Pilot B |
|---|---|---|
| Customer/process | TEYİT BEKLENİYOR | TEYİT BEKLENİYOR |
| Baseline metric and period | VERİ YOK | VERİ YOK |
| Target and exit rule | TEYİT BEKLENİYOR | TEYİT BEKLENİYOR |
| Workflow used | TEYİT BEKLENİYOR | TEYİT BEKLENİYOR |
| Error/rework rate | VERİ YOK | VERİ YOK |
| User benefit | VERİ YOK | VERİ YOK |
| Security/privacy decision | TEYİT BEKLENİYOR | TEYİT BEKLENİYOR |
| Acceptance decision | NOT_RUN | NOT_RUN |

## Integration evidence ledger

Each row needs a date, environment, sanitized result, link to the run, owner,
and rollback note. Never store keys, tokens, customer records or raw sensitive
responses.

| Integration | Connection | Test | Evidence | Status |
|---|---|---|---|---|
| Supabase | Project ref known | Auth + RLS negative test | Redacted run record | BLOCKED |
| Vercel | Production deployment exists | SHA/env presence + health | Deployment URL/run | PARTIAL |
| Inngest | Endpoint exists | Trigger/worker/checkpoint/retry | Run ID without secret | BLOCKED |
| OpenAI | Adapter exists | Real or configured-runtime call | Redacted provider result | credential_not_configured |
| Anthropic | Adapter exists | Real or configured-runtime call | Redacted provider result | credential_not_configured |
| Stripe | Sandbox boundary exists | Test webhook/payment only | Sandbox event ID | NOT_RUN |
| PostHog | Plan/integration exists | Sanitized event delivery | Event name/timestamp | NOT_RUN |
| Sentry/Langfuse | Trace plan exists | Error/trace capture | Trace ID only | NOT_RUN |

## KPI card acceptance

Every KPI in `MAUSEAI_KPI_Kartlari.json` must have these fields before it is
used for a decision: definition, formula, source, query version, baseline,
target, owner, validator, measurement frequency, freshness limit, warning and
critical thresholds, last measured value, and evidence link. Missing values stay
`VERİ YOK` or `HEDEF BEKLİYOR`; they are not filled with estimates silently.

## Issue/PR cleanup plan

The 2026-10-01 GitHub snapshot initially contained 18 open issues and 18 open
PRs, of which 11 were drafts. The repository exposed a 36-item combined open
count because GitHub counts issues and pull requests together. Historical PRs
#1, #2, #3, #5, #6, #7 and #8 were then closed without merging; their branches
and commits were preserved.

Canonical policy:

1. Keep one canonical MOUSE-001–011 issue and one implementation PR per package.
2. Close historical duplicate issues with a comment linking the canonical issue.
3. Historical PRs #1–#8 are closed without merging; no branch was deleted.
4. Rebase or reimplement the 11 MOUSE draft packages from current `main` before
   considering them. The current branches are 53 commits behind and are not
   completion evidence.
5. Keep a draft package PR only when it has a current owner, branch, scope and
   next action; otherwise close it with the reason recorded here.
6. A merged commit on `main` plus CI and evidence is the only completion proof.

Cleanup is an external GitHub state change and must be recorded with the date,
record number and reason. No issue/PR is silently deleted.

## Execution order

1. Merge and verify the repository control-plane PR.
2. Reconcile `ACCEPTANCE_REPORT.md` against `main`.
3. Execute live Supabase Auth/RLS tests.
4. Execute Inngest production workflow and failure tests.
5. Record provider, cost, trace and analytics evidence.
6. Define and run two pilot scenarios.
7. Fill the 13-week financial model and KPI cards from approved data.
8. Classify/close duplicate issues and stale drafts.
9. Close G10–G12 only with real pilot, business and operating evidence.
10. Issue `ACCEPT` or `REJECT`; never infer acceptance from documentation completeness.
