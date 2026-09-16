import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const mediaExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.webm', '.pdf']);
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function filesIn(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.')) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : entry.isFile() ? [file] : [];
  });
}

function writeIfChanged(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

export async function prepareContent(root = process.cwd(), { includeDrafts = false } = {}) {
  const contentRoot = path.join(root, 'content');
  const outputRoot = path.join(root, 'public', '_content');
  const records = [];
  const assets = new Map();

  function addAsset(file) {
    const relative = path.relative(contentRoot, file).split(path.sep).join('/');
    if (relative.startsWith('../') || !mediaExtensions.has(path.extname(file).toLowerCase())) {
      throw new Error(`Unsupported content asset: ${relative}`);
    }
    const bytes = fs.readFileSync(file);
    assets.set(relative, bytes);
    return '/_content/' + relative.split('/').map(encodeURIComponent).join('/');
  }

  function collectAssets(directory) {
    for (const file of filesIn(directory)) {
      if (mediaExtensions.has(path.extname(file).toLowerCase())) addAsset(file);
    }
  }

  collectAssets(path.join(contentRoot, 'about'));
  for (const section of ['blog', 'personal']) {
    collectAssets(path.join(contentRoot, section, 'assets'));
    const postsRoot = path.join(contentRoot, section, 'posts');
    if (!fs.existsSync(postsRoot)) continue;
    for (const entry of fs.readdirSync(postsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const slug = entry.name;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Use lowercase letters, numbers, and hyphens for the post folder: ${slug}`);
      const directory = path.join(postsRoot, slug);
      const file = path.join(directory, 'index.md');
      if (!fs.existsSync(file)) continue;
      const { data, content } = matter(fs.readFileSync(file, 'utf8'));
      if (data.draft !== undefined && typeof data.draft !== 'boolean') throw new Error(`${file}: draft must be true or false`);
      if (data.draft && !includeDrafts) continue;
      const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date ?? slug.slice(0, 10);
      const parsed = new Date(`${date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
        throw new Error(`${file}: date must be YYYY-MM-DD`);
      }
      if (section === 'blog' && (typeof data.title !== 'string' || !data.title.trim())) throw new Error(`${file}: add a title`);
      if (data.title !== undefined && typeof data.title !== 'string') throw new Error(`${file}: title must be text`);
      collectAssets(directory);

      function assetUrl(url) {
        if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url)) return url;
        const [pathname, suffix = ''] = url.split(/(?=[?#])/s, 2);
        const local = path.resolve(directory, decodeURIComponent(pathname));
        if (!local.startsWith(directory + path.sep)) throw new Error(`${file}: keep post files inside this post folder (${url})`);
        if (!fs.existsSync(local)) throw new Error(`${file}: missing file ${url}`);
        return addAsset(local) + suffix;
      }

      function localMedia() {
        return (tree) => {
          function visit(node) {
            if (node.type === 'image' || node.type === 'link') node.url = assetUrl(node.url);
            if (node.type === 'html') {
              node.value = node.value.replace(/\b(src|href)\s*=\s*(["'])(.*?)\2/g, (_, attr, quote, url) => `${attr}=${quote}${escapeHtml(assetUrl(url))}${quote}`);
            }
            node.children?.forEach(visit);
          }
          visit(tree);
        };
      }

      let rendered = String(await remark().use(localMedia).use(html, { sanitize: section !== 'personal' }).process(content));
      if (section === 'personal') {
        const audio = new Map(filesIn(directory).filter((file) => path.extname(file) === '.mp3').map((file) => [path.basename(file, '.mp3'), addAsset(file)]));
        let hasAudio = false;
        const marker = (match, token) => {
          if (!audio.has(token)) return match;
          hasAudio = true;
          return `<span class="audio-marker" data-audio-marker="${token}" data-audio-src="${escapeHtml(audio.get(token))}" aria-hidden="true"></span>`;
        };
        rendered = rendered.replace(/<p>\s*\[([A-Za-z0-9_-]+)\]\s*<\/p>/g, marker).replace(/\[([A-Za-z0-9_-]+)\]/g, marker);
        if (hasAudio) {
          const end = rendered.indexOf('</p>') + 4;
          const position = end < 4 ? rendered.length : end;
          rendered = rendered.slice(0, position) + '<div data-audio-control></div>' + rendered.slice(position);
        }
      }
      records.push({ section, slug, title: data.title ?? '', date, preview: data.preview ?? '', draft: data.draft ?? false, html: rendered });
    }
  }

  const fingerprint = createHash('sha256');
  for (const [relative, bytes] of [...assets].sort(([a], [b]) => a.localeCompare(b))) {
    fingerprint.update(relative).update(bytes);
    const destination = path.join(outputRoot, relative);
    if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(bytes)) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, bytes);
    }
  }
  for (const file of filesIn(outputRoot)) {
    if (!assets.has(path.relative(outputRoot, file).split(path.sep).join('/'))) fs.unlinkSync(file);
  }
  records.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  writeIfChanged(path.join(root, '.generated', 'content.json'), JSON.stringify({ revision: fingerprint.digest('hex'), posts: records }, null, 2) + '\n');
  return records;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepareContent(process.cwd(), { includeDrafts: process.argv.includes('--drafts') });
}
