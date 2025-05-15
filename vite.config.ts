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
        // Ensure proper output for IIFE
        entryFileNames: "react-widget-uv.iife.js",
      },
    },
  },
});
