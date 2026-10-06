# Control Plane integration — Infra24

Status: CODE PREPARED / LIVE ACCEPTANCE BLOCKED. Default local-first/cloud-fallback behavior remains when SENATECH_CONTROL_PLANE_ENABLED is not true.

## Explicit service binding

Server-only settings: SENATECH_CONTROL_PLANE_ENABLED, SENATECH_CONTROL_PLANE_URL (HTTPS origin only), SENATECH_CONTROL_PLANE_TENANT_ID, SENATECH_CONTROL_PLANE_TOKEN. Values are not provisioned by this PR. One worker deployment is bound to exactly one tenant; this is not a shared credential implementation for arbitrary tenants.

The Inngest task path verifies the persisted task's tenant and workflow before calling the router. The tenant must match server configuration. It sends stable mouseai:task:step request IDs, client/project mouseai and text capability. Missing context or another tenant is rejected before network access. Other router callers that do not provide verified context fail closed in central mode.

The central server must authenticate x-control-token against the same tenant/project, support text capability, and return matching request_id, decision.status=selected, decision.approval_required=false, result.validated=true and nonempty result.output. Missing/incompatible contracts are rejected. Redirects are rejected. No provider fallback or retry follows an ambiguous request failure; Inngest receives NonRetriableError for central execution failures.

Unknown token/cost usage stays unknown. Central-mode task results mark metering_status=unknown, omit estimated step cost and avoid committing guessed task cost. Commercial billing remains BLOCKED until central metering is integrated; this is not billable readiness.

## Verification

Executed with Node 24.19.0: node --test tests/control-plane.node.test.mjs — 13 PASS. Tests cover authenticated payload, tenant mismatch, missing context, request ID validation, unsafe URLs, approval/validation/request ID/output rejection, and no retry/redacted ambiguity. Local tests used exactly the committed provider source with a relative test import adjustment. node --check passed for changed router and workflow modules.

Full npm typecheck/build, existing suites, signed Inngest execution, tenant A/B database checks and live Control Plane have NOT been executed. No Next route/UI/API behavior is modified; these are provider and task worker modules. Repository Next.js instruction was inspected; installed Next guides are unavailable in this isolated source workspace, so no Next API changes were attempted.

Before activation: review and merge required server contract PRs, provision approved server-only binding, run full CI and real signed task E2E, verify durable duplicate suppression upstream, then separately approve production configuration. No production activation, secret changes, payment, DNS or live orders occurred.
