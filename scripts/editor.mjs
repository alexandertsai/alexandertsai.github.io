import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { createTypstRenderer } from './typst.mjs';

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
const revision = (text) => createHash('sha256').update(text).digest('hex');
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createEditorServer(root = process.cwd()) {
  root = fs.realpathSync(root);
  const posts = path.join(root, 'content/blog/posts');
  fs.mkdirSync(posts, { recursive: true });
  function directory(slug) {
    if (!slugPattern.test(slug)) throw new Error('Use lowercase letters, numbers, and hyphens for the URL.');
    const dir = path.join(posts, slug);
    if (fs.existsSync(dir) && fs.realpathSync(dir) !== dir) throw new Error('Symlinked post folders are not supported.');
    return dir;
  }
  function read(slug) {
    const dir = directory(slug);
    const text = fs.readFileSync(path.join(dir, 'index.typ'), 'utf8');
    const metadata = fs.readFileSync(path.join(dir, 'post.json'), 'utf8');
    const data = JSON.parse(metadata);
    return { slug, ...data, body: text, format: 'typst', revision: revision(metadata + '\0' + text) };
  }
  const renderers = new Map();
  function preview(slug, body, width) {
    let render = renderers.get(slug);
    if (!render) {
      render = createTypstRenderer(directory(slug), { fontDirectory: path.join(root, 'content/blog/fonts') });
      renderers.set(slug, render);
      if (renderers.size > 8) renderers.delete(renderers.keys().next().value);
    }
    return render(body, { width });
  }
  return http.createServer(async (req, res) => {
    const send = (status, data, type = 'application/json') => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(type === 'application/json' ? JSON.stringify(data) : data);
    };
    try {
      if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '')) return send(403, { error: 'Use the local editor address printed in the terminal.' });
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (req.method !== 'GET' && (req.headers['x-editor-request'] !== '1' || (req.headers.origin && req.headers.origin !== url.origin))) return send(403, { error: 'Requests must come from the editor.' });
      let input;
      if (req.method !== 'GET') {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 20 * 1024 * 1024) { send(413, { error: 'Request too large. Images must be under 10 MB.' }); return; }
          chunks.push(chunk);
        }
        input = JSON.parse(Buffer.concat(chunks).toString());
      }
      if (req.method === 'GET' && url.pathname === '/typography.css') return send(200, fs.readFileSync(path.join(root, 'public/typography.css')), 'text/css');
      if (req.method === 'GET' && url.pathname === '/api/posts') {
        return send(200, fs.readdirSync(posts).filter((slug) => slugPattern.test(slug) && fs.existsSync(path.join(posts, slug, 'index.typ'))).map(read).sort((a, b) => String(b.date).localeCompare(String(a.date))));
      }
      const match = url.pathname.match(/^\/api\/posts\/([a-z0-9-]+)(?:\/(preview|images))?$/);
      if (match) {
        const [, slug, action] = match;
        const dir = directory(slug);
        if (req.method === 'GET' && !action) return send(200, read(slug));
        if (req.method === 'POST' && action === 'preview') return send(200, preview(slug, input.body, input.width));
        if (req.method === 'POST' && action === 'images') {
          if (!fs.existsSync(path.join(dir, 'index.typ'))) throw new Error('Save the post before adding images.');
          const extension = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' }[input.type];
          if (!extension) throw new Error('Choose a PNG, JPG, WebP, or GIF image.');
          const bytes = Buffer.from(input.data, 'base64');
          if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Images must be between 1 byte and 10 MB.');
          const name = `image-${randomUUID()}${extension}`;
          fs.writeFileSync(path.join(dir, name), bytes, { flag: 'wx' });
          return send(201, { url: './' + name });
        }
        if ((req.method === 'POST' || req.method === 'PUT') && !action) {
          if (typeof input.title !== 'string' || !input.title.trim()) throw new Error('Enter a title.');
          if (typeof input.body !== 'string' || typeof input.preview !== 'string' || typeof input.draft !== 'boolean') throw new Error('Invalid post fields.');
          const date = new Date(`${input.date}T00:00:00Z`);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.date) throw new Error('Enter a valid date.');
          const nextSlug = input.slug ?? slug;
          const destination = directory(nextSlug);
          if (req.method === 'POST' && nextSlug !== slug) throw new Error('Post URL must match the requested URL.');
          if (nextSlug !== slug && fs.existsSync(destination)) return send(409, { error: 'This URL already exists. Choose another.' });
          const file = path.join(dir, 'index.typ');
          if (req.method === 'POST' && fs.existsSync(dir)) return send(409, { error: 'This URL already exists. Choose another.' });
          if (req.method === 'PUT' && (!fs.existsSync(file) || read(slug).revision !== input.revision)) return send(409, { error: 'This post changed on disk. Copy your edits, then reload the post before saving.' });
          if (!input.draft) await preview(slug, input.body);
          const text = input.body;
          const metadata = JSON.stringify({ title: input.title.trim(), date: input.date, preview: input.preview, draft: input.draft }, null, 2) + '\n';
          fs.mkdirSync(dir, { recursive: true });
          const temp = path.join(dir, '.save-' + randomUUID());
          fs.writeFileSync(temp, text);
          fs.renameSync(temp, file);
          const metaTemp = path.join(dir, '.save-' + randomUUID());
          fs.writeFileSync(metaTemp, metadata);
          fs.renameSync(metaTemp, path.join(dir, 'post.json'));
          if (nextSlug !== slug) {
            fs.renameSync(dir, destination);
            renderers.delete(slug);
            renderers.delete(nextSlug);
          }
          return send(200, read(nextSlug));
        }
      }
      const staticFiles = { '/': 'index.html', '/editor.js': 'editor.js', '/editor.css': 'editor.css', '/preview.html': 'preview.html', '/preview.js': 'preview.js', '/preview.css': 'preview.css' };
      if (req.method === 'GET' && staticFiles[url.pathname]) {
        const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'editor', staticFiles[url.pathname]);
        return send(200, fs.readFileSync(file), mime[path.extname(file)]);
      }
      send(404, { error: 'Not found.' });
    } catch (error) {
      send(400, { error: error.message });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  nextEnv.loadEnvConfig(process.cwd());
  const port = Number(process.env.EDITOR_PORT || 4310);
  const server = createEditorServer();
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Blog editor: http://127.0.0.1:${server.address().port}\nPosts save to content/blog/posts/. Push to main to publish posts marked ready.`));
}
