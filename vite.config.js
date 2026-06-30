import { defineConfig } from 'vite';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const workbenchOrderPath = path.resolve('src/workbenchOrder.json');
const deckRegistryPath = path.resolve('src/deckRegistry.js');

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64_000) {
        reject(new Error('Request body too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

async function registryDeckIds() {
  const source = await readFile(deckRegistryPath, 'utf8');
  const ids = [...source.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  return [...new Set(ids)];
}

function normalizeOrderPayload(payload, knownIds) {
  if (!Array.isArray(payload)) {
    return { error: 'Expected an array of deck ids.' };
  }

  const known = new Set(knownIds);
  const seen = new Set();
  const valid = [];

  for (const id of payload) {
    if (typeof id !== 'string') return { error: 'Every deck id must be a string.' };
    if (!known.has(id)) return { error: `Unknown deck id: ${id}` };
    if (seen.has(id)) return { error: `Duplicate deck id: ${id}` };
    seen.add(id);
    valid.push(id);
  }

  const missing = knownIds.filter((id) => !seen.has(id));
  return { order: [...missing, ...valid] };
}

async function writeWorkbenchOrder(order) {
  const tmpDir = await mkdtemp(path.join(tmpdir(), 'workbench-order-'));
  const tmpPath = path.join(tmpDir, 'workbenchOrder.json');

  try {
    await writeFile(tmpPath, `${JSON.stringify(order, null, 2)}\n`, 'utf8');
    await rename(tmpPath, workbenchOrderPath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

function workbenchOrderPlugin() {
  return {
    name: 'workbench-order',
    handleHotUpdate(context) {
      if (context.file === workbenchOrderPath) return [];
      return undefined;
    },
    configureServer(server) {
      server.middlewares.use('/__workbench/order', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { ok: false, error: 'Method not allowed.' });
          return;
        }

        try {
          const body = await readRequestBody(request);
          const payload = JSON.parse(body);
          const knownIds = await registryDeckIds();
          const normalized = normalizeOrderPayload(payload, knownIds);

          if (normalized.error) {
            sendJson(response, 400, { ok: false, error: normalized.error });
            return;
          }

          await writeWorkbenchOrder(normalized.order);
          sendJson(response, 200, { ok: true, order: normalized.order });
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message || 'Unable to save order.' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [workbenchOrderPlugin()],
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
});
