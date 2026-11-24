// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  plugins: [
    // Offline app shell. Registered only by src/lib/pwa-register.ts (never in dev or Lovable previews).
    VitePWA({
      strategies: "generateSW",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: false, // public/manifest.webmanifest is the manifest
      devOptions: { enabled: false },
      // The plugin runs once per build environment; pin output and precache to the browser bundle.
      outDir: "dist/client",
      workbox: {
        globDirectory: "dist/client",
        navigateFallback: null,
        globPatterns: ["**/*.{js,css,svg,woff2,webmanifest}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Pages: always try the network first; fall back to the last copy when offline.
            urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth") && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/lovable/"),
            handler: "NetworkFirst",
            options: { cacheName: "beacon-pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 60, maxAgeSeconds: 30 * 86400 } },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: { cacheName: "beacon-assets", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 86400 } },
          },
        ],
      },
    }),
  ],
});
