import fs from 'node:fs';
import path from 'node:path';

// Writes each article's phone layout straight into its built page, so phones show the article with the page
// instead of after a second download. Wider screens hide it and fetch their own layout.
const out = path.resolve(process.argv[2] ?? 'out');
const decode = (value) => value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const pages = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? pages(file) : entry.name === 'index.html' ? [file] : [];
});

let count = 0;
for (const page of pages(path.join(out, 'blog'))) {
  const html = fs.readFileSync(page, 'utf8');
  const match = html.match(/<div class="blog-content" data-layouts="([^"]+)">/);
  if (!match) continue;
  const small = JSON.parse(decode(match[1])).small;
  const markup = fs.readFileSync(path.join(out, small.split('?')[0]), 'utf8');
  fs.writeFileSync(page, html.replace(match[0], `${match[0]}<div data-inline-layout="${small.replaceAll('&', '&amp;')}">${markup}</div>`));
  count++;
}
console.log(`Inlined phone layouts into ${count} article pages.`);
