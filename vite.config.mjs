import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Node server (server.js) owns the quiz state. In dev, Vite serves the new client
// and passes API calls and the live stream through to the server on port 4173.
const serverUrl = `http://localhost:${process.env.PORT || 4173}`;

export default defineConfig({
  root: "client",
  plugins: [react()],
  css: {
    preprocessorOptions: {
      // Carbon's own Sass still uses syntax that newer Sass versions warn about; those warnings aren't ours to fix.
      scss: { quietDeps: true }
    }
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    // Built files go to /app/; client/public/ (the favicon in assets/) is copied to dist/ as it is.
    assetsDir: "app",
    rollupOptions: {
      input: {
        participant: "client/participant.html",
        host: "client/host.html",
        display: "client/display.html"
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": serverUrl,
      "/events": serverUrl
    }
  }
});
