// src/components/ui/Stepper.jsx
// Ordered progress: done steps filled, the current one ringed, a blocked one marked amber.
// steps: string[]; current: index; blocked: index that is held (e.g. QC hold). On phones labels collapse
// to a caption naming the current step. kit.Stepper renders this. Styles: .ui-steps in styles/theme.css.
import { Check } from 'lucide-react';

export default function Stepper({ steps, current, blocked, label = 'Progress', className = '' }) {
  const idx = Math.min(Math.max(current ?? 0, 0), steps.length - 1);
  return (
    <div className={className}>
      <ol className="ui-steps" aria-label={label} style={{ '--n': steps.length }}>
        {steps.map((s, i) => {
          const state = i === blocked ? 'blocked' : i < current ? 'done' : i === current ? 'now' : 'todo';
          return (
            <li key={s} className="ui-step" data-s={state} aria-current={i === current ? 'step' : undefined}>
              <span className="ui-step-dot" aria-hidden="true">
                {state === 'done' ? <Check size={15} strokeWidth={3} /> : i + 1}
              </span>
              <span className="ui-step-lbl">
                {s}
                {state === 'done' && <span className="sr-only">, done</span>}
                {state === 'blocked' && <span className="sr-only">, on hold</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="ui-steps-cap" aria-hidden="true">Step {idx + 1} of {steps.length}: <strong>{steps[idx]}</strong></p>
    </div>
  );
}
