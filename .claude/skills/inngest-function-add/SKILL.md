---
name: inngest-function-add
description: Use when adding a new background job/event handler under src/inngest/functions — follows the existing execute-task/task-worker pattern.
---

# Inngest Function Add

mauseai uses Inngest (SaaS, no local container) for background functions under `src/inngest/functions/`.

## Steps

1. Read an existing function (e.g. `execute-task`, `task-worker`) to match its structure: event trigger name, step usage, error handling.
2. Define the new function with a clear event name (`<domain>/<action>.requested` style, matching existing naming).
3. Register it in the Inngest client/handler index so it's actually served by the `/api/inngest` route.
4. Add a test mirroring the existing function tests (vitest).
5. Confirm required env vars (`INNGEST_EVENT_KEY`, and `INNGEST_SIGNING_KEY` if webhook verification is enabled) are documented in `.env.example` if the function needs new config.

Inngest is entirely cloud-hosted here — there's no local Inngest container, so local testing relies on the Inngest dev server (`npx inngest-cli dev`) pointed at the running Next.js app.
