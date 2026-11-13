// Preview the marketing site with Vercel's cleanUrls behaviour, so /download
// resolves the same way it will in production.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../../site/', import.meta.url)));
const port = Number(process.argv[3] ?? 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

async function find(pathname) {
  const safe = normalize(pathname).replace(/^([/\\])+/, '');
  if (safe.includes('..')) return null;
  const candidates = pathname.endsWith('/')
    ? [join(root, safe, 'index.html')]
    : [join(root, safe), join(root, `${safe}.html`), join(root, safe, 'index.html')];
  for (const candidate of candidates) {
    try { if ((await stat(candidate)).isFile()) return candidate; } catch { /* next */ }
  }
  return null;
}

http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const file = await find(decodeURIComponent(url.pathname));
  if (!file) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Site preview: http://127.0.0.1:${port}/`);
});
