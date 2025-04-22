import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/": "https://wzpmff-3000.csb.app",
      '/socket.io': {
        target: 'https://wzpmff-3000.csb.app', // Your Socket.io server address
        changeOrigin: true,
        ws: true, // Important: This enables WebSocket proxying
      }
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/hooks": path.resolve(__dirname, "./hooks"),
      "@components": path.resolve(__dirname, "./components"),
    },
  },
});
