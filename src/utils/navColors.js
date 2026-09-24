// Single color-per-page mapping. Dashboard's Quick Actions and AdminLayout's
// More-menu grid both call navColor(path) so the same page always gets the
// same tile color everywhere it appears, instead of two screens picking
// colors independently (one hand-picked, one index-cycled) and drifting.
const NAV_COLORS = {
  '/admin/orders':                { bg: '#e0f2f1', fg: '#028090' },
  '/admin/inventory':             { bg: '#fef3e2', fg: '#b45309' },
  '/admin/production':            { bg: '#ede9fe', fg: '#7c3aed' },
  '/admin/procurement':           { bg: '#e0f2fe', fg: '#0369a1' },
  '/admin/physical-count':        { bg: '#e0e7ff', fg: '#4338ca' },
  '/admin/reports':               { bg: '#dcfce7', fg: '#15803d' },
  '/admin/users':                 { bg: '#fce7f3', fg: '#be185d' },
  '/admin/delivery':               { bg: '#dbeafe', fg: '#1d4ed8' },
  '/admin/materials':             { bg: '#fef9c3', fg: '#a16207' },
  '/admin/output-log':            { bg: '#ffe4e6', fg: '#be123c' },
  '/admin/qc':                    { bg: '#d1fae5', fg: '#047857' },
  '/admin/production-incidents':  { bg: '#fee2e2', fg: '#dc2626' },
  '/admin/transactions':          { bg: '#e0e7ff', fg: '#3730a3' },
  '/admin/invoice':               { bg: '#f3e8ff', fg: '#7e22ce' },
  '/admin/suppliers':             { bg: '#dcfce7', fg: '#166534' },
  '/admin/feedback':              { bg: '#fee2e2', fg: '#b91c1c' },
  '/admin/settings':              { bg: '#e0e7ff', fg: '#4338ca' },
};
const FALLBACK = { bg: '#f1f5f9', fg: '#64748b' };

export const navColor = (path) => NAV_COLORS[path] ?? FALLBACK;
