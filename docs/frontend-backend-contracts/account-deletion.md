# Contract: Client account deletion / deactivation
Status: NOT IMPLEMENTED in backend (no route in routes/api.php). Frontend shows no delete UI until this exists.

- Endpoint: `DELETE /api/customer/account` (auth:sanctum, client role only)
- Request: `{ "current_password": "string", "confirm": "DELETE" }` (re-auth required; Google-only accounts need an alternative re-auth, backend to decide)
- Success: `200 { "message": "Account deleted." }` — all Sanctum tokens for the user revoked; frontend clears session and redirects to `/login`.
- Errors: `422` wrong password/confirm (field errors), `409` account has active/in-production orders (message shown verbatim), `401` session expired.
- Behavior: irreversible; backend decides anonymize vs. hard delete and must preserve order records needed by VFRB.
- Frontend: Settings > Password & Security > "Delete account" danger card with irreversible warning, password field, typed confirmation, success/error states.
