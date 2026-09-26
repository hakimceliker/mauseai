/**
 * Runs once per server instance. In production it logs which critical
 * settings are missing (env var names only, never values) so a misconfigured
 * deployment is visible in the logs before the first request fails.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { configReport, criticalFailures } = await import("@/src/lib/config/production-checks");
  const { StructuredLogger } = await import("@/src/lib/logging/structured-logger");
  const report = configReport();
  const failures = criticalFailures(report);
  if (failures.length) StructuredLogger.warn("production_config_incomplete", { failures });
  else StructuredLogger.info("production_config_ok", { checks: report.checks.length });
}
