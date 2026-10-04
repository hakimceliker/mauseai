# Locked Supabase MCP

From the repository root, run `npm ci --ignore-scripts --prefix tools/supabase-mcp` before opening the agent session. `.mcp.json` executes the installed local binary with Node; it never downloads packages at launch. Run the agent from the repository root. Set `SUPABASE_ACCESS_TOKEN` only in your own environment.

The manifest pins MCP 0.13.0. The committed npm lockfile pins transitive versions and tarball SHA-512 integrity. Keep Node/npm versions consistent with CI (Node 22); use `npm ci`, not `npm install`, for ordinary setup. No database mutation or credential is needed to validate installation: `node tools/supabase-mcp/node_modules/@supabase/mcp-server-supabase/dist/cli.js --version`.

For an upgrade, review the release and dependency changes, change the exact manifest version, regenerate the lockfile with `npm install --package-lock-only --ignore-scripts --prefix tools/supabase-mcp`, run the tooling guard and `npm audit --prefix tools/supabase-mcp --audit-level=high`, and submit both files for review. The CI guard checks concrete inline-code repository references in `.claude` Markdown and rejects runtime MCP download commands. It is a lightweight guard, not a general Markdown/command parser.
