// src/components/ui/BottomSheet.jsx
// ─────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
// Ported from the real Figma reference (vfrb-admin-portal-8screens-2026-09-01
// /admin-redesign/src/components/shared.tsx — confirmed the more mobile-
// mature of the two Figma exports for this pattern: BottomSheet is used
// consistently across Materials/QCChecklist/Suppliers/OutputLog there, with
// ZERO usage anywhere in the "Admin_Manager_Mobile_Portal_Redesign" zip
// despite that name suggesting the opposite — checked directly with grep
// across both, not assumed from either zip's filename).
//
// Every admin page's add/edit modal (Materials.jsx, UserManagement.jsx,
// and others not yet touched) currently hand-rolls a centered dialog —
// correct for desktop, wrong for mobile: a centered box with a 2-3 column
// form grid is the exact "cramped on a phone" pattern already fixed once
// this session. A bottom sheet (full-width, slides up, grab handle) is
// the real mobile convention this Figma reference actually specifies.
//
// This component is BOTH breakpoints in one place, not two separate
// modal implementations to keep in sync: pass `isMobile` (every admin
// page needing this already computes it via the same window.innerWidth
// pattern — see Materials.jsx/UserManagement.jsx) and it renders the
// sheet on mobile, a centered dialog on tablet/desktop, sharing the same
// header/children/close-button markup either way.
//
// Usage:
//   <BottomSheet title="Add Material" onClose={close} isMobile={isMobile}>
//     ...form fields...
//   </BottomSheet>
// ─────────────────────────────────────────────────────────────────────────
export default function BottomSheet({
  title, onClose, children, isMobile, maxHeight = '85vh', maxWidth = 480,
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,.32)',
        display: 'flex',
        alignItems:    isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isMobile ? 480 : maxWidth,
          maxHeight: isMobile ? maxHeight : '88vh',
          margin: isMobile ? '0 auto' : '0 16px',
          background: 'var(--bg-card)',
          borderRadius: isMobile ? '18px 18px 0 0' : 'var(--r-lg)',
          boxShadow: '0 -8px 40px rgba(0,0,0,.25)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isMobile && (
          <div style={{
            width: 40, height: 4, borderRadius: 2,
            background: 'var(--border)', margin: '10px auto 2px',
          }}/>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: isMobile ? '10px 20px 14px' : '16px 22px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
            {title}
          </h3>
          <button onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: 'var(--bg-surface)', color: 'var(--text-muted)',
              fontSize: 14, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
        </div>
        <div style={{ padding: isMobile ? '18px 20px 28px' : '20px 22px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
