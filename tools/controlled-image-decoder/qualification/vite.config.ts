import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const csp = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "connect-src 'self'",
  "img-src 'self'",
  "style-src 'self'",
].join("; ");

export default defineConfig({
  root: fileURLToPath(new URL("./browser", import.meta.url)),
  publicDir: fileURLToPath(new URL("./static", import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
  server: { headers: { "Content-Security-Policy": csp } },
  preview: { headers: { "Content-Security-Policy": csp } },
});
