import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const args = process.argv.slice(2).filter((arg) => arg !== '--open');
let [section, title] = args;
if (!section || !title) {
  if (!process.stdin.isTTY) throw new Error('Usage: npm run new:post -- blog "Post title" (or personal)');
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    section ||= (await prompt.question('Section (blog or personal): ')).trim();
    title ||= (await prompt.question('Post title: ')).trim();
  } finally {
    prompt.close();
  }
}
if (!['blog', 'personal'].includes(section)) throw new Error('Choose blog or personal.');
const slug = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
if (!slug) throw new Error('Use a title with at least one letter or number for the folder name.');
const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const directory = path.resolve('content', section, 'posts', section === 'personal' ? `${date}-${slug}` : slug);
if (fs.existsSync(directory)) throw new Error(`Post already exists: ${directory}`);
fs.mkdirSync(directory, { recursive: true });
const file = path.join(directory, 'index.md');
fs.writeFileSync(file, `---\ntitle: ${JSON.stringify(title)}\ndate: "${date}"\ndraft: true\n---\n\n`);
console.log(`Created ${file}\n\nWrite in index.md. Drop images beside it and use ![Description](./photo.jpg).\nPreview with npm run dev. Set draft: false when ready to publish.`);
if (process.argv.includes('--open')) {
  const editor = spawn('code', ['--reuse-window', file], { stdio: 'ignore' });
  editor.on('error', () => console.log('Open the file above in VS Code. To enable automatic opening, install the code command from the VS Code Command Palette.'));
}
