import { useState } from 'react';
import { PIECES } from './mock';
import { useMockDesign, Stage, StageHint, ViewToggle, Seg, ColourEditor, GarmentChoices, LogoEditor, ReviewList, StudioTop, LockNote, StudioState } from './parts';

// Option A "Guided": Garment > Colours > Logo/Text > Review, one step's controls at a time.
const STEPS = [{ id: 'garment', label: 'Garment' }, { id: 'colours', label: 'Colours' }, { id: 'logo', label: 'Logo & text' }, { id: 'review', label: 'Review' }];

export default function OptionGuided({ mobile, isSet, setIsSet, state }) {
  const d = useMockDesign(isSet);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState('top');
  const [target, setTarget] = useState('set');
  const [view, setView] = useState('2d');
  const locked = state === 'locked';
  const blocked = ['empty', 'loading', 'error'].includes(state);
  const colourTarget = isSet ? target : 'top';
  const pick = r => { setActive(r); if (isSet && target !== 'set') setTarget(r); };

  const body = (
    <>
      {locked && <LockNote mobile={mobile}/>}
      <h2 className="dl-serif dl-panel-h">{STEPS[step].label}</h2>
      {step === 0 && (
        <>
          <Seg label="Order type" value={isSet ? 'set' : 'single'} onChange={v => !locked && setIsSet(v === 'set')}
            options={[{ id: 'set', label: 'Top + bottom set' }, { id: 'single', label: 'Single piece' }]}/>
          {d.roles.map(r => (
            <section key={r} className="dl-group"><h3>{PIECES[r].label}</h3><GarmentChoices d={d} role={r} locked={locked}/></section>
          ))}
        </>
      )}
      {step === 1 && (
        <>
          {isSet && <Seg label="Colour which piece" value={target} onChange={v => { setTarget(v); if (v !== 'set') setActive(v); }}
            options={[{ id: 'set', label: 'Whole set' }, { id: 'top', label: 'Top' }, { id: 'bottom', label: 'Bottom' }]}/>}
          <ColourEditor d={d} target={colourTarget} locked={locked}/>
        </>
      )}
      {step === 2 && <LogoEditor d={d} locked={locked}/>}
      {step === 3 && <ReviewList d={d}/>}
    </>
  );

  const nav = (
    <div className="dl-stepnav">
      <button type="button" className="dl-btn" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Back</button>
      {step < 3
        ? <button type="button" className="dl-btn dl-btn-strong" onClick={() => setStep(s => s + 1)}>Next: {STEPS[step + 1].label}</button>
        : <button type="button" className="dl-btn dl-btn-primary" disabled={locked}>Continue to order</button>}
    </div>
  );

  const stepper = (
    <nav className="dl-stepper" aria-label="Design steps">
      {STEPS.map((s, i) => (
        <button key={s.id} type="button" aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)}>
          <span className="dl-step-n" aria-hidden="true">{i + 1}</span>{mobile && s.id === 'logo' ? 'Logo' : s.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="dl-studio" data-mobile={mobile || undefined}>
      <StudioTop mobile={mobile} locked={locked} empty={blocked} view={view} setView={setView} onReview={() => setStep(3)}/>
      {blocked ? <StudioState state={state}/> : mobile ? (
        <div className="dl-m-body">
          {stepper}
          <div className="dl-m-stage">
            <Stage d={d} active={active} onActive={pick} view={view} compact/>
            <div className="dl-m-stagebar"><ViewToggle view={view} setView={setView}/><StageHint view={view}/></div>
          </div>
          <div className="dl-m-panel">{body}</div>
          {nav}
        </div>
      ) : (
        <>
          {stepper}
          <div className="dl-a-grid">
            <main className="dl-a-canvas"><Stage d={d} active={active} onActive={pick} view={view}/><StageHint view={view}/></main>
            <aside className="dl-panel"><div className="dl-panel-scroll">{body}</div>{nav}</aside>
          </div>
        </>
      )}
    </div>
  );
}
