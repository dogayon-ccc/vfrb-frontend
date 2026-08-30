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
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
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
        // NetworkFirst for API calls: always try live data first (this is
        // a real-time operational system — stock counts, order status —
        // stale-while-offline is only a fallback, never the default),
        // falling back to the last successful response if the network is
        // down. Static assets (JS/CSS/images) use the default
        // precache-and-serve strategy, safe since they're versioned by
        // build hash.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
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
          if (!id.includes("node_modules")) return;
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
          if (id.includes("react-router-dom") || id.includes("/react-dom/") || id.includes("/react/")) return "react-vendor";
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
