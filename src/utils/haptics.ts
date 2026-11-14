// Tactile feedback: navigator.vibrate on supporting phones, a short CSS pulse on the element elsewhere. Silent when the user prefers reduced motion.
type Pattern = 'tick' | 'snap' | 'success' | 'warn';

const PATTERNS: Record<Pattern, number | number[]> = { tick: 8, snap: 14, success: [10, 40, 18], warn: [30, 40, 30] };
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function haptic(kind: Pattern = 'tick', el?: Element | null): void {
  if (reduced()) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(PATTERNS[kind]);
  if (el instanceof HTMLElement && !el.dataset.pulsing) {
    el.dataset.pulsing = '1';
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 140, easing: 'ease-out' }).finished
      .catch(() => {}).finally(() => { delete el.dataset.pulsing; });
  }
}
