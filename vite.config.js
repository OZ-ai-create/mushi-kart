import os from "node:os";
import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

function lanHost() {
  const nets = os.networkInterfaces();
  for (const addrs of Object.values(nets)) {
    for (const net of addrs ?? []) {
      const family = net.family === "IPv4" || net.family === 4;
      if (family && !net.internal) return net.address;
    }
  }
  return "localhost";
}

const useHttps = process.env.MUSHI_HTTPS === "1";

export default defineConfig({
  base: "./",
  plugins: useHttps ? [basicSsl()] : [],
  define: {
    __LAN_HOST__: JSON.stringify(lanHost()),
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
