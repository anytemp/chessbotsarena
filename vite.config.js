import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/chessbotsarena/', // Updated to match your GitHub repository name exactly (lowercase)
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
