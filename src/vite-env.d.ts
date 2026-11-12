/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.svg?raw' { const src: string; export default src; }
