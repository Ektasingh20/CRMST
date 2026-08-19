import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5174,
    strictPort: true,
    proxy: {
      "/api/": {
        target: "http://localhost:4005",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

