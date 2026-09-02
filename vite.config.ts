import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        id: "/",
        name: "Outil de voyage — Toyota Hilux",
        short_name: "Voyage",
        description:
          "Planification et suivi d'un voyage en itinérance : carte, budget, tâches, Loki.",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        background_color: "#2e2b25",
        theme_color: "#2e2b25",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // App shell + assets buildés : disponibles hors-ligne dès la première visite.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            // Tuiles OpenStreetMap : gardées en cache dès qu'elles ont été vues,
            // pour permettre la consultation de la carte dans les zones déjà
            // visitées même sans réseau (zones blanches Norvège/Balkans).
            urlPattern: ({ url }) =>
              /(^|\.)tile\.openstreetmap\.org$/.test(url.hostname),
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: {
                maxEntries: 4000,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 jours
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts.
            urlPattern: ({ url }) =>
              url.hostname === "fonts.googleapis.com" ||
              url.hostname === "fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Géocodage (Nominatim) et routage (OSRM) : nécessitent le réseau
            // par nature, mais on garde une réponse récente en secours.
            urlPattern: ({ url }) =>
              url.hostname === "nominatim.openstreetmap.org" ||
              url.hostname === "router.project-osrm.org",
            handler: "NetworkFirst",
            options: {
              cacheName: "routing-geocoding",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
