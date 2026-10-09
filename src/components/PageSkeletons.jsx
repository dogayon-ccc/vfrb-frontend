// Loading placeholders for every page family: app body, app shell, public site, design studio.
import '../styles/skeleton.css';

const B = ({ w = '100%', h = 14, r, dark, style }) => (
  <i className={dark ? 'skx skx-dark' : 'skx'} style={{ width: w, height: h, borderRadius: r, ...style }} />
);

const busy = (label) => ({ role: 'status', 'aria-busy': true, 'aria-label': label });

export function AppPageSkeleton() {
  return (
    <div className="skx-page" {...busy('Loading page')}>
      <div style={{ display: 'grid', gap: 8 }}>
        <B w="min(320px, 70%)" h={26} />
        <B w="min(220px, 50%)" h={12} />
      </div>
      <div className="skx-stats">
        {[0, 1, 2, 3].map(n => (
          <div key={n} className="skx-card">
            <B w="50%" h={11} />
            <B w="35%" h={26} />
          </div>
        ))}
      </div>
      <div className="skx-card">
        <B w="30%" h={16} style={{ marginBottom: 6 }} />
        {[0, 1, 2, 3, 4, 5].map(n => (
          <div key={n} className="skx-row">
            <B w={40} h={40} r={10} />
            <div style={{ display: 'grid', gap: 6 }}><B w={`${70 - n * 5}%`} /><B w="40%" h={10} /></div>
            <B h={26} r={99} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="skx-shell" {...busy('Loading')}>
      <aside className="skx-side">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <B dark w={36} h={36} r="50%" /><B dark w="60%" h={14} />
        </div>
        {[0, 1, 2, 3, 4, 5, 6, 7].map(n => <B key={n} dark h={34} r={10} />)}
      </aside>
      <div>
        <header className="skx-top"><B w={180} h={16} /><B w={36} h={36} r="50%" /></header>
        <main className="skx-main"><AppPageSkeleton /></main>
      </div>
    </div>
  );
}

export function SiteSkeleton() {
  return (
    <div className="skx-site" {...busy('Loading page')}>
      <header className="skx-site-head">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: '0 0 auto' }}>
          <B w={40} h={40} r="50%" /><B w={140} h={16} />
        </div>
        <div className="skx-site-nav" style={{ display: 'flex', gap: 22 }}>
          {[0, 1, 2, 3, 4].map(n => <B key={n} w={70} h={12} />)}
        </div>
        <B w={150} h={42} r={99} />
      </header>
      <section className="skx-site-hero">
        <div style={{ display: 'grid', gap: 16 }}>
          <B w={200} h={24} r={99} />
          <B w="90%" h={52} /><B w="70%" h={52} />
          <B w="85%" /><B w="75%" /><B w="60%" />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}><B w={180} h={50} r={12} /><B w={140} h={50} r={12} /></div>
        </div>
        <B h="clamp(260px, 40vw, 520px)" r={28} />
      </section>
      <section className="skx-site-grid">
        {[0, 1, 2, 3].map(n => <B key={n} h={120} r={18} />)}
      </section>
    </div>
  );
}

export function StudioSkeleton() {
  return (
    <div className="skx-studio" {...busy('Loading design studio')}>
      <header className="skx-studio-top">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><B w={32} h={32} r={8} /><B w={160} h={16} /></div>
        <div style={{ display: 'flex', gap: 10 }}><B w={90} h={36} r={10} /><B w={110} h={36} r={10} /></div>
      </header>
      <div className="skx-studio-body">
        <aside className="skx-studio-rail">{[0, 1, 2, 3, 4, 5, 6].map(n => <B key={n} h={48} r={12} />)}</aside>
        <main className="skx-studio-canvas"><B w="min(520px, 80%)" h="min(620px, 70vh)" r={24} /></main>
        <aside className="skx-studio-side">
          <B w="50%" h={16} />
          {[0, 1, 2, 3].map(n => <B key={n} h={64} r={12} />)}
        </aside>
      </div>
    </div>
  );
}
