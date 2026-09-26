import Link from "next/link";

const cards = [
  ["Task Engine", "Breaks goals into tasks and steps."],
  ["Checkpoint", "Resumes paused work from where it left off."],
  ["AI Router", "Routes to appropriate AI providers."],
  ["Audit & Cost", "Records cost and proof for each operation."],
];

export default function Home() {
  return (
    <main className="shell">
      <span className="badge">PHASE 1 · 14-DAY CORE</span>
      <h1>MouseAI Core</h1>
      <p className="muted">
        AI operations control center that plans tasks, executes them, and
        resumes when paused.
      </p>
      <section className="grid">
        {cards.map(([title, body]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p className="muted">{body}</p>
          </article>
        ))}
      </section>
      <p>
        <Link href="/diagram">A–Z mimari diyagramı ve kapsam matrisi →</Link>
      </p>
    </main>
  );
}
