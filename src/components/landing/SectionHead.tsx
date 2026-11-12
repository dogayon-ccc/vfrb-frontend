import Reveal from './Reveal';

type SectionHeadProps = { n: string; label: string; aside?: string };

// "01 — Label ———— aside": the numbered chapter rule between sections.
export default function SectionHead({ n, label, aside }: SectionHeadProps) {
  return (
    <Reveal className="lp-head">
      <span className="lp-head__k"><b>{n}</b> — {label}</span>
      <span className="lp-head__rule" aria-hidden="true" />
      {aside && <span className="lp-head__k lp-head__aside">{aside}</span>}
    </Reveal>
  );
}
