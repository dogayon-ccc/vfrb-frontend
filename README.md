# VFRB Enterprise: frontend

Web system for **VFRB Enterprise**, a uniform maker in Muntinlupa. Customers design bulk uniform orders in the browser and follow them to delivery. The VFRB team proposes dates, records payments, runs seven production stations, checks quality, delivers and keeps stock.

This repository is the **React frontend**. The API is the Laravel backend in a separate repository (`vfrb-capstone`).

## How the system works

```
Customer: Design Studio -> Save -> My Designs -> Order wizard -> Submit
Manager:  Send proposal -> (customer accepts) -> Record down payment -> production starts
Stations: Pattern -> Segregation -> Cutting -> Sewing -> QC -> Pressing -> Packing (output logged per stage)
Manager:  Delivery (preparing -> in transit -> delivered) -> invoice issued -> payment recorded -> Completed
Cron:     07:00 Manila daily digest: overdue flags, low stock, RFQ drafts, KPI snapshot
```

| Role | What they do |
|---|---|
| Customer | Designs uniforms, places orders, accepts proposals, sees **status only** (never prices or stage names) |
| Administrator (Manager) | Full write access: orders, production, stock, purchasing, money, users |
| Administrator (Station) | Logs output for one assigned stage; the server refuses other stages |
| Owner | Read-only view of business pages; every write is refused (403) |

Product rules: bulk uniform orders only; VFRB creates customer accounts (no self-registration, only "Request access"); no supplier portal; the AI only suggests raw-material **types** (never quantity, yardage, BOM or price); 3D is shown only for garments with a model and is labelled "3D preview (approximate)".

Full documentation: `docs/manuscript/` on branch `docs/manuscript-nov9` (user manual, architecture, HIPO, screenshots) and `docs/engineering/SYSTEM_DESIGN.md`.

## Stack

React 18, Vite 8, Tailwind 4, Fabric 6 (2D Studio), Three 0.150 + React Three Fiber/drei (lazy-loaded 3D), Framer Motion 10, Axios. Hosted on Vercel. Backend: Laravel 12, PHP 8.4, PostgreSQL on Supabase, Cloudinary, Google Gemini.

## Project layout

| Path | Contents |
|---|---|
| `src/App.jsx` | All routes and role guards |
| `src/pages/` | Public site pages, `auth/`, `client/` (customer), `admin/` |
| `src/pages/client/design-studio/` | Design Studio (canvas, tools, rulers, guides, 3D) |
| `src/layouts/adminNav.js` | Admin sidebar, page search and Quick add |
| `src/utils/jobAccess.js` | UI mirror of role access (the server enforces it) |
| `src/components/` | Shared UI, customer kit, admin UI |
| `public/` | Static assets, PWA icons, face-detector model, sitemap |
| `tools/logic-checks.mjs` | Logic checks (run with Node) |
| `docs/` | Engineering, validation and design notes |

## Run it locally

Requirements: Node 20+, and the backend running locally (see the backend README).

```bash
npm install
cp .env.example .env.local      # then fill in the values
VITE_PROXY_TARGET=http://127.0.0.1:8000 npx vite --port 5180 --strictPort
```

Environment variables (`.env.example`): `VITE_API_URL` (API base URL in production), `VITE_MODEL_BASE_URL` (3D model host), `VITE_PROXY_TARGET` (dev proxy for `/api`). Optional `VITE_GOOGLE_LOGIN=false` hides "Continue with Google".

Never point a dev server at the live database for testing. The demo stack is Vite on :5180 proxied to a local backend on :8000 with the `vfrb_demo` database.

## Build and checks

```bash
npm run build               # production build into dist/
node tools/logic-checks.mjs # logic checks, all must pass
```

## Deploy

Pushing to `main` deploys the frontend on Vercel (about 30 seconds). Each release is tagged (`defense-2026-11*`). Rollback: Vercel Instant Rollback to the previous deployment, or revert the commits. See `docs/engineering/DEPLOY_CHECKLIST.md`.

## Using the system

1. **Sign in** at `/login` with the account VFRB gave you. New customers select **Request access**.
2. **Customers:** Dashboard → **Design Studio** (pick a garment or set, colour it, add a logo, Save) → **My Designs** → **Review & order** (Sizes, Delivery, Review, Submit) → **Orders** to follow the status and accept VFRB's proposal.
3. **Manager:** Orders → open an order → **Send proposal** → after acceptance **Record down payment** → follow Production, QC and Delivery; stock, purchasing, payments and reports are in the sidebar.
4. **Station:** Output Log → choose the order → enter today's pieces for your stage.
5. **Owner:** read the Dashboard, Orders, Reports, Sales & Pay, Inventory and logs.

Press `?` in the Studio for all keyboard shortcuts and touch gestures.

## Privacy

No advertising or tracking cookies and no analytics. The browser keeps the sign-in token and a few preferences in local storage (see the Privacy Policy, section 7). The Studio face check runs on the device; the photo never leaves it.
