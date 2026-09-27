// Escapes text before it's interpolated into a document.write() print template.
// The print windows in PhysicalCount.jsx/PurchaseOrders.jsx build raw HTML
// strings (not JSX), so React's normal auto-escaping never applies to them —
// any material/supplier/notes field containing markup would run as-is in the
// popup. SanitizeInput (backend) strips <script>/on*= on input, but that's a
// regex allowlist, not output encoding — this is the output-side complement.
export const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
