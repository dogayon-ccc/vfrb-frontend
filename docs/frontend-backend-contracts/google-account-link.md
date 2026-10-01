# Contract: Google account connection status / disconnect
Status: NOT IMPLEMENTED. `users.google_id` exists but is hidden from API responses, so the UI cannot show link state.

- `GET /api/customer/profile` → add `google_linked: boolean` (never expose `google_id`).
- `DELETE /api/customer/google` → unlink; `422` if account has no password set (user must set one first).
- Linking stays a full-page server-mediated flow (`/auth/google/redirect`); no client secrets in frontend.
- Frontend: "Google Account" card in Password & Security showing Connected/Not connected + Disconnect.
