const article = document.getElementById('article');

function patch(target, source) {
  const oldNodes = [...target.childNodes];
  const newNodes = [...source.childNodes];
  for (let index = 0; index < Math.max(oldNodes.length, newNodes.length); index++) {
    const oldNode = oldNodes[index];
    const newNode = newNodes[index];
    if (!newNode) { oldNode.remove(); continue; }
    if (!oldNode) { target.append(newNode.cloneNode(true)); continue; }
    if (oldNode.isEqualNode(newNode)) continue;
    if (oldNode.nodeType !== newNode.nodeType || oldNode.nodeName !== newNode.nodeName) {
      oldNode.replaceWith(newNode.cloneNode(true));
    } else if (oldNode.nodeType === Node.TEXT_NODE) {
      oldNode.textContent = newNode.textContent;
    } else if (oldNode.nodeType === Node.ELEMENT_NODE) {
      for (const attribute of [...oldNode.attributes]) {
        if (!newNode.hasAttribute(attribute.name)) oldNode.removeAttribute(attribute.name);
      }
      for (const attribute of newNode.attributes) {
        if (oldNode.getAttribute(attribute.name) !== attribute.value) oldNode.setAttribute(attribute.name, attribute.value);
      }
      patch(oldNode, newNode);
    }
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== parent) return;
  if (event.data?.type === 'preview-ping') { parent.postMessage({ type: 'preview-ready' }, '*'); return; }
  if (event.data?.type !== 'preview') return;
  const { html, resetScroll } = event.data;
  if (typeof html !== 'string') return;
  const template = document.createElement('template');
  template.innerHTML = html;
  const scroll = window.scrollY;
  patch(article, template.content);
  window.scrollTo(0, resetScroll ? 0 : scroll);
});
parent.postMessage({ type: 'preview-ready' }, '*');
