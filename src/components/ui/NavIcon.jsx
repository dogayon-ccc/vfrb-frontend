// src/components/ui/NavIcon.jsx
// FF-4 FIX (Aug 30 2026): extracted while converting AdminLayout.jsx /
// CustomerLayout.jsx off raw emoji nav icons to lucide-react. Both files
// had the same "flex-centered icon-sized span wrapping an icon" markup
// repeated at every nav render site (sidebar links, manager-extra links,
// the More drawer, and — in CustomerLayout — a badge-overlay variant for
// the unread-messages dot). One component, one place to change sizing/
// centering logic instead of maintaining it inline at each call site.
//
// `icon` is a lucide-react component reference (e.g. `Package`, not
// `<Package/>`), matching how the NAV/STAFF_NAV/MOB_NAV arrays store
// icons in both layouts: { icon: Package, label: 'Inventory', ... }.
//
// `children` is optional and exists for the one real non-decorative case
// (CustomerLayout's collapsed-sidebar unread dot) — not for general reuse.
export default function NavIcon({ icon: Icon, size = 16, width, strokeWidth = 2, style, children }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, width: width ?? size + 4, position: 'relative',
      ...style,
    }}>
      <Icon size={size} strokeWidth={strokeWidth}/>
      {children}
    </span>
  );
}
