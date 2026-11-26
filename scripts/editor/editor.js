import { createWritingSurface } from './rich-text.js';

const $ = (id) => document.getElementById(id);
const body = $('body');
let current = null;
let dirty = false;
let busy = false;
let posts = [];
const fields = ['title', 'slug', 'date', 'draft', 'description'];
const editor = createWritingSurface(body, async (source, inline, width) => {
  const result = await api('/api/posts/' + previewSlug() + '/preview', 'POST', { body: source, width, inline });
  return result.html;
}, changed);
const previewSlug = () => current?.slug || ($('slug').validity.valid && $('slug').value) || 'new-post';
const backupKey = () => 'typst-blog-editor:' + (current?.slug || 'new');
const values = () => ({ slug: $('slug').value, title: $('title').value, date: $('date').value, preview: $('description').value, body: editor.source(), format: 'typst', draft: $('draft').value === 'true', revision: current?.revision });
const slugify = (text) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function showError(message = '') { $('error').textContent = message; $('error').hidden = !message; }
async function api(url, method = 'GET', data, signal) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Editor-Request': '1' }, body: data === undefined ? undefined : JSON.stringify(data), signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
function changed() {
  dirty = true;
  $('status').textContent = 'Unsaved changes';
  try { localStorage.setItem(backupKey(), JSON.stringify({ ...values(), slug: $('slug').value })); }
  catch { $('status').textContent = 'Unsaved changes; browser backup unavailable'; }
}
function load(post = null) {
  if (busy) return;
  if (dirty && !confirm('Leave unsaved changes? They are backed up in this browser.')) return;
  current = post;
  let restored;
  let legacy = false;
  try {
    restored = JSON.parse(localStorage.getItem(backupKey()));
    if (!restored && !post) {
      restored = JSON.parse(localStorage.getItem('blog-editor:new'));
      legacy = Boolean(restored);
    }
  } catch { /* Browser storage may be unavailable. */ }
  const data = restored || post || {};
  if (restored && post) current = { ...post, revision: restored.revision };
  $('title').value = data.title || '';
  $('slug').value = data.slug || '';
  $('date').value = data.date || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $('draft').value = String(data.draft ?? true);
  $('description').value = data.preview || '';
  editor.load(data.body || '');
  $('slug').disabled = false;
  dirty = Boolean(restored);
  $('status').textContent = restored ? 'Browser backup restored; save to disk' : post ? 'Saved to disk' : 'Not saved';
  showError(legacy ? 'Previous draft recovered as text. Check its Typst syntax before publishing. The original browser backup is preserved.' : '');
  renderPosts();
}
function renderPosts() {
  $('posts').replaceChildren();
  if (!posts.length) { const text = document.createElement('p'); text.textContent = 'No posts yet.'; $('posts').append(text); }
  for (const post of posts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = post.title;
    const status = document.createElement('small');
    status.textContent = post.draft ? 'Draft' : 'Ready to publish';
    button.append(status);
    if (post.slug === current?.slug) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', async () => {
      try { load(await api('/api/posts/' + post.slug)); } catch (error) { showError(error.message); }
    });
    $('posts').append(button);
  }
}
async function refreshPosts() { posts = await api('/api/posts'); renderPosts(); }
async function save() {
  if (busy) return false;
  if (['slug', 'date'].some((id) => !$(id).validity.valid)) $('settings').open = true;
  if (!$('metadata').reportValidity()) return false;
  busy = true;
  $('save').disabled = true;
  $('status').textContent = 'Saving…';
  showError();
  const key = backupKey();
  const snapshot = JSON.stringify(values());
  const slug = $('slug').value;
  try {
    const result = await api('/api/posts/' + (current?.slug || slug), current ? 'PUT' : 'POST', JSON.parse(snapshot));
    current = result;
    if ($('slug').value === slug) $('slug').value = result.slug;
    $('slug').disabled = false;
    dirty = JSON.stringify({ ...values(), revision: JSON.parse(snapshot).revision }) !== snapshot;
    try {
      localStorage.removeItem(key);
      if (dirty) localStorage.setItem(backupKey(), JSON.stringify(values()));
    } catch { /* Disk saves still work without browser storage. */ }
    $('status').textContent = dirty ? 'Unsaved changes' : 'Saved to disk';
    await refreshPosts();
    return true;
  } catch (error) { showError(error.message); $('status').textContent = 'Save failed'; return false; }
  finally { busy = false; $('save').disabled = false; }
}
const dialog = $('insert-dialog');
let insertKind;
document.querySelectorAll('[data-format], #image').forEach((button) => {
  button.addEventListener('mousedown', (event) => {
    editor.remember();
    event.preventDefault();
  });
});
document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => {
  const kind = button.dataset.format;
  if (kind !== 'link' && kind !== 'math') return editor.format(kind);
  editor.remember();
  insertKind = kind;
  $('insert-heading').textContent = kind === 'link' ? 'Insert link' : 'Insert equation';
  $('insert-label-wrap').hidden = kind !== 'link';
  $('insert-label').value = editor.selectedText();
  $('insert-value-label').textContent = kind === 'link' ? 'URL' : 'Equation';
  $('insert-value').value = '';
  $('insert-value').placeholder = kind === 'link' ? 'https://' : 'x^2 + y^2';
  $('display-wrap').hidden = kind !== 'math';
  $('display').checked = false;
  $('insert-error').hidden = true;
  dialog.showModal();
  $('insert-value').focus();
}));
$('insert-cancel').addEventListener('click', () => dialog.close());
$('insert-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const value = $('insert-value').value.trim();
  if (!value) return;
  if (insertKind === 'math' && /[$\r\n]/.test(value)) {
    $('insert-error').textContent = 'Enter one equation without enclosing dollar signs.';
    $('insert-error').hidden = false;
    return;
  }
  dialog.close();
  if (insertKind === 'link') {
    if (editor.insertLink($('insert-label').value.trim(), value)) return;
    dialog.showModal();
    $('insert-error').textContent = 'Enter a web address, email link, or page path.';
    $('insert-error').hidden = false;
    return;
  }
  const space = $('display').checked ? ' ' : '';
  editor.insertFragment('$' + space + value + space + '$', 'Equation', !space);
});

async function upload(files) {
  if (!files.length || busy) return;
  showError();
  if (!current && !await save()) return;
  const slug = current.slug;
  busy = true;
  $('save').disabled = true;
  try {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) throw new Error('Images must be under 10 MB.');
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(new Error('Could not read image.')); reader.readAsDataURL(file); });
      const result = await api('/api/posts/' + slug + '/images', 'POST', { type: file.type, data });
      editor.insertFragment('#image(' + JSON.stringify(result.url) + ', width: 100%, alt: "Image description")', 'Image');
    }
    body.focus();
  } catch (error) { showError(error.message); }
  finally { busy = false; $('save').disabled = false; }
}
body.addEventListener('paste', (event) => {
  const files = [...event.clipboardData.items].filter((item) => item.kind === 'file' && item.type.startsWith('image/')).map((item) => item.getAsFile()).filter(Boolean);
  if (files.length) { event.preventDefault(); upload(files); }
});
body.addEventListener('dragover', (event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
body.addEventListener('drop', (event) => { if (event.dataTransfer.files.length) { event.preventDefault(); upload([...event.dataTransfer.files]); } });
$('image').addEventListener('click', () => $('image-file').click());
$('image-file').addEventListener('change', () => { upload([...$('image-file').files]); $('image-file').value = ''; });
$('title').addEventListener('input', () => { if (!current && (!$('slug').value || $('slug').dataset.auto !== 'false')) $('slug').value = slugify($('title').value); });
$('slug').addEventListener('input', () => { $('slug').dataset.auto = 'false'; });
fields.forEach((id) => $(id).addEventListener('input', changed));
$('save').addEventListener('click', save);
$('metadata').addEventListener('submit', (event) => { event.preventDefault(); save(); });
$('new').addEventListener('click', () => { $('slug').dataset.auto = 'true'; load(); });
document.addEventListener('keydown', (event) => {
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
  if (document.activeElement === body && ['b', 'i'].includes(event.key.toLowerCase())) { event.preventDefault(); editor.format(event.key.toLowerCase() === 'b' ? 'bold' : 'italic'); }
});
window.addEventListener('beforeunload', (event) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
try {
  await refreshPosts();
  load();
} catch (error) { showError(error.message); }
