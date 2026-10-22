import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareContent } from './content.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'website-content-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    const target = path.join(root, 'content', file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  };
  return { root, write };
}

test('post-local images work in Markdown, raw HTML, and encoded filenames', async (t) => {
  const { root, write } = fixture(t);
  write('personal/posts/2026-09-16/index.md', '![Photo](<./my photo.jpg>)\n\n<img src="./my photo.jpg" alt="Photo">');
  write('personal/posts/2026-09-16/my photo.jpg', 'image');
  const [post] = await prepareContent(root);
  assert.equal(post.date, '2026-09-16');
  assert.equal(post.html.match(/\/_content\/personal\/posts\/2026-09-16\/my%20photo.jpg/g).length, 2);
  assert.ok(fs.existsSync(path.join(root, 'public/_content/personal/posts/2026-09-16/my photo.jpg')));
});

test('Typst drafts preview locally but neither their text nor assets publish', async (t) => {
  const { root, write } = fixture(t);
  write('blog/posts/draft/index.typ', 'Hello $x^2$.');
  write('blog/posts/draft/post.json', JSON.stringify({ title: 'Draft', date: '2026-09-16', draft: true }));
  write('blog/posts/draft/photo.jpg', 'image');
  assert.equal((await prepareContent(root, { includeDrafts: true })).length, 1);
  assert.equal((await prepareContent(root)).length, 0);
  assert.ok(!fs.existsSync(path.join(root, 'public/_content/blog/posts/draft/photo.jpg')));
});

test('audio markers use the track in their own post folder', async (t) => {
  const { root, write } = fixture(t);
  write('personal/posts/2026-09-16/index.md', 'A paragraph.\n\n[tanemi]');
  write('personal/posts/2026-09-16/tanemi.mp3', 'audio');
  const [post] = await prepareContent(root);
  assert.match(post.html, /data-audio-src="\/_content\/personal\/posts\/2026-09-16\/tanemi.mp3"/);
  assert.match(post.html, /<\/p><div data-audio-control><\/div>/);
});

test('missing files, invalid Typst, and invalid dates fail the build', async (t) => {
  const { root, write } = fixture(t);
  write('blog/posts/example/index.typ', 'Hello');
  write('blog/posts/example/post.json', JSON.stringify({ title: 'Example', date: '2026-02-30' }));
  await assert.rejects(prepareContent(root), /date must be YYYY-MM-DD/);
  write('blog/posts/example/post.json', JSON.stringify({ title: 'Example', date: '2026-02-28' }));
  write('blog/posts/example/index.typ', '#image("missing.png")');
  await assert.rejects(prepareContent(root), /Typst:.*file not found/);
  write('blog/posts/example/index.typ', '#unknowncommand()');
  await assert.rejects(prepareContent(root), /Typst: unknown variable/);
});

test('post ordering and asset removal stay in sync after edits', async (t) => {
  const { root, write } = fixture(t);
  for (const [slug, date] of [['older', '2026-01-01'], ['newer', '2026-09-16']]) {
    write(`blog/posts/${slug}/index.typ`, 'Text');
    write(`blog/posts/${slug}/post.json`, JSON.stringify({ title: slug, date }));
  }
  write('blog/posts/newer/unused.png', 'image');
  assert.deepEqual((await prepareContent(root)).map((post) => post.slug), ['newer', 'older']);
  fs.unlinkSync(path.join(root, 'content/blog/posts/newer/unused.png'));
  await prepareContent(root);
  assert.ok(!fs.existsSync(path.join(root, 'public/_content/blog/posts/newer/unused.png')));
});
