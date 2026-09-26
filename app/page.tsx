const cards = [
  ["Task Engine", "Hedefleri görev ve adımlara ayırır."],
  ["Checkpoint", "Duraklayan işleri kaldığı yerden sürdürür."],
  ["AI Router", "MVP’de mock GPT/Claude sağlayıcıları."],
  ["Audit & Cost", "Her işlem için maliyet ve kanıt kaydı."],
];

export default function Home() {
  return (
    <main className="shell">
      <span className="badge">FAZ 1 · 14 GÜNLÜK ÇEKİRDEK</span>
      <h1>MouseAI Core</h1>
      <p className="muted">
        Görevleri planlayan, yürüten, durakladığında devam ettiren AI operasyon
        çekirdeği.
      </p>
      <section className="grid">
        {cards.map(([title, body]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p className="muted">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
