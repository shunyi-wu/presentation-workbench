#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const host = process.env.WORKBENCH_HOST || '127.0.0.1';
const port = process.env.WORKBENCH_PORT || process.env.PORT || '5174';
const viteBin = path.resolve(rootDir, 'node_modules/vite/bin/vite.js');
const workbenchUrl = `http://${host}:${port}/`;
const shouldOpen = process.env.WORKBENCH_OPEN !== '0';
const openOnly = args.has('--open-only');

if (!openOnly) console.log(`Starting Presentation Workbench at ${workbenchUrl}`);

function openUrl(url) {
  const opener =
    process.platform === 'darwin'
      ? { command: 'open', args: [url] }
      : process.platform === 'win32'
        ? { command: 'cmd', args: ['/c', 'start', '', url] }
        : { command: 'xdg-open', args: [url] };

  const child = spawn(opener.command, opener.args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

if (openOnly) {
  openUrl(workbenchUrl);
  console.log(`已打开工作台桌面页: ${workbenchUrl}`);
  process.exit(0);
}

async function isWorkbenchRunning() {
  try {
    const response = await fetch(workbenchUrl, { signal: AbortSignal.timeout(800) });
    if (!response.ok) return false;
    const html = await response.text();
    return html.includes('Presentation Workbench') && html.includes('/src/main.js');
  } catch {
    return false;
  }
}

if (await isWorkbenchRunning()) {
  console.log(`工作台服务已在运行: ${workbenchUrl}`);
  if (shouldOpen) {
    openUrl(workbenchUrl);
    console.log(`已打开工作台桌面页: ${workbenchUrl}`);
  }
  process.exit(0);
}

const server = spawn(process.execPath, [viteBin, '--host', host, '--port', port, '--strictPort'], {
  cwd: rootDir,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

let opened = false;

function mirrorOutput(stream, chunk) {
  stream.write(chunk);
  if (!opened && shouldOpen && chunk.toString().includes('Local:')) {
    opened = true;
    openUrl(workbenchUrl);
    console.log(`已打开工作台桌面页: ${workbenchUrl}`);
  }
}

server.stdout.on('data', (chunk) => mirrorOutput(process.stdout, chunk));
server.stderr.on('data', (chunk) => mirrorOutput(process.stderr, chunk));

server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
