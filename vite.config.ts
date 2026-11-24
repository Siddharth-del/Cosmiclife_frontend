import { fileURLToPath, URL } from "node:url";
import type { ServerResponse } from "node:http";
import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = (env.VITE_API_PROXY_TARGET || env.VITE_API_URL || "http://localhost:8080").trim().replace(/\/+$/, "");

  const apiProxy: Record<string, ProxyOptions> = {
    "/api": {
      target: apiTarget,
      changeOrigin: true,
      configure(proxy) {
        proxy.on("proxyReq", (proxyReq) => {
          proxyReq.removeHeader("origin");
          proxyReq.removeHeader("referer");
        });
        proxy.on("error", (_err, _req, res) => {
          const out = res as ServerResponse;
          if ("headersSent" in out && !out.headersSent && !out.writableEnded) {
            out.writeHead(502, { "Content-Type": "application/json" });
            out.end(JSON.stringify({ message: `Can't reach the API at ${apiTarget}. Is the backend running?` }));
          }
        });
      },
    },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "localhost",
      port: 5173,
      strictPort: true,
      proxy: apiProxy,
    },
    preview: {
      host: "localhost",
      port: 4173,
      proxy: apiProxy,
    },
    build: {
      target: "es2022",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules\/(react|react-dom|scheduler|react-router|cookie|set-cookie-parser)\//.test(id)) return "react";
            if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return "motion";
            return "vendor";
          },
        },
      },
    },
  };
});
