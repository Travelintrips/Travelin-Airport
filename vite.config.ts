import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { tempo } from "tempo-devtools/dist/vite";
import history from "connect-history-api-fallback"; // ➕ untuk SPA routing fallback

export default defineConfig({
  base: "/",
  optimizeDeps: {
    entries: ["src/main.tsx", "src/tempobook/**/*"],
    force: true,
  },
  plugins: [react(), tempo()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      process.env.VITE_SUPABASE_URL || ""
    ),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || ""
    ),
  },
  server: {
    allowedHosts: true,
    hmr: {
      protocol: process.env.TEMPO === "true" ? "wss" : "ws",
    },
    fs: {
      strict: false,
    },
    // ⬇ Tambahkan fallback untuk React Router di Vite dev server
    middlewareMode: false,
    setupMiddlewares: (middlewares) => {
      middlewares.use(
        history({
          rewrites: [{ from: /^\/.*$/, to: "/index.html" }],
        })
      );
      return middlewares;
    },
  },
  build: {
    outDir: "dist",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
