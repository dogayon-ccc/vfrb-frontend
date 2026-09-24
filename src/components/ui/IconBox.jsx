// src/components/ui/IconBox.jsx
// FF-4 FIX (Aug 30 2026): extracted from AdminLayout.jsx / CustomerLayout.jsx —
// both files had the same "flex-centered icon-sized span wrapping a
// lucide-react component" markup repeated 15 times combined (7 render
// sites in AdminLayout, 8 in CustomerLayout) after today's emoji→icon
// swap. One component, one place to change sizing/centering logic.
//
// RENAMED from NavIcon.jsx (Aug 30 2026, later same day): a second,
// unrelated component also named `NavIcon` was added in
// src/components/ui/icons.jsx that same day — different signature
// entirely (name="orders" string lookup vs. icon={Component} reference
// here), exported through the ui/index.js barrel under the same name.
// Nothing was broken by this yet (checked every current call site by
// hand — each file happens to import the one it actually needs), but
// it was a real landmine: importing NavIcon from the wrong path/barrel
// silently renders an empty box instead of erroring, so a future edit
// grabbing the wrong one would fail quietly, not loudly. Renamed this
// file to IconBox — describes what it actually does (wraps an icon in
// a centered, sized box) — so the two can never collide again.
//
// `icon` is a lucide-react component reference (e.g. `Package`, not
// `<Package/>`), matching how NAV/STAFF_NAV/MOB_NAV arrays already
// store icons: { icon: Package, label: 'Inventory', ... }.
export default function IconBox({ icon: Icon, size = 16, width, strokeWidth = 2, style, children }) {
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
