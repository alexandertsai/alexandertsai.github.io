import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createEditorServer } from './editor.mjs';
import { prepareContent } from './content.mjs';
import { createTypstRenderer } from './typst.mjs';

async function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-editor-'));
  const server = createEditorServer(root);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); fs.rmSync(root, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = async (url, method = 'GET', data, headers = {}) => {
    const response = await fetch(origin + url, { method, headers: { 'Content-Type': 'application/json', 'X-Editor-Request': '1', ...headers }, body: data === undefined ? undefined : JSON.stringify(data) });
    return { status: response.status, data: await response.json() };
  };
  return { root, request };
}
const post = { title: 'Example', date: '2026-10-11', preview: '', draft: true, body: 'Hello *world*.' };

test('browser workflow creates a draft, persists an image, previews, and prepares publication', async (t) => {
  const { root, request } = await fixture(t);
  let response = await request('/api/posts/example', 'POST', post);
  assert.equal(response.status, 200);
  const first = response.data;
  assert.equal((await prepareContent(root)).length, 0);
  response = await request('/api/posts/example/images', 'POST', { type: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' });
  assert.equal(response.status, 201);
  const body = post.body + `\n\n#image("${response.data.url}", width: 20pt)\n\n$x^2$`;
  response = await request('/api/posts/example/preview', 'POST', { body });
  assert.match(response.data.html, /<svg/);
  assert.equal(typeof response.data.compileMs, "number");
  assert.match(response.data.html, /data:image\/png;base64/);
  response = await request('/api/posts/example', 'PUT', { ...first, body, draft: false });
  assert.equal(response.status, 200);
  const [published] = await prepareContent(root);
  assert.match(published.html, /data:image\/png;base64/);
  assert.match(published.html, /typst-layout-small/);
  assert.ok(fs.existsSync(path.join(root, "content/blog/posts/example/index.typ")));
  assert.ok(fs.existsSync(path.join(root, "content/blog/posts/example/post.json")));
  assert.equal(fs.existsSync(path.join(root, "content/blog/posts/example/index.md")), false);
  assert.equal((await request('/api/posts')).data.length, 1);
  assert.equal((await request('/api/posts/example', 'POST', post)).status, 409);
  assert.equal((await request('/api/posts/example', 'PUT', first)).status, 409);
});

test('invalid publishing, image paths, origins, and dates cannot write a post', async (t) => {
  const { request } = await fixture(t);
  assert.equal((await request('/api/posts/example', 'POST', post, { Origin: 'https://example.com' })).status, 403);
  assert.equal((await request('/api/posts/example', 'POST', { ...post, date: '2026-02-30' })).status, 400);
  assert.equal((await request('/api/posts/example', 'POST', { ...post, draft: false, body: '$unknowncommand(x)$' })).status, 400);
  assert.equal((await request('/api/posts/example', 'POST', { ...post, draft: false, body: '#image("../outside.png")' })).status, 400);
  assert.deepEqual((await request('/api/posts')).data, []);
});

test('native Typst handles prose, math, show rules, tables, and subsequent edits', async (t) => {
  const { root } = await fixture(t);
  const render = createTypstRenderer(root);
  const source = '= Heading\n\n*Bold* and $alpha + beta$.\n\n#table(columns: 2, [A], [B], [1], [2])';
  const first = render(source);
  assert.match(first.html, /<svg/);
  assert.match(first.html, /foreignObject/);
  const edited = render(source + '\n\nAn edit.');
  assert.notEqual(edited.html, first.html);
  assert.throws(() => render('#unknowncommand()'), /Typst: unknown variable/);
  assert.match(render(source).html, /<svg/);
});

test('archived blog content and its media are excluded from builds', async (t) => {
  const { root } = await fixture(t);
  const archive = path.join(root, 'archive/blog/old-post');
  fs.mkdirSync(archive, { recursive: true });
  fs.writeFileSync(path.join(archive, 'index.md'), '---\ntitle: Old\ndate: 2025-01-01\n---\nArchived');
  fs.writeFileSync(path.join(archive, 'photo.png'), 'image');
  assert.deepEqual(await prepareContent(root, { includeDrafts: true }), []);
  assert.equal(fs.existsSync(path.join(root, 'public/_content/blog/posts/old-post/photo.png')), false);
});

test('editing a URL moves the post and media while rejecting collisions and stale saves', async (t) => {
  const { root, request } = await fixture(t);
  const first = (await request('/api/posts/original', 'POST', post)).data;
  fs.writeFileSync(path.join(root, 'content/blog/posts/original/photo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>');
  const edited = { ...first, slug: 'renamed', body: '#image("photo.svg")', draft: false };
  const response = await request('/api/posts/original', 'PUT', edited);
  assert.equal(response.status, 200);
  assert.equal(response.data.slug, 'renamed');
  assert.equal(fs.existsSync(path.join(root, 'content/blog/posts/original')), false);
  assert.equal(fs.existsSync(path.join(root, 'content/blog/posts/renamed/photo.svg')), true);
  assert.equal((await request('/api/posts/renamed/preview', 'POST', { body: edited.body })).status, 200);
  assert.equal((await request('/api/posts/original', 'PUT', edited)).status, 409);
  await request('/api/posts/occupied', 'POST', post);
  assert.equal((await request('/api/posts/renamed', 'PUT', { ...response.data, slug: 'occupied' })).status, 409);
  assert.equal((await request('/api/posts/renamed', 'PUT', { ...response.data, slug: '../escape' })).status, 400);
  assert.equal((await request('/api/posts/renamed')).data.body, edited.body);
  assert.deepEqual((await prepareContent(root)).map((entry) => entry.slug), ['renamed']);
});
