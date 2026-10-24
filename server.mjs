#!/usr/bin/env node
/**
 * Standalone static server for the playground (index.html, styles.css, app.js).
 *
 * The playground works by opening index.html directly from disk; this server is
 * only a convenience for browsers that restrict file:// behaviour. It never
 * reads the source playground files or stores anything.
 *
 *   npm start            # http://localhost:3000
 *   PORT=8080 npm start
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT) || 3000;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/** Map a request path to a file inside the project root, or null if it escapes it. */
function resolvePath(url) {
  const { pathname } = new URL(url, 'http://localhost');
  const requested = pathname === '/' ? '/index.html' : pathname;
  const decoded = decodeURIComponent(requested);
  const absolute = normalize(join(root, decoded));
  return absolute === root || absolute.startsWith(root.endsWith(sep) ? root : root + sep)
    ? absolute
    : null;
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    send(response, 405, 'Method Not Allowed\n', { Allow: 'GET, HEAD' });
    return;
  }

  const filePath = resolvePath(request.url ?? '/');
  if (!filePath) {
    send(response, 400, 'Bad Request\n');
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOENT' });

    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      send(
        response,
        404,
        'Not found. The playground is still just requirements.md: add index.html, styles.css and app.js, or open the exported HTML file directly.\n',
      );
      return;
    }
    send(response, 500, 'Internal Server Error\n');
  }
});

server.listen(port, () => {
  console.log(`Playground server listening on http://localhost:${port}`);
});
