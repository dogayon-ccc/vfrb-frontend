import SitePage from './SitePage';

// Source strings are hard-wrapped; join single newlines, keep blank-line paragraph breaks.
const paras = (b) => b.split(/\n\s*\n/).map(x => x.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);

// Shared layout for Privacy Policy and Terms of Service. sections: [{ title, body }].
export default function LegalPage({ title, updated, sections }) {
  return (
    <SitePage title={title}>
      <header className="vs-pagehead">
        <div className="vs-wrap">
          <p className="vs-kicker">Legal</p>
          <h1 className="vs-h1">{title}</h1>
          <p className="vs-lede">Last updated: {updated}</p>
        </div>
      </header>
      <section className="vs-sec vs-sec--tight" aria-label={title}>
        <div className="vs-wrap">
          <article className="vs-prose">
            {sections.map(s => (
              <section key={s.title}>
                <h2>{s.title}</h2>
                {paras(s.body).map((t, i) => <p key={i}>{t}</p>)}
              </section>
            ))}
          </article>
        </div>
      </section>
    </SitePage>
  );
}
