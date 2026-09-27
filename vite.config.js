// vite.config.js — VFRB Enterprise
// ROOT CAUSE OF YOUR 500 ERROR:
//   Old vite.config.js had:  target: "http://localhost:8000"
//   That requires `php artisan serve` running on port 8000.
//   You stopped running php artisan serve (correct!).
//   So every /api/* request hit a dead port → ECONNREFUSED → 500.
//
// THE FIX (this file):
//   target: "http://vfrb-capstone.test"
//   Laragon automatically serves your backend at this domain.
//   No php artisan serve needed ever again.
//
// DAILY WORKFLOW (the only correct way):
//   1. Open Laragon → Start All
//   2. Open terminal → cd ~/Desktop/threejs/client → npm run dev
//   3. Open browser → http://localhost:5173
//   ❌ NEVER run: php artisan serve

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // PWA support (Aug 24 2026) — makes VFRB installable to the home
    // screen with a splash screen and full-screen app chrome (no browser
    // address bar), and caches static assets + recently-viewed pages for
    // offline access. This is pure build/infra config — zero changes to
    // any existing component or page.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon-16x16.png", "favicon-32x32.png", "favicon-48x48.png", "apple-touch-icon.png"],
      manifest: {
        name: "VFRB Enterprise",
        short_name: "VFRB",
        description: "AI-Enabled Sales and Inventory Management System with Raw Materials Recommendation",
        theme_color: "#028090",
        background_color: "#f1f5f9",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Aug 30 2026 hardening — verified live Railway bug: a browser
        // tab's old service worker (or its precached index.html) can keep
        // serving a stale asset manifest after a redeploy, so a
        // lazy-loaded route requests a chunk hash that no longer exists
        // on the server → MIME error, page crash (see
        // PageErrorBoundary.jsx's chunk-load fix, added same session,
        // which is the other half of this). skipWaiting + clientsClaim
        // make a new service worker take over immediately instead of
        // waiting for every open tab to close first; cleanupOutdatedCaches
        // drops any precache entries from a prior build the moment the
        // new one activates.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // NetworkFirst for API calls: always try live data first (this is
        // a real-time operational system — stock counts, order status —
        // stale-while-offline is only a fallback, never the default),
        // falling back to the last successful response if the network is
        // down. Static assets (JS/CSS/images) use the default
        // precache-and-serve strategy, safe since they're versioned by
        // build hash.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Exclude the 3 heaviest, conditionally-used vendor chunks from the
        // install-time precache (Account 7 perf pass, Sep 27 2026): Workbox's
        // globPatterns ignores React.lazy() boundaries entirely and eagerly
        // downloads every matching chunk right after SW install, so
        // three-*.js (1.6MB, only Design Studio 3D / admin GarmentPreview3D),
        // bg-remove-*.js (716KB onnxruntime, only on non-SVG logo upload),
        // and charts-*.js (515KB recharts, admin Reports/Dashboard only)
        // were being force-downloaded to every visitor's device shortly
        // after landing, defeating the manualChunks lazy-load split in this
        // same file. Left as normal on-demand fetches instead (still
        // content-hashed + browser-cached); measured precache drop: ~4.9MB
        // -> ~2.1MB. Runtime correctness is unaffected — dynamic import()
        // doesn't depend on SW precache.
        globIgnores: ["**/three-*.js", "**/bg-remove-*.js", "**/charts-*.js"],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "vfrb-api-cache",
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
            },
          },
        ],
      },
      devOptions: {
        // Disabled in dev by default — avoids service-worker caching
        // interfering with Vite's HMR during daily development. Only
        // active in production builds (Railway deploys).
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://vfrb-capstone.test",
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: { overlay: true },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Account 7 perf fix (Sep 27 2026): Vite/Rolldown's own internal
          // lazy-route preload helper (used by every React.lazy()/router
          // dynamic import) had no chunk of its own under the rules below,
          // so Rolldown's default placement fused it into whichever vendor
          // chunk built first — in this repo, the 2.4MB "three" chunk. Every
          // lazy route calls that helper, so the entire three chunk ended up
          // as a top-level static import of the main entry (visible as a
          // modulepreload of three-*.js in dist/index.html) — every visitor,
          // even on the login page, downloaded 2.4MB of Three.js before the
          // app could render anything. Giving the helper its own explicit
          // tiny chunk fixed this (verified: three-*.js no longer appears in
          // dist/index.html's modulepreload list or the entry's static
          // imports after this change).
          // Known residual, NOT fixed by this: "charts" (recharts, 515KB)
          // is still eagerly pulled into the entry the same way, because
          // recharts's own nested react-redux dependency requires() react
          // synchronously — Rolldown keeps that CJS require chain in one
          // chunk rather than honoring the manualChunks split, even with
          // react/react-dom checked first below (tried, confirmed via
          // build sourcemap it doesn't change the outcome). Leaving
          // recharts unbucketed entirely was tried too — it stopped the
          // chunk fusion but silently reintroduced the ~500KB into the PWA
          // install-time precache under new, unpredictable chunk names not
          // covered by globIgnores below, a worse regression. Kept bucketed
          // as "charts" (excluded from precache) as the lesser of the two
          // known issues; a real fix needs upstream Rolldown/recharts work,
          // not more manualChunks guessing.
          if (id.includes("vite/preload-helper")) return "preload-helper";
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router-dom") || id.includes("/react-dom/") || id.includes("/react/") || id.includes("/react-is/") || id.includes("/scheduler/")) return "react-vendor";
          if (id.includes("@react-three") || id.includes("/three/")) return "three";
          // Task 2 (logo auto-transparency): @huggingface/transformers pulls
          // in onnxruntime-web (WASM/ONNX runtime) — large and lazy-loaded
          // only when a customer uploads a non-SVG logo in Design Studio,
          // so it earns its own chunk rather than bloating the main bundle
          // every visitor downloads. Mirrors the reference repo's own
          // vite.config.js, which does exactly this split.
          if (id.includes("@huggingface/transformers") || id.includes("onnxruntime")) return "bg-remove";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("recharts")) return "charts";
          if (id.includes("axios")) return "utils";
        },
      },
    },
    chunkSizeWarningLimit: 800,
    minify: mode === "production" ? "esbuild" : false,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "framer-motion",
      "axios",
      "recharts",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
    ],
    // @huggingface/transformers manages its own WASM/worker loading
    // internally — letting esbuild pre-bundle it breaks that at dev
    // time. This matches the reference repo's own vite.config.js
    // (`optimizeDeps: { exclude: ['@huggingface/transformers'] }`),
    // confirmed by reading it directly rather than assumed.
    exclude: ["@huggingface/transformers"],
  },
  envPrefix: "VITE_",
}));
