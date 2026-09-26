import type { Metadata, Viewport } from "next";
import Link from "next/link";
import {
  DIAGRAM_EDGES,
  DIAGRAM_LANES,
  DIAGRAM_NODES,
  DIAGRAM_PRINCIPLE,
  DIAGRAM_PUBLIC_URL,
  DIAGRAM_TITLE,
} from "@/src/lib/diagram/inventory";
import { COVERAGE, coverageSummary } from "@/src/lib/diagram/coverage";
import DiagramExplorer from "./diagram-explorer";

export const metadata: Metadata = {
  title: "A–Z Mimari Diyagramı · MouseAI",
  description: "Resmi A–Z diyagramı, erişilebilir gezgin ve kapsam matrisi",
};

// Explicit so the page scales on phones and tablets and users can still zoom.
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function DiagramPage() {
  const summary = coverageSummary();
  return (
    <main className="shell diagram-page" lang="tr">
      <a className="skip-link" href="#diagram-explorer-heading">Diyagram gezginine atla</a>
      <nav aria-label="Sayfa yolu" className="muted">
        <Link href="/">MouseAI</Link> / A–Z diyagramı
      </nav>
      <h1>{DIAGRAM_TITLE}</h1>
      <p className="muted">{DIAGRAM_PRINCIPLE}</p>

      <section aria-labelledby="summary-heading" className="diagram-summary">
        <h2 id="summary-heading" className="sr-only">
          Kapsam özeti
        </h2>
        <dl>
          <div><dt>Şerit</dt><dd>{DIAGRAM_LANES.length}</dd></div>
          <div><dt>Kart</dt><dd>{summary.nodes}</dd></div>
          <div><dt>Bağlantı</dt><dd>{summary.edges}</dd></div>
          <div><dt>Tamam</dt><dd>{summary.implemented}</dd></div>
          <div><dt>Kısmi</dt><dd>{summary.partial}</dd></div>
          <div><dt>Anahtar bekliyor</dt><dd>{summary.requiresCredentials}</dd></div>
        </dl>
      </section>

      <figure className="diagram-figure">
        <div
          className="diagram-scroll"
          tabIndex={0}
          role="region"
          aria-label="Diyagram görseli, yatay kaydırılabilir"
        >
          {/* The original SVG is served untouched; the explorer below is its text alternative. */}
          <img
            src={DIAGRAM_PUBLIC_URL}
            width={2200}
            height={1400}
            alt={`${DIAGRAM_TITLE}. ${DIAGRAM_LANES.length} şerit, ${DIAGRAM_NODES.length} kart ve ${DIAGRAM_EDGES.length} bağlantı. Metin karşılığı aşağıdaki gezgindedir.`}
            aria-describedby="diagram-explorer-heading"
          />
        </div>
        <p className="muted scroll-hint" aria-hidden="true">Görseli yatay kaydırın veya aşağıdaki gezgini kullanın.</p>
        <figcaption className="muted">
          Özgün dosya: <a href={DIAGRAM_PUBLIC_URL}>masuai-a-z-diyagram.svg</a> (değiştirilmeden sunulur). Kapsam JSON:{" "}
          <a href="/api/diagram">/api/diagram</a>
        </figcaption>
      </figure>

      <DiagramExplorer lanes={[...DIAGRAM_LANES]} nodes={DIAGRAM_NODES} edges={DIAGRAM_EDGES} coverage={COVERAGE} />
    </main>
  );
}
