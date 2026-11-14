import { CONTACT as C } from './config';
import { Btn } from './parts';

// Google Maps centred on VFRB's street address, shown straight away. Google may set its own cookies once the frame loads (see the Privacy Policy).
export default function MapCard() {
  return (
    <figure className="vs-map">
      <iframe title="Map: VFRB Enterprise, 31 San Guillermo St., Bayanan, Muntinlupa City" src={C.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      <figcaption className="vs-map__bar">
        <span><b>{C.address[0]}</b>, {C.address[1]}</span>
        <Btn href={C.map} variant="line" target="_blank" rel="noopener noreferrer">Open in Google Maps</Btn>
      </figcaption>
    </figure>
  );
}
