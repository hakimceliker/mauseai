"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { DiagramEdge, DiagramNode } from "@/src/lib/diagram/inventory";
import type { CoverageItem, CoverageStatus, NodeCoverage } from "@/src/lib/diagram/coverage";

interface Props {
  lanes: Array<{ id: string; title: string }>;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  coverage: { nodes: NodeCoverage[]; edges: CoverageItem[] };
}

const STATUS_LABEL: Record<CoverageStatus, string> = {
  implemented: "Tamam",
  partial: "Kısmi",
  requires_credentials: "Anahtar bekliyor",
};

function worstStatus(items: Array<{ status: CoverageStatus }>): CoverageStatus {
  if (items.some((i) => i.status === "requires_credentials")) return "requires_credentials";
  if (items.some((i) => i.status === "partial")) return "partial";
  return "implemented";
}

function StatusBadge({ status }: { status: CoverageStatus }) {
  return <span className={`status status-${status}`}>{STATUS_LABEL[status]}</span>;
}

/** Accessible text alternative of the diagram: lanes → cards → capabilities, plus every connector. */
export default function DiagramExplorer({ lanes, nodes, edges, coverage }: Props) {
  const [selected, setSelected] = useState<string>("CORE");
  const buttons = useRef<Map<string, HTMLButtonElement>>(new Map());
  const detail = useRef<HTMLElement>(null);
  const order = useMemo(() => lanes.flatMap((l) => nodes.filter((n) => n.lane === l.id).map((n) => n.id)), [lanes, nodes]);

  const node = nodes.find((n) => n.id === selected);
  const nodeCoverage = coverage.nodes.find((c) => c.node === selected);
  const incoming = edges.filter((e) => e.to === selected);
  const outgoing = edges.filter((e) => e.from === selected);

  const focusNode = (id: string) => {
    setSelected(id);
    buttons.current.get(id)?.focus();
  };

  // On phones and tablets the detail panel sits below the card list: bring it into view after a tap.
  const selectAndReveal = (id: string) => {
    setSelected(id);
    if (typeof window === "undefined" || !window.matchMedia?.("(max-width: 859px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => detail.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = order.indexOf(id);
    const next: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (event.key in next) {
      event.preventDefault();
      focusNode(order[(index + next[event.key] + order.length) % order.length]);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusNode(order[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      focusNode(order[order.length - 1]);
    }
  };

  return (
    <section aria-labelledby="diagram-explorer-heading" className="explorer">
      <h2 id="diagram-explorer-heading">Diyagram gezgini</h2>
      <p className="muted">Kartlar arasında ok tuşlarıyla gezinebilir, seçili kartın yeteneklerini, bağlantılarını ve kapsam durumunu görebilirsiniz.</p>

      <div className="explorer-grid">
        <div className="lanes">
          {lanes.map((lane) => (
            <div key={lane.id} className="lane" role="group" aria-labelledby={`${lane.id}-title`}>
              <h3 id={`${lane.id}-title`}>{lane.title}</h3>
              <ul>
                {nodes
                  .filter((n) => n.lane === lane.id)
                  .map((n) => {
                    const cov = coverage.nodes.find((c) => c.node === n.id);
                    const status = cov ? worstStatus(cov.capabilities) : "partial";
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          ref={(el) => {
                            if (el) buttons.current.set(n.id, el);
                            else buttons.current.delete(n.id);
                          }}
                          className={`node-button${n.id === "CORE" ? " node-core" : ""}`}
                          aria-pressed={selected === n.id}
                          aria-controls="node-detail"
                          tabIndex={selected === n.id ? 0 : -1}
                          onClick={() => selectAndReveal(n.id)}
                          onKeyDown={(e) => onKeyDown(e, n.id)}
                        >
                          <span>{n.title}</span>
                          <StatusBadge status={status} />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>

        <article id="node-detail" ref={detail} className="node-detail" aria-live="polite" aria-labelledby="node-detail-title" tabIndex={-1}>
          {node ? (
            <>
              <h3 id="node-detail-title">{node.title}</h3>
              <div className="table-scroll" tabIndex={0} role="region" aria-label={`${node.title} yetenek tablosu`}>
              <table className="stack-table">
                <caption className="sr-only">{node.title} yetenekleri ve kapsam durumu</caption>
                <thead>
                  <tr>
                    <th scope="col">Yetenek</th>
                    <th scope="col">Durum</th>
                    <th scope="col">Kod</th>
                  </tr>
                </thead>
                <tbody>
                  {nodeCoverage?.capabilities.map((c) => (
                    <tr key={c.id}>
                      <th scope="row">
                        {c.capability}
                        {c.note ? <small className="muted note">{c.note}</small> : null}
                      </th>
                      <td data-label="Durum"><StatusBadge status={c.status} /></td>
                      <td data-label="Kod"><code>{c.code[0]}</code>{c.code.length > 1 ? <small className="muted"> +{c.code.length - 1}</small> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <h4>Bağlantılar</h4>
              <ul className="edge-list">
                {[...incoming, ...outgoing].map((e) => {
                  const other = e.from === selected ? e.to : e.from;
                  const cov = coverage.edges.find((c) => c.id === e.id);
                  return (
                    <li key={e.id}>
                      <button type="button" className="link-button" onClick={() => focusNode(other)}>
                        {e.from} → {e.to}
                      </button>{" "}
                      <span className="muted">({e.kind === "sync" ? "düz" : "kesikli"}) {e.label}</span>{" "}
                      {cov ? <StatusBadge status={cov.status} /> : null}
                    </li>
                  );
                })}
                {incoming.length + outgoing.length === 0 ? <li className="muted">Bu kartın bağlantısı yok.</li> : null}
              </ul>
            </>
          ) : null}
        </article>
      </div>

      <h3 id="all-edges-heading">Tüm bağlantılar ({edges.length})</h3>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Bağlantı tablosu">
        <table className="stack-table">
          <thead>
            <tr>
              <th scope="col">Kenar</th>
              <th scope="col">Tür</th>
              <th scope="col">Anlam</th>
              <th scope="col">Durum</th>
            </tr>
          </thead>
          <tbody>
            {edges.map((e) => {
              const cov = coverage.edges.find((c) => c.id === e.id);
              return (
                <tr key={e.id}>
                  <th scope="row">{e.from} → {e.to}</th>
                  <td data-label="Tür">{e.kind === "sync" ? "Düz (senkron)" : "Kesikli (asenkron)"}</td>
                  <td data-label="Anlam">{e.label}</td>
                  <td data-label="Durum">{cov ? <StatusBadge status={cov.status} /> : "eşleşmedi"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
