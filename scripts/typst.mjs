import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';


export function createTypstRenderer(directory, { fontDirectory } = {}) {
  const workspace = path.resolve(directory);
  const fontPaths = [fileURLToPath(new URL('../public/fonts/inter', import.meta.url)), fontDirectory].filter((directory) => directory && fs.existsSync(directory));
  const compiler = NodeCompiler.create({ workspace, fontArgs: [{ fontPaths }] });
  const main = path.join(workspace, '.preview.typ');
  const renderText = (source, { width = 600 } = {}) => {
    if (typeof source !== 'string') throw new Error('Typst source must be text.');
    const pixels = Math.min(1200, Math.max(240, Math.round(Number(width) || 600)));
    const preamble = `#set page(width: ${pixels * 0.75}pt, height: auto, margin: 0pt, fill: none)\n#set text(font: ("Inter", "Libertinus Serif"), size: 12.75pt, fill: rgb("#333333"), hyphenate: false)\n#set par(leading: 0.9em, spacing: 2em, justify: false)\n#show link: set text(fill: rgb("#245880"))\n#show link: underline\n#show figure.caption: set text(size: 9.75pt, fill: rgb("#666666"))\n`;
    compiler.mapShadow(main, Buffer.from(preamble + source));
    const started = performance.now();
    try {
      const result = compiler.compile({ mainFilePath: main, resetRead: true });
      if (result.hasError()) {
        const error = result.takeError();
        const diagnostics = compiler.fetchDiagnostics(error);
        const messages = diagnostics.map((item) => item.message).filter(Boolean);
        throw new Error(messages.join('; ') || error.shortDiagnostics.map((item) => item.message).join('; ') || 'Invalid Typst syntax.');
      }
      const svg = compiler.svg(result.result);
      return { html: `<div class="typst-document">${svg}</div>`, compileMs: Number((performance.now() - started).toFixed(1)) };
    } catch (error) {
      throw new Error(`Typst: ${error.message}`);
    } finally {
      compiler.evictCache(30);
    }
  };
  return (source, options = {}) => {
    if (typeof source !== 'string') throw new Error('Typst source must be text.');
    const includes = [...source.matchAll(/^#html\("([^"\r\n]+\.html)"\)[ \t]*$/gm)];
    if (!includes.length) return renderText(source, options);
    const fragments = [];
    const localFile = (name, directory = workspace) => {
      const file = path.resolve(directory, name);
      if (!file.startsWith(workspace + path.sep) || !fs.realpathSync(file).startsWith(fs.realpathSync(workspace) + path.sep)) {
        throw new Error('HTML include: keep files inside the post folder.');
      }
      return file;
    };
    let offset = 0;
    let compileMs = 0;
    const appendText = (text) => {
      if (!text.trim()) return;
      const result = renderText(text, options);
      fragments.push(result.html);
      compileMs += result.compileMs;
    };
    for (const include of includes) {
      appendText(source.slice(offset, include.index));
      const file = localFile(include[1]);
      const figure = fs.readFileSync(file, 'utf8').replace(/(<img\b[^>]*?\ssrc\s*=\s*)(["'])([^"']+)\2/gi, (match, prefix, quote, source) => {
        if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(source)) return match;
        const image = localFile(decodeURIComponent(source), path.dirname(file));
        const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif' }[path.extname(image).toLowerCase()];
        if (!mime) throw new Error('HTML include: choose a supported image format.');
        return `${prefix}${quote}data:${mime};base64,${fs.readFileSync(image).toString('base64')}${quote}`;
      });
      fragments.push(`<div class="typst-html" style="margin:28px 0;font:inherit;color:inherit">${figure}</div>`);
      offset = include.index + include[0].length;
    }
    appendText(source.slice(offset));
    return { html: fragments.join(''), compileMs: Number(compileMs.toFixed(1)) };
  };
}

export function renderTypstPost(source, directory, options) {
  const render = createTypstRenderer(directory, options);
  const layouts = [['small', 360], ['medium', 520], ['large', 680]];
  return layouts.map(([name, width]) => `<div class="typst-layout typst-layout-${name}">${render(source, { width }).html}</div>`).join('');
}
