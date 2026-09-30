import { useEffect, useRef, useState } from 'react';
import '../../styles/site.css';

export default function Photo({ as: Tag = 'figure', photo, caption, ratio, pos = 'center', radius, instant = false, hover = true,
  shade = false, style, className = '', sizes, children }) {
  const img = useRef(null);
  const [state, setState] = useState('loading');
  useEffect(() => {
    setState('loading');
    const el = img.current;
    if (el && el.complete) setState(el.naturalWidth ? 'ready' : 'fail');
  }, [photo.src]);
  const aspect = ratio === 'auto' ? undefined : (ratio || (photo.w && photo.h ? `${photo.w} / ${photo.h}` : undefined));
  return (
    <Tag className={`vs-photo ${hover ? 'vs-photo--zoom' : ''} is-${state === 'loading' ? 'loading' : state} ${className}`}
      style={{ aspectRatio: aspect, borderRadius: radius, ...style }}>
      {state !== 'fail' && (
        <img ref={img} src={photo.src} alt={photo.alt} width={photo.w} height={photo.h} sizes={sizes}
          loading={instant ? 'eager' : 'lazy'} decoding="async" fetchpriority={instant ? 'high' : undefined}
          onLoad={() => setState('ready')} onError={() => setState('fail')} style={{ objectPosition: pos }} />
      )}
      {state === 'fail' && <div className="vs-photo__fail" role="img" aria-label={photo.alt}>Photo unavailable</div>}
      {caption && state !== 'fail' && (Tag === 'figure' ? <figcaption>{caption}</figcaption> : <span className="vs-photo__cap">{caption}</span>)}
      {shade && !caption && <span className="vs-photo__cap" aria-hidden="true" />}
      {children}
    </Tag>
  );
}
