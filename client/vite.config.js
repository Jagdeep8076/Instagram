import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Reads PORT from ../server/.env so the client always talks to the port the server really uses.
function serverPort() {
  const candidates = [
    path.resolve(process.cwd(), '../server/.env'),
    path.resolve(process.cwd(), 'server/.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        const env = fs.readFileSync(c, 'utf8');
        const m = env.match(/^\s*PORT\s*=\s*"?(\d+)"?/m);
        if (m) return m[1];
      }
    } catch {}
  }
  return '5000';
}

const target = `http://localhost:${serverPort()}`;
console.log(`[vite] proxying /api, /uploads and /socket.io -> ${target}`);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': target,
      '/uploads': target,
      '/socket.io': { target, ws: true },
    },
  },
});
