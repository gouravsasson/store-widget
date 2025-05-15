import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/widget.tsx"),
      name: "ReactWidget",
      fileName: "react-widget-uv",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        // Ensure CSS is bundled
        assetFileNames: "react-widget-uv.[ext]",
      },
    },
    // Minify for production
    minify: "esbuild",
    // Generate sourcemaps
    sourcemap: true,
  },
  // Ensure CSS is properly injected into Shadow DOM
  css: {
    modules: {
      generateScopedName: "[name]__[local]___[hash:base64:5]",
    },
  },
});