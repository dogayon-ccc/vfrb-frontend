import { PIECES, ORDER_STEPS, pickFirstAction } from './mock';
import { PieceArt } from './parts';

// Customer dashboard prototypes. One first action, chosen by pickFirstAction; customer sees status only.

function FirstAction({ a }) {
  return (
    <section className="dl-hero" data-kind={a.kind} aria-labelledby="dl-first">
      <p className="dl-eyebrow">{a.eyebrow}</p>
      <h2 id="dl-first" className="dl-serif">{a.title}</h2>
      <p>{a.body}</p>
      {a.order && <Progress step={a.order.step}/>}
      <a className="dl-btn dl-btn-primary" href="#first">{a.cta}</a>
    </section>
  );
}

function Progress({ step }) {
  return (
    <ol className="dl-progress" aria-label="Order status">
      {ORDER_STEPS.map((s, i) => <li key={s} data-done={i <= step || undefined} aria-current={i === step ? 'step' : undefined}>{s}</li>)}
    </ol>
  );
}

function DesignCard({ d }) {
  return (
    <article className="dl-card">
      <div className="dl-card-art">{d.pieces.map(r => <PieceArt key={r} role={r} colours={d.colours}/>)}</div>
      <div className="dl-card-body">
        <h3>{d.name}</h3>
        <p className="dl-muted dl-small">{d.pieces.map(r => PIECES[r].label).join(' + ')} · {d.ordered ? 'Ordered' : 'Draft'} · {d.updated}</p>
        <div className="dl-row">
          {d.ordered
            ? <><a className="dl-btn dl-btn-strong" href="#reorder">Reorder</a><a className="dl-btn" href="#dup">Duplicate to edit</a></>
            : <a className="dl-btn dl-btn-strong" href="#continue">Continue</a>}
        </div>
      </div>
    </article>
  );
}

function NewCard() {
  return (
    <a className="dl-card dl-card-new" href="#new">
      <span className="dl-plus" aria-hidden="true">+</span>
      <strong>Start a new design</strong>
      <span className="dl-muted dl-small">Single piece or matching set</span>
    </a>
  );
}

function Recent({ designs, wide }) {
  return (
    <section aria-labelledby="dl-recent">
      <div className="dl-sec-h"><h2 id="dl-recent" className="dl-serif">Recent designs</h2>{designs.length > 0 && <a href="#all" className="dl-link">All designs</a>}</div>
      <div className="dl-cards" data-wide={wide || undefined}><NewCard/>{designs.map(d => <DesignCard key={d.id} d={d}/>)}</div>
    </section>
  );
}

function Orders({ orders }) {
  return (
    <section aria-labelledby="dl-orders">
      <div className="dl-sec-h"><h2 id="dl-orders" className="dl-serif">Your orders</h2>{orders.length > 0 && <a href="#orders" className="dl-link">All orders</a>}</div>
      {orders.length ? (
        <ul className="dl-orders">
          {orders.map(o => (
            <li key={o.id}><a href="#order"><span><strong>{o.name}</strong><span className="dl-muted dl-small">{o.id}</span></span>
              <span className="dl-badge" data-tone={o.step === 0 ? 'warn' : o.step === 3 ? 'ok' : undefined}>{o.status}</span></a></li>
          ))}
        </ul>
      ) : <p className="dl-muted">No orders yet. When you order a design, its status shows here.</p>}
    </section>
  );
}

function Head({ s }) {
  return (
    <header className="dl-dash-head">
      <h1 className="dl-serif">Good morning, Metro Hospital HR</h1>
      {!s.loading && !s.error && <p className="dl-muted">{s.orders.length ? `${s.orders.length} order${s.orders.length > 1 ? 's' : ''} · ${s.designs.length} saved designs` : 'Welcome to VFRB.'}</p>}
    </header>
  );
}

function Fallback({ s }) {
  if (s.loading) return <div className="dl-state" role="status"><div className="dl-skel dl-skel-line"/><div className="dl-skel dl-skel-card"/><p>Loading your dashboard…</p></div>;
  return (
    <div className="dl-state" role="alert">
      <h2 className="dl-serif">We couldn't load your dashboard</h2>
      <p>Your orders and designs are safe. Try again in a moment.</p>
      <div className="dl-row"><button type="button" className="dl-btn dl-btn-primary">Try again</button><a className="dl-btn" href="#new">Start a new design</a></div>
    </div>
  );
}

// A: one stacked column. First action, orders, then designs.
export function DashboardGuided({ s, mobile }) {
  return (
    <div className="dl-dash" data-mobile={mobile || undefined}>
      <Head s={s}/>
      {s.loading || s.error ? <Fallback s={s}/> : (
        <div className="dl-dash-stack">
          <FirstAction a={pickFirstAction(s)}/>
          {s.orders.length > 0 && <Orders orders={s.orders}/>}
          <Recent designs={s.designs} wide={!mobile}/>
        </div>
      )}
    </div>
  );
}

// B: first action + designs in the main column, orders beside them so the right side is never empty.
export function DashboardWorkspace({ s, mobile }) {
  return (
    <div className="dl-dash" data-mobile={mobile || undefined}>
      <Head s={s}/>
      {s.loading || s.error ? <Fallback s={s}/> : (
        <div className="dl-dash-split">
          <div className="dl-dash-stack"><FirstAction a={pickFirstAction(s)}/>{!mobile && <Recent designs={s.designs}/>}</div>
          <div className="dl-dash-stack"><Orders orders={s.orders}/>{mobile && <Recent designs={s.designs}/>}</div>
        </div>
      )}
    </div>
  );
}
