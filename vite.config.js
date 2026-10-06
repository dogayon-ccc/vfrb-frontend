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

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const proxyTarget = loadEnv(mode, process.cwd(), "").VITE_PROXY_TARGET || "http://vfrb-capstone.test";
  return {
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
        // Without a denylist the SW answers EVERY same-origin navigation with the cached index.html, so a
        // direct visit/download of a backend-served path (API file/PDF, storage file, OAuth redirect on a
        // same-origin proxy) would render the SPA shell instead of reaching the server.
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /^\/storage\//, /^\/sanctum\//],
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
        globIgnores: ["**/three-*.js", "**/fabric-*.js", "**/bg-remove-*.js", "**/charts-*.js"],
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
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
    hmr: { overlay: true },
  },
  build: {
    rollupOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "preload-helper", test: /vite[\\/]preload-helper/, priority: 100 },
            { name: "react-vendor", test: /node_modules[\\/](react|react-dom|react-is|scheduler|react-router|react-router-dom)[\\/]/, priority: 90 },
            { name: "three", test: /node_modules[\\/](@react-three|three)[\\/]/, priority: 80 },
            { name: "fabric", test: /node_modules[\\/]fabric[\\/]/, priority: 75 },
            { name: "bg-remove", test: /node_modules[\\/](@huggingface[\\/]transformers|onnxruntime[^\\/]*)[\\/]/, priority: 70 },
            { name: "motion", test: /node_modules[\\/]framer-motion[\\/]/, priority: 60 },
            { name: "charts", test: /node_modules[\\/](recharts|react-redux|@reduxjs|redux|reselect|immer|d3-[^\\/]+|victory-vendor|decimal\.js-light|es-toolkit)[\\/]/, priority: 50 },
            { name: "utils", test: /node_modules[\\/]axios[\\/]/, priority: 40 },
          ],
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
};
});
