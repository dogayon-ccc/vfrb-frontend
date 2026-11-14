import { useState } from 'react';
import { CONTACT as C } from './config';
import { Btn } from './parts';

// The Google embed sets cookies, so it loads only after the visitor asks for it.
export default function MapCard() {
  const [on, setOn] = useState(false);
  return (
    <figure className="vs-map">
      {on ? (
        <iframe title="Map: VFRB Enterprise, Bayanan, Muntinlupa City" src={C.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <div className="vs-map__idle">
          <span className="vs-map__pin" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="10" r="3" /></svg>
          </span>
          <b>{C.address[0]}</b>
          <span>{C.address[1]}</span>
          <div className="vs-map__btns">
            <button type="button" className="vs-btn vs-btn--primary" onClick={() => setOn(true)}>Show the map</button>
            <Btn href={C.map} variant="line" target="_blank" rel="noopener noreferrer">Open in Google Maps</Btn>
          </div>
          <small>The map loads from Google only after you press the button.</small>
        </div>
      )}
    </figure>
  );
}
