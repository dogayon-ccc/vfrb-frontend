// Moving word band with a pause control (moving content longer than 5 s must be pausable). Hidden under reduced motion: nothing moves.
import { useState } from 'react';
import { Pause, Play } from 'lucide-react';

export default function MarqueeBand({ words, reduce }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="lp-marquee-wrap" data-paused={paused || undefined}>
      <div className="lp-marquee" aria-hidden="true">
        {[0, 1].map(r => (
          <div key={r} className={`lp-marquee__row${r ? ' lp-marquee__row--alt' : ''}`}>
            {[0, 1].map(k => <span key={k}>{words.map(m => <b key={m}>{m}</b>)}</span>)}
          </div>
        ))}
      </div>
      {!reduce && (
        <button type="button" className="lp-marquee-toggle" aria-pressed={paused} onClick={() => setPaused(p => !p)}>
          {paused ? <Play size={16} aria-hidden="true"/> : <Pause size={16} aria-hidden="true"/>}<span>{paused ? 'Play moving text' : 'Pause moving text'}</span>
        </button>
      )}
    </div>
  );
}
