const closing = { '(': ')', '[': ']', '{': '}' };

function quotedEnd(source, start) {
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\') i++;
    else if (source[i] === '"') return i + 1;
  }
  return -1;
}

function balancedEnd(source, start) {
  const stack = [closing[source[start]]];
  for (let i = start + 1; i < source.length; i++) {
    const ch = source[i];
    if (ch === '\\') i++;
    else if (ch === '"' && stack.at(-1) !== ']') {
      i = quotedEnd(source, i) - 1;
      if (i < 0) return -1;
    } else if (closing[ch]) {
      stack.push(closing[ch]);
    } else if (ch === stack.at(-1)) {
      stack.pop();
      if (!stack.length) return i + 1;
    }
  }
  return -1;
}

function mathEnd(source, start) {
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\') i++;
    else if (source[i] === '$') return i + 1;
  }
  return -1;
}

function command(source, start) {
  const name = source.slice(start).match(/^#([a-z][\w-]*(?:\.[a-z][\w-]*)*)/i)?.[1];
  if (!name) return null;
  let end = start + name.length + 1, args = null, content = null, prefix = '';
  if (source[end] === '(') {
    const next = balancedEnd(source, end);
    if (next < 0) return null;
    args = source.slice(end + 1, next - 1);
    end = next;
  }
  if (source[end] === '[') {
    const next = balancedEnd(source, end);
    if (next < 0) return null;
    content = source.slice(end + 1, next - 1);
    prefix = source.slice(start, end + 1);
    end = next;
  }
  return { name, args, content, prefix, end };
}

const mark = { '*': 'strong', '_': 'em', '`': 'code' };
const wrappers = { emph: 'em', strong: 'strong', underline: 'u', strike: 's' };

export function safeLink(url) {
  return typeof url === 'string' && !/[\x00-\x20\x7F]/.test(url) && /^(?:https?:\/\/[^/]|mailto:[^@]+@|\/(?!\/)|#.)/i.test(url);
}

export function inlineParts(source) {
  const parts = [];
  let text = '';
  const flush = () => { if (text) { parts.push({ kind: 'text', text }); text = ''; } };
  for (let i = 0; i < source.length;) {
    const ch = source[i];
    if (ch === '\\' && /[\\#*_$`@\[\]<>=+./~"-]/.test(source[i + 1] ?? '')) {
      text += source[i + 1];
      i += 2;
      continue;
    }
    const explicit = source.slice(i).match(/^https?:\/\/[^\s<>]+/i)?.[0]?.replace(/[.,;!?)]*$/, '');
    if (explicit) {
      flush();
      parts.push({ kind: 'link', url: explicit, text: explicit, bare: true });
      i += explicit.length;
      continue;
    }
    if (ch === '#') {
      const call = command(source, i);
      if (call) {
        flush();
        const raw = source.slice(i, call.end);
        if (call.name === 'link' && call.content != null) {
          let url;
          try { url = JSON.parse(call.args); } catch { /* Nonliteral link arguments are rendered as Typst. */ }
          if (safeLink(url)) parts.push({ kind: 'link', url, children: inlineParts(call.content) });
          else parts.push({ kind: 'atom', raw });
        } else if (call.content != null && call.args == null && wrappers[call.name]) {
          parts.push({ kind: wrappers[call.name], children: inlineParts(call.content) });
        } else if (call.name === 'raw' && call.content == null) {
          let code;
          try { code = JSON.parse(call.args); } catch { /* Keep the full call if it is not literal. */ }
          parts.push(typeof code === 'string' ? { kind: 'code', text: code } : { kind: 'atom', raw });
        } else {
          parts.push({ kind: 'atom', raw });
        }
        i = call.end;
        continue;
      }
    }
    if (ch === '$') {
      const end = mathEnd(source, i);
      if (end > i + 2) {
        flush();
        parts.push({ kind: 'atom', raw: source.slice(i, end), math: true });
        i = end;
        continue;
      }
    }
    if (mark[ch] && source[i + 1] && !/\s/.test(source[i + 1]) &&
        (ch !== '_' || !/[\p{L}\p{N}]/u.test(source[i - 1] ?? ''))) {
      let end = i + 1;
      for (; end < source.length; end++) {
        if (source[end] === '\\' && ch !== '`') end++;
        else if (source[end] === ch || source[end] === '\n') break;
      }
      if (source[end] === ch && end > i + 1) {
        flush();
        const value = source.slice(i + 1, end);
        parts.push(ch === '`' ? { kind: 'code', text: value } : { kind: mark[ch], children: inlineParts(value) });
        i = end + 1;
        continue;
      }
    }
    text += ch;
    i++;
  }
  flush();
  return parts;
}

function block(raw, gap) {
  const base = { raw, gap };
  let match = raw.match(/^(={1,5})[ \t]+([^\n]+)$/);
  if (match) return { ...base, kind: 'heading', level: match[1].length, text: match[2] };
  match = raw.match(/^(`{3,})([^\n]*)\n([\s\S]*)\n\1[ \t]*$/);
  if (match) return { ...base, kind: 'code', language: match[2], text: match[3] };
  if (/^(?:\/\/|\/\*)/.test(raw)) return { ...base, kind: 'comment' };
  if (/^\$\s[\s\S]*\s\$$/.test(raw)) return { ...base, kind: 'embed', label: 'Equation' };
  if (raw.startsWith('#')) {
    const call = command(raw, 0);
    if (call?.content != null && call.end === raw.length && ['quote', 'block', 'text'].includes(call.name)) {
      return { ...base, kind: call.name === 'text' ? 'caption' : 'quote', prefix: call.prefix, text: call.content };
    }
    if (!call || call.name !== 'link' && call.name !== 'emph' && call.name !== 'strong') {
      const label = call?.name === 'html' ? 'Interactive figure' : call?.name === 'image' || call?.name === 'figure' ? 'Figure' : 'Typst block';
      return { ...base, kind: 'embed', label };
    }
  }
  const lines = raw.split('\n').map((line) => line.match(/^(-|\+|\d+\.)[ \t]+(.+)$/));
  if (lines.every(Boolean)) {
    const numbered = lines[0][1] !== '-';
    if (lines.every((line) => (line[1] !== '-') === numbered)) {
      return { ...base, kind: numbered ? 'ordered' : 'list',
        start: Number.parseInt(lines[0][1], 10) || 1, items: lines.map((line) => line[2]) };
    }
  }
  return { ...base, kind: 'paragraph', text: raw };
}

export function parseTypst(source) {
  const blocks = [];
  let offset = 0;
  while (offset < source.length) {
    const gap = source.slice(offset).match(/^(?:[ \t]*\r?\n)+/)?.[0] ?? '';
    offset += gap.length;
    if (offset === source.length || /^[ \t]*$/.test(source.slice(offset))) {
      return { blocks, tail: gap + source.slice(offset) };
    }
    let search = offset;
    const rest = source.slice(offset);
    const heading = rest.match(/^={1,5}[ \t]+[^\r\n]+/);
    if (heading) {
      blocks.push(block(heading[0], gap));
      offset += heading[0].length;
      continue;
    }
    const fence = rest.match(/^(`{3,})[^\n]*\n/);
    if (fence) {
      const ending = new RegExp('^' + fence[1] + '[ \t]*(?=\\r?$)', 'm').exec(rest.slice(fence[0].length));
      search = ending ? offset + fence[0].length + ending.index + ending[0].length : source.length;
    } else if (/^\$\s/.test(rest)) {
      search = mathEnd(source, offset);
      if (search < 0) search = source.length;
    } else if (rest.startsWith('#')) {
      const call = command(source, offset);
      if (call) search = call.end;
    }
    const end = source.indexOf('\n', search);
    const blank = end < 0 ? -1 : source.slice(end).search(/\r?\n[ \t]*\r?\n/);
    let next = blank < 0 ? source.length : end + blank;
    if (next === source.length) {
      const tail = source.slice(offset).match(/(?:\r?\n[ \t]*)+$/)?.[0] ?? '';
      next -= tail.length;
    }
    blocks.push(block(source.slice(offset, next), gap));
    offset = next;
  }
  return { blocks, tail: '' };
}

export function escapeTypst(text) {
  return text.replace(/[\\#*_$`@\[\]<>~]/g, '\\$&')
    .replace(/^(\s*)([=+\-]|\d+\.)(?= )/gm, (_, space, marker) =>
      space + marker.slice(0, -1) + '\\' + marker.at(-1))
    .replace(/^(\s*)\/(?=[/*])/gm, '$1\\/');
}
