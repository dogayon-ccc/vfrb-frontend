# ADR: Route veil (0.7s wipe)

Status: Accepted. Date: 2026-11-14.

Context: the owner wants a visible, smooth transition between public, auth and dashboard areas, no longer than 0.7s, with no blocking splash.

Decision: `RouteVeil` renders a fixed, `pointer-events: none` overlay keyed on a run counter. It plays one CSS wipe (700ms) when the route changes on public and auth pages, and when the area changes (site, auth, app, admin, studio). Page changes inside a dashboard do not play it. Chunks are already prefetched on idle, and React Router keeps the old page until the next chunk is ready, so the veil never waits on the network. Reduced motion hides it.

Rejected: a Suspense fallback splash (blocks on network), the View Transitions API (inconsistent support, removed earlier), a wipe on every dashboard click (slows daily admin work).

Consequences: the overlay adds no wait to navigation. A cold chunk that is slower than 0.7s shows a blank page after the wipe; the idle prefetch makes that rare. Revisit if measured chunk times say otherwise.
