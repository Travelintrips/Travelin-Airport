import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { tempo } from "tempo-devtools/dist/vite";

// https://vitejs.dev/config/
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
    middlewareMode: false,
    setupMiddlewares: async (middlewares) => {
      try {
        const history = await import("connect-history-api-fallback");
        middlewares.use(
          history.default({
            rewrites: [{ from: /^\/.*$/, to: "/index.html" }],
          })
        );
      } catch (err) {
        console.warn("⚠️ 'connect-history-api-fallback' not found, skipping fallback middleware.");
      }
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
