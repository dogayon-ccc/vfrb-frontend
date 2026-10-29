// Unread pill for nav items; `corner` pins it to the icon when no label is shown.
export default function NavBadge({ n, corner = false }) {
  if (!n) return null;
  return (
    <>
      <b className={`nav-unread${corner ? ' corner' : ''}`} aria-hidden="true">{n > 9 ? '9+' : n}</b>
      <span className="sr-only">, {n} unread</span>
    </>
  );
}
