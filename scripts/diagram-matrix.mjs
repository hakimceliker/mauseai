// Regenerates docs/diagrams/A-Z-COVERAGE.md from src/lib/diagram/coverage.ts (cross-platform env handling).
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["vitest", "run", "tests/diagram/coverage.test.ts"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, UPDATE_DIAGRAM_MATRIX: "1" },
});
process.exit(result.status ?? 1);
