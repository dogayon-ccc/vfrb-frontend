import type { ElementType } from 'react';

type MaskLinesProps = { lines: string[]; as?: ElementType; id?: string; className?: string };

// Each line rises out of its own clipping box (Kage's mask-line reveal). Static under reduced motion.
export default function MaskLines({ lines, as: Tag = 'h1', id, className = '' }: MaskLinesProps) {
  return (
    <Tag id={id} className={className}>
      {lines.map((line, i) => (
        <span key={line} className="lp-mask"><span style={{ '--i': i }}>{line}</span>{i < lines.length - 1 && ' '}</span>
      ))}
    </Tag>
  );
}
