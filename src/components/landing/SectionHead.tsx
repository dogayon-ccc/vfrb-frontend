import Reveal from './Reveal';

type SectionHeadProps = { label: string; aside?: string };

// Section label, rule, aside: sections are not a sequence, so no chapter numbers.
export default function SectionHead({ label, aside }: SectionHeadProps) {
  return (
    <Reveal className="lp-head">
      <span className="lp-head__k">{label}</span>
      <span className="lp-head__rule" aria-hidden="true" />
      {aside && <span className="lp-head__k lp-head__aside">{aside}</span>}
    </Reveal>
  );
}
