const t = (bg, fg) => ({ bg, fg });
export const STATUS_TONE = {
  pending: t('var(--warning-bg)', 'var(--warning-text)'),
  confirmed: t('var(--info-bg)', 'var(--info-text)'),
  pattern: t('var(--purple-50)', 'var(--purple-text)'),
  segregation: t('var(--purple-50)', 'var(--purple-text)'),
  cutting: t('#eef2ff', '#4338ca'),
  sewing: t('#ecfeff', '#0e7490'),
  qc: t('#fff7ed', '#c2410c'),
  pressing: t('#fdf2f8', '#be185d'),
  packing: t('#fdf2f8', '#be185d'),
  completed: t('var(--success-bg)', 'var(--success-text)'),
  delivered: t('var(--success-bg)', 'var(--success-text)'),
  cancelled: t('var(--danger-bg)', 'var(--danger-text)'),
  active: t('var(--success-bg)', 'var(--success-text)'),
  inactive: t('var(--danger-bg)', 'var(--danger-text)'),
  default: t('var(--bg-surface)', 'var(--text-muted)'),
};
