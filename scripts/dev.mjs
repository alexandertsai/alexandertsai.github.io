import fs from 'node:fs';
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

function launch() {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)], { stdio: 'inherit' });
  server.on('exit', (code) => {
    if (restarting) return;
    clearTimeout(timer);
    watcher.close();
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
  server.kill('SIGTERM');
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
launch();
