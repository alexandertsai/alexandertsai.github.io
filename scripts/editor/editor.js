const $ = (id) => document.getElementById(id);
const body = $('body');
let current = null;
let dirty = false;
let busy = false;
let timer;
let previewVersion = 0;
let previewController;
let previewReady = false;
let pendingPreview;
let lastPreviewKey = '';
let previewSlug = '';
const previewFrame = $('preview');
const pingPreview = () => previewFrame.contentWindow.postMessage({ type: 'preview-ping' }, '*');
previewFrame.addEventListener('load', pingPreview);
window.addEventListener('message', (event) => {
  if (event.source !== previewFrame.contentWindow || event.data?.type !== 'preview-ready') return;
  previewReady = true;
  if (pendingPreview) previewFrame.contentWindow.postMessage(pendingPreview, '*');
});
pingPreview();
let posts = [];
const fields = ['title', 'slug', 'date', 'draft', 'description', 'body'];
const backupKey = () => 'typst-blog-editor:' + (current?.slug || 'new');
const values = () => ({ slug: $('slug').value, title: $('title').value, date: $('date').value, preview: $('description').value, body: body.value, format: 'typst', draft: $('draft').value === 'true', revision: current?.revision });
const slugify = (text) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function showError(message = '') { $('error').textContent = message; $('error').hidden = !message; }
async function api(url, method = 'GET', data, signal) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Editor-Request': '1' }, body: data === undefined ? undefined : JSON.stringify(data), signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
function changed(updatePreview = true) {
  dirty = true;
  $('status').textContent = 'Unsaved changes';
  try { localStorage.setItem(backupKey(), JSON.stringify({ ...values(), slug: $('slug').value })); }
  catch { $('status').textContent = 'Unsaved changes; browser backup unavailable'; }
  if (updatePreview) {
    previewVersion++;
    previewController?.abort();
    clearTimeout(timer);
    timer = setTimeout(preview, 50);
  }
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
  body.value = data.body || '';
  $('slug').disabled = false;
  $('heading').textContent = post ? 'Edit post' : 'New post';
  dirty = Boolean(restored);
  $('status').textContent = restored ? 'Browser backup restored; save to disk' : post ? 'Saved to disk' : 'Not saved';
  showError(legacy ? 'Previous draft recovered as text. Check its Typst syntax before publishing. The original browser backup is preserved.' : '');
  renderPosts();
  preview();
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
    $('heading').textContent = 'Edit post';
    dirty = JSON.stringify({ ...values(), revision: JSON.parse(snapshot).revision }) !== snapshot;
    try {
      localStorage.removeItem(key);
      if (dirty) localStorage.setItem(backupKey(), JSON.stringify(values()));
    } catch { /* Disk saves still work without browser storage. */ }
    $('status').textContent = dirty ? 'Unsaved changes' : 'Saved to disk';
    await refreshPosts();
    preview();
    return true;
  } catch (error) { showError(error.message); $('status').textContent = 'Save failed'; return false; }
  finally { busy = false; $('save').disabled = false; }
}
async function preview() {
  clearTimeout(timer);
  const slug = current?.slug || $('slug').value || 'new-post';
  const source = body.value;
  const width = Math.max(240, previewFrame.clientWidth - 48);
  const key = JSON.stringify([slug, source, width]);
  if (key === lastPreviewKey) { $('preview-error').hidden = true; return; }
  previewController?.abort();
  previewController = new AbortController();
  const version = ++previewVersion;
  try {
    const result = await api('/api/posts/' + slug + '/preview', 'POST', { body: source, width }, previewController.signal);
    if (version !== previewVersion) return;
    $('preview-error').hidden = true;
    $('compile-time').textContent = `${result.compileMs} ms`;
    pendingPreview = { type: 'preview', html: result.html, resetScroll: previewSlug !== slug };
    previewSlug = slug;
    lastPreviewKey = key;
    if (previewReady) previewFrame.contentWindow.postMessage(pendingPreview, '*');
  } catch (error) {
    if (version !== previewVersion || error.name === 'AbortError') return;
    $('preview-error').hidden = false;
    $('preview-error').textContent = error.message;
  }
}
function insert(before, after = '', fallback = 'text') {
  const start = body.selectionStart;
  const selected = body.value.slice(start, body.selectionEnd) || fallback;
  body.setRangeText(before + selected + after, start, body.selectionEnd, 'end');
  body.focus();
  body.setSelectionRange(start + before.length, start + before.length + selected.length);
  changed();
}
const formats = {
  bold: ['*', '*'], italic: ['_', '_'], heading: ['\n= ', '\n', 'Heading'], link: ['#link("https://example.com")[', ']', 'Link text'],
  list: ['\n- ', '\n', 'List item'], quote: ['\n#quote(block: true)[', ']\n', 'Quote'], code: ['\n```\n', '\n```\n', 'code'],
  math: ['$', '$', 'x^2'], display: ['\n$ ', ' $\n', 'sum_(i=1)^n i = (n(n+1))/2'],
};
document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => insert(...formats[button.dataset.format])));
async function upload(files) {
  if (!files.length || busy) return;
  showError();
  if (!current && !await save()) return;
  const slug = current.slug;
  let position = body.selectionStart;
  busy = true;
  $('save').disabled = true;
  try {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) throw new Error('Images must be under 10 MB.');
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(new Error('Could not read image.')); reader.readAsDataURL(file); });
      const result = await api('/api/posts/' + slug + '/images', 'POST', { type: file.type, data });
      const markup = `\n#image(${JSON.stringify(result.url)}, width: 100%, alt: "Image description")\n`;
      body.setRangeText(markup, position, position, 'end');
      position += markup.length;
      changed();
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
fields.forEach((id) => $(id).addEventListener('input', () => changed(['body', 'slug'].includes(id) || (id === 'title' && !current))));
$('save').addEventListener('click', save);
$('metadata').addEventListener('submit', (event) => { event.preventDefault(); save(); });
$('new').addEventListener('click', () => { $('slug').dataset.auto = 'true'; load(); });
document.addEventListener('keydown', (event) => {
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
  if (document.activeElement === body && ['b', 'i'].includes(event.key.toLowerCase())) { event.preventDefault(); insert(...formats[event.key.toLowerCase() === 'b' ? 'bold' : 'italic']); }
});
window.addEventListener('beforeunload', (event) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
new ResizeObserver(() => {
  previewVersion++;
  previewController?.abort();
  clearTimeout(timer);
  timer = setTimeout(preview, 50);
}).observe(previewFrame);
try {
  await refreshPosts();
  load();
} catch (error) { showError(error.message); }
