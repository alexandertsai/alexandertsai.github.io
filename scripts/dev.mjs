import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { prepareContent } from './content.mjs';

const postList = (posts) => posts.map((post) => `${post.section}/${post.slug}`).sort().join('\n');
let knownPosts = postList(await prepareContent(process.cwd(), { includeDrafts: true }));
let timer;
let pending = Promise.resolve();
let stopping = false;
let restarting = false;
let server;

// Saves edits made on the Learning page into content/learning/garden.json. Only runs alongside the dev server.
const gardenFile = path.join(process.cwd(), 'content/learning/garden.json');
const gardenKeys = new Set(['saved', 'added', 'edits', 'deleted', 'links', 'unlinked', 'articles']);
const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const gardenSaver = http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? '';
  if (!localOrigin.test(origin)) return res.writeHead(403).end();
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'POST' || req.url !== '/save') return res.writeHead(404).end();
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const data = JSON.parse(Buffer.concat(chunks).toString());
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).every((key) => gardenKeys.has(key))) throw new Error('unexpected keys');
    const temporary = `${gardenFile}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(temporary, gardenFile);
    res.writeHead(204).end();
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end(error.message);
  }
});
gardenSaver.listen(0, '127.0.0.1');
await once(gardenSaver, 'listening');
const gardenSaveUrl = `http://127.0.0.1:${gardenSaver.address().port}/save`;

function launch() {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_GARDEN_SAVE_URL: gardenSaveUrl } });
  server.on('exit', (code) => {
    if (restarting) return;
    clearTimeout(timer);
    watcher.close();
    gardenSaver.close();
    process.exitCode = code ?? 0;
  });
}

const watcher = fs.watch('content', { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    pending = pending.then(async () => {
      if (stopping) return;
      const posts = postList(await prepareContent(process.cwd(), { includeDrafts: true }));
      if (posts === knownPosts) return;
      knownPosts = posts;
      console.log('Post list changed. Refreshing the preview server.');
      restarting = true;
      const exited = once(server, 'exit');
      server.kill('SIGTERM');
      await exited;
      restarting = false;
      if (!stopping) launch();
    }).catch((error) => console.error(`Content error: ${error.message}`));
  }, 150);
});

function stop() {
  stopping = true;
  clearTimeout(timer);
  watcher.close();
  gardenSaver.close();
  server.kill('SIGTERM');
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
launch();
