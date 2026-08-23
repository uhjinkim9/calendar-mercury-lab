import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Point directly at source so tsup build is not required during dev
  resolve: {
    alias: { "./src": "/src" },
  },
});
