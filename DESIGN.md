# VFRB Client Design Brief
Concept: a tailor's atelier workroom, not a SaaS dashboard. Family workshop since 2000. Serves hospitals, schools, government: credible, warm, never gamer/neon/cyberpunk.
Feel: warm paper, ink text, teal thread accent, real fabric photography, stitch details.
Type: DM Serif Display for headings; ONE self-hosted characterful sans for UI (woff2, OFL license verified, no CDN; not Inter/Arial/system as the identity).
Color: paper/ink/thread tokens (--cx-*). No purple gradients, no equal shadow on everything, no stat-card grids.
Layout: asymmetric, one hero per page, garment imagery first. One title per page. One primary action per view.
Studio: design on the actual garment; gallery-first; contextual floating toolbar; lit stage; honest 3D labels.
Motion: 120–300ms, ease tokens, purposeful (state changes, selection, progress). Respect reduced-motion.
Flow: Studio (template or "Upload my design") -> AI material TYPE recommendation -> OrderWizard (quantity, sizes, delivery, PO, notes, review) -> Order Detail (status, 7-stage tape, messages) -> admin.
Never: pricing/quantities/formulas/BOM/yardage/stock shown to customers; fake 3D; build-from-blank; native apps, haptics, biometrics, price-negotiation UI, auto-BOM.
Every surface: loading, empty, error, success states; 44px targets; no horizontal overflow at 375/768/1366.
