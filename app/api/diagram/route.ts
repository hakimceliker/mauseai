import { DIAGRAM_EDGES, DIAGRAM_LANES, DIAGRAM_NODES, DIAGRAM_PUBLIC_URL } from "@/src/lib/diagram/inventory";
import { COVERAGE, coverageSummary } from "@/src/lib/diagram/coverage";

/** Diagram inventory + coverage matrix. Static, contains no tenant data. */
export async function GET() {
  return Response.json({ svg: DIAGRAM_PUBLIC_URL, lanes: DIAGRAM_LANES, nodes: DIAGRAM_NODES, edges: DIAGRAM_EDGES, coverage: COVERAGE, summary: coverageSummary() });
}
