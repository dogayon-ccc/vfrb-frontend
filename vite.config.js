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

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
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
  },
  envPrefix: "VITE_",
}));
