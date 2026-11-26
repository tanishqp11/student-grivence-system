'use strict';

/**
 * Minimal local development server.
 *
 *   npm run dev
 *
 * Serves the static site from the project root and forwards /api/* to the same
 * serverless handler Vercel uses. Reads .env if present (no extra dependencies).
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

const handler = require('../api/index.js');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(filePath).pipe(res);
}

function resolveStatic(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidates = [];

  if (decoded === '/' || decoded === '') candidates.push(path.join(ROOT, 'index.html'));
  else candidates.push(path.join(ROOT, decoded));

  // Vercel's cleanUrls: /login serves /login.html
  if (!path.extname(decoded)) {
    candidates.push(path.join(ROOT, `${decoded}.html`));
    candidates.push(path.join(ROOT, decoded, 'index.html'));
  }

  for (const candidate of candidates) {
    const normalised = path.normalize(candidate);
    if (!normalised.startsWith(ROOT)) continue;
    if (fs.existsSync(normalised) && fs.statSync(normalised).isFile()) return normalised;
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

  if (url.pathname.startsWith('/api')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');

    if (raw) {
      try {
        req.body = JSON.parse(raw);
      } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
        return;
      }
    }

    try {
      await handler(req, res);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Server error' }));
      }
    }
    return;
  }

  const filePath = resolveStatic(url.pathname);
  if (filePath) {
    sendFile(res, filePath);
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<h1>404 - Page not found</h1><p><a href="/">Go home</a></p>');
});

server.listen(PORT, HOST, () => {
  console.log(`\n  University Grievance Portal`);
  console.log(`  Local:   http://${HOST}:${PORT}`);
  console.log(`  Mode:    ${process.env.DATABASE_URL ? 'Postgres (persistent)' : 'in-memory demo database'}\n`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down.');
  server.close(() => process.exit(0));
});
