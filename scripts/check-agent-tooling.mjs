import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const exact = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const manifest = json('tools/supabase-mcp/package.json');
const lock = json('tools/supabase-mcp/package-lock.json');
for (const [name, version] of Object.entries(manifest.dependencies)) {
  const entry = lock.packages?.[`node_modules/${name}`];
  if (!exact.test(version) || entry?.version !== version || lock.packages?.['']?.dependencies?.[name] !== version) {
    errors.push(`MCP dependency ${name} must have an exact version matching the lockfile`);
  }
}
for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (path && (!entry.integrity?.startsWith('sha512-') || !entry.resolved?.startsWith('https://registry.npmjs.org/'))) {
    errors.push(`MCP lock entry ${path} must use registry HTTPS and SHA-512 integrity`);
  }
}
const expected = 'tools/supabase-mcp/node_modules/@supabase/mcp-server-supabase/dist/cli.js';
const servers = json('.mcp.json').mcpServers;
for (const [name, server] of Object.entries(servers)) {
  // Require local locked execution; npx/npm exec would allow runtime downloads.
  if (server.type !== 'stdio' || server.command !== 'node' || server.args?.[0] !== expected || server.args?.length !== 1 || name !== 'supabase') {
    errors.push(`MCP server ${name} must use the reviewed local locked binary`);
  }
}
if (!servers.supabase) errors.push('Supabase MCP configuration is missing');
function visit(dir) {
  for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) visit(path);
    else if (entry.name.endsWith('.md')) {
      const content = read(path);
      // Check concrete inline-code repo paths, excluding commands, globs and routes.
      for (const [, ref] of content.matchAll(/`([^`\n]+)`/g)) {
        if (/^(?:src|tests|supabase|app|tools)\/[\w./-]+\/?$/.test(ref) || /^[\w.-]+\.(?:ts|tsx|mjs)$/.test(ref)) {
          if (!existsSync(resolve(root, ref))) errors.push(`${path}: missing repo reference ${ref}`);
        }
        if (/\bnpx\s+(?:-y\s+)?(?:@[^\s/]+\/)?[\w-]+(?:\s|$)/.test(ref)) {
          errors.push(`${path}: unpinned npx invocation ${ref}`);
        }
      }
    }
  }
}
visit('.claude');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Agent tooling: locked MCP dependencies and concrete repo references PASS');
