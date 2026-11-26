const article = document.getElementById('article');
if (new URLSearchParams(location.search).has('inline')) document.documentElement.dataset.inline = '';

function measure() {
  const bounds = article.getBoundingClientRect();
  parent.postMessage({ type: 'preview-size', width: Math.ceil(bounds.width), height: Math.ceil(bounds.height) }, '*');
}

new ResizeObserver(measure).observe(article);
window.addEventListener('message', (event) => {
  if (event.source !== parent) return;
  if (event.data?.type === 'preview-ping') { parent.postMessage({ type: 'preview-ready' }, '*'); return; }
  if (event.data?.type !== 'preview' || typeof event.data.html !== 'string') return;
  const template = document.createElement('template');
  template.innerHTML = event.data.html;
  article.replaceChildren(template.content);
  measure();
});
parent.postMessage({ type: 'preview-ready' }, '*');
