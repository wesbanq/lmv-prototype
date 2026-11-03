// Static file server for the prototype: `bun start` (or `bun dev` for auto-restart on server changes).
import { resolve, sep } from 'node:path';

const root = import.meta.dir;
const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const path = resolve(root, '.' + rel);

    // never serve anything outside the project folder
    if (path !== root && !path.startsWith(root + sep)) return new Response('Forbidden', { status: 403 });

    const file = Bun.file(path);
    if (await file.exists()) return new Response(file, { headers: { 'Cache-Control': 'no-cache' } });
    return new Response('Not found', { status: 404 });
  },
});

console.log(`Pickpart prototype → http://localhost:${server.port}`);
