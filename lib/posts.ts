import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), 'posts');
const audioDirectory = path.join(process.cwd(), 'public', 'audio');
const imagesDirectory = path.join(process.cwd(), 'public', 'images');

// Set of audio "tokens" — the basenames of the .mp3 files in public/audio.
// A marker like [tanemi] in a post is only treated as an audio cue when it
// matches one of these files.
function getAudioTokens(): Set<string> {
  try {
    return new Set(
      fs
        .readdirSync(audioDirectory)
        .filter((f) => f.endsWith('.mp3'))
        .map((f) => f.replace(/\.mp3$/, ''))
    );
  } catch {
    return new Set();
  }
}

// Replace [token] markers with invisible anchor spans the client can observe.
// Standalone markers (their own paragraph) are unwrapped so they don't leave a
// blank gap; inline markers stay where they are at the start of a paragraph.
function injectAudioMarkers(contentHtml: string, tokens: Set<string>): string {
  if (tokens.size === 0) return contentHtml;
  let injected = false;
  const span = (token: string) => {
    injected = true;
    return `<span class="audio-marker" data-audio-marker="${token}" aria-hidden="true"></span>`;
  };

  const result = contentHtml
    .replace(/<p>\s*\[([A-Za-z0-9_-]+)\]\s*<\/p>/g, (match, token) =>
      tokens.has(token) ? span(token) : match
    )
    .replace(/\[([A-Za-z0-9_-]+)\]/g, (match, token) =>
      tokens.has(token) ? span(token) : match
    );

  // Mount point for the inline play/stop bar, placed right beneath the post's
  // first paragraph (the audio warning).
  if (!injected) return result;
  const control = '<div data-audio-control></div>';
  const end = result.indexOf('</p>');
  if (end === -1) return `${result}${control}`;
  const pos = end + '</p>'.length;
  return result.slice(0, pos) + control + result.slice(pos);
}

// The image files available under public/images, used to validate shortcodes.
function getImageFiles(): Set<string> {
  try {
    return new Set(
      fs.readdirSync(imagesDirectory).filter((f) => !f.startsWith('.'))
    );
  } catch {
    return new Set();
  }
}

const escapeAttr = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Expand image shortcodes into the same <figure>/<figcaption> markup that used
// to be written by hand. Syntax (distinct from audio's [token] by the leading !):
//   [!name]                 -> image, no caption
//   [!name | a caption]     -> image with caption
// "name" resolves to public/images/<name>.webp unless it already has an
// extension. Unknown names are left untouched so typos stay visible.
function injectImages(contentHtml: string, files: Set<string>): string {
  if (files.size === 0) return contentHtml;

  const build = (rawName: string, rawCaption?: string): string | null => {
    const name = rawName.trim();
    const file = name.includes('.') ? name : `${name}.webp`;
    if (!files.has(file)) return null;
    const caption = rawCaption?.trim();
    const alt = caption && caption.length ? caption : name;
    const figcaption =
      caption && caption.length
        ? `<figcaption>${escapeHtml(caption)}</figcaption>`
        : '';
    return `<figure><img src="/images/${file}" alt="${escapeAttr(
      alt
    )}">${figcaption}</figure>`;
  };

  const standalone = /<p>\s*\[!\s*([^\]|]+?)\s*(?:\|\s*([^\]]*?))?\s*\]\s*<\/p>/g;
  const inline = /\[!\s*([^\]|]+?)\s*(?:\|\s*([^\]]*?))?\s*\]/g;

  return contentHtml
    .replace(standalone, (m, name, cap) => build(name, cap) ?? m)
    .replace(inline, (m, name, cap) => build(name, cap) ?? m);
}

export interface PostData {
  slug: string;
  title?: string;
  date: string;
  content: string;
  tags?: string[];
}

export async function getAllPosts(): Promise<PostData[]> {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const audioTokens = getAudioTokens();
  const imageFiles = getImageFiles();
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map(async (fileName) => {
        const slug = fileName.replace(/\.md$/, '');
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);

        const processedContent = await remark()
          .use(html, { sanitize: false })
          .process(content);
        const withImages = injectImages(
          processedContent.toString(),
          imageFiles
        );
        const contentHtml = injectAudioMarkers(withImages, audioTokens);

        return {
          slug,
          title: data.title,
          date: slug, // Date is inferred from filename (YYYY-MM-DD.md)
          content: contentHtml,
          tags: data.tags || [],
        };
      })
  );

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}
