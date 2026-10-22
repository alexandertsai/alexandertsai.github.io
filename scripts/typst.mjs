import fs from 'node:fs';
import path from 'node:path';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';


export function createTypstRenderer(directory, { fontDirectory } = {}) {
  const workspace = path.resolve(directory);
  const compiler = NodeCompiler.create({ workspace, fontArgs: fontDirectory && fs.existsSync(fontDirectory) ? [{ fontPaths: [fontDirectory] }] : [] });
  const main = path.join(workspace, '.preview.typ');
  return (source, { width = 600 } = {}) => {
    if (typeof source !== 'string') throw new Error('Typst source must be text.');
    const pixels = Math.min(1200, Math.max(240, Math.round(Number(width) || 600)));
    const preamble = `#set page(width: ${pixels * 0.75}pt, height: auto, margin: 0pt)\n#set text(font: ("Warnock Pro", "Libertinus Serif"), size: 15pt, fill: rgb("#242b29"))\n#set par(leading: 0.65em)\n#show link: set text(fill: rgb("#365d4d"))\n`;
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
}

export function renderTypstPost(source, directory, options) {
  const render = createTypstRenderer(directory, options);
  const layouts = [['small', 360], ['medium', 600], ['large', 800]];
  return layouts.map(([name, width]) => `<div class="typst-layout typst-layout-${name}">${render(source, { width }).html}</div>`).join('');
}
