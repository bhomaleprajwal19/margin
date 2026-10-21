import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, /api is proxied to Django so the browser sees one origin (no CORS needed).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: process.env.VITE_API_PROXY || "http://127.0.0.1:8000", changeOrigin: true },
    },
  },
  test: { environment: "node" },
});
