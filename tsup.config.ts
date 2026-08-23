import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  treeshake: true,
  sourcemap: false,
  clean: true,
  minify: true,
  external: ["react", "react-dom"],
  async onSuccess() {
    const { copyFileSync } = await import("fs");
    copyFileSync("src/styles/calendar.css", "dist/calendar.css");
  },
});
