import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createEditorServer } from './editor.mjs';
import { prepareContent } from './content.mjs';
import { createTypstRenderer } from './typst.mjs';
import { escapeTypst, inlineParts, parseTypst } from './editor/typst-document.mjs';

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
  return { root, request, origin };
}
const post = { title: 'Example', date: '2026-10-11', preview: '', draft: true, body: 'Hello *world*.' };

test('visual editor recognizes formatted prose and keeps custom blocks and whitespace', () => {
  const source = '\n= Heading\nProse with *bold*, _emphasis_, and $x^2$.\n\n#figure(\n  [Panel],\n\n  caption: [Example],\n)\n\n#html("diagram.html")\n';
  const { blocks, tail } = parseTypst(source);
  assert.deepEqual(blocks.map((block) => block.kind), ['heading', 'paragraph', 'embed', 'embed']);
  assert.deepEqual(inlineParts(blocks[1].text).filter((part) => part.kind !== 'text').map((part) => part.kind), ['strong', 'em', 'atom']);
  assert.equal(blocks.map(({ gap, raw }) => gap + raw).join('') + tail, source);
  assert.equal(inlineParts(escapeTypst('Use * and # as text.'))[0].text, 'Use * and # as text.');
});

test('one-line equations compile at their natural width and visual editor assets are served', async (t) => {
  const { request, origin } = await fixture(t);
  const narrow = await request('/api/posts/example/preview', 'POST', { body: '$x^2$', inline: true });
  const wide = await request('/api/posts/example/preview', 'POST', { body: '$x^2$', width: 600 });
  assert.equal(narrow.status, 200);
  const width = (response) => Number(response.data.html.match(/data-width="([^"]+)"/)[1]);
  assert.ok(width(narrow) < width(wide));
  for (const asset of ['/rich-text.js', '/typst-document.mjs']) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/javascript/);
  }
  for (const [asset, selector] of [['/site-theme.css', '--site-bg'], ['/blog-theme.css', '.typst-document']]) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/css/);
    assert.ok((await response.text()).includes(selector));
  }
});

test('Typst files without metadata open as drafts and gain metadata when saved', async (t) => {
  const { root, request } = await fixture(t);
  const dir = path.join(root, 'content/blog/posts/source-only');
  fs.mkdirSync(dir, { recursive: true });
  const body = '= Existing draft\n\nNotes in progress.';
  fs.writeFileSync(path.join(dir, 'index.typ'), body);
  const listing = await request('/api/posts');
  assert.equal(listing.status, 200);
  const [draft] = listing.data;
  assert.equal(draft.title, 'Existing draft');
  assert.equal(draft.draft, true);
  assert.equal(draft.body, body);
  const meta = path.join(dir, 'post.json');
  assert.equal(fs.existsSync(meta), false);
  assert.equal((await request('/api/posts/source-only', 'PUT', draft)).status, 200);
  assert.equal(JSON.parse(fs.readFileSync(meta, 'utf8')).draft, true);
});

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
  assert.deepEqual(Object.keys(published.layouts), ['small', 'medium', 'large']);
  const small = fs.readFileSync(path.join(root, 'public', published.layouts.small.split('?')[0]), 'utf8');
  assert.match(small, /<svg/);
  assert.doesNotMatch(small, /data:image\/png;base64/);
  assert.match(small, /\/_content\/blog\/posts\/example\/images\/[0-9a-f]{16}\.(png|webp)/);
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

test('post-local HTML figures render between Typst sections in previews and publication', async (t) => {
  const { root, request } = await fixture(t);
  const first = (await request('/api/posts/example', 'POST', post)).data;
  const figure = path.join(root, 'content/blog/posts/example/faces.html');
  fs.writeFileSync(figure, '<figure aria-label="Happy and frowning faces">Pixel faces<img src="pixel.svg" alt="Pixel"></figure>');
  fs.writeFileSync(path.join(root, 'content/blog/posts/example/pixel.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>');
  const body = 'Before.\n\n#html("faces.html")\n\nAfter.';
  const preview = await request('/api/posts/example/preview', 'POST', { body });
  assert.equal(preview.status, 200);
  assert.match(preview.data.html, /src="data:image\/svg\+xml;base64,/);
  assert.match(preview.data.html, /<\/svg><\/div><div class="typst-html"[^>]*><figure/);
  assert.match(preview.data.html, /<\/figure><\/div><div class="typst-document"><svg/);
  assert.equal((await request('/api/posts/example', 'PUT', { ...first, body, draft: false })).status, 200);
  const [published] = await prepareContent(root);
  for (const url of Object.values(published.layouts)) {
    const layout = fs.readFileSync(path.join(root, 'public', url.split('?')[0]), 'utf8');
    assert.match(layout, /Happy and frowning faces/);
    assert.match(layout, /<img src="\/_content\/blog\/posts\/example\/images\/[0-9a-f]{16}\.svg"/);
  }
  fs.writeFileSync(figure, '<figure>Updated faces</figure>');
  assert.match((await request('/api/posts/example/preview', 'POST', { body })).data.html, /Updated faces/);
  fs.writeFileSync(path.join(root, 'outside.html'), '<p>Outside the post</p>');
  assert.equal((await request('/api/posts/example/preview', 'POST', { body: '#html("../../../../outside.html")' })).status, 400);
  fs.symlinkSync(path.join(root, 'outside.html'), path.join(root, 'content/blog/posts/example/linked.html'));
  assert.equal((await request('/api/posts/example/preview', 'POST', { body: '#html("linked.html")' })).status, 400);
  fs.writeFileSync(figure, '<img src="../../../../outside.html">');
  assert.equal((await request('/api/posts/example/preview', 'POST', { body })).status, 400);
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
