import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("lucide-react")) return "ui-icons";
          if (id.includes("react-dom") || id.includes("react/")) return "react-core";
          if (
            id.includes("three/") ||
            id.includes("@react-three") ||
            id.includes("@pmndrs") ||
            id.includes("maath") ||
            id.includes("three-stdlib") ||
            id.includes("zustand")
          ) {
            return "three-engine";
          }
          return "vendor";
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  }
});
