"use client";

import { useEffect, useRef } from "react";
import { LAYOUT_QUERIES, type Layouts } from "./layouts";

type Cache = Record<string, Promise<string>>;
declare global { interface Window { __blogLayouts?: Cache } }

// Runs as the page's HTML is parsed, so the article starts downloading before the site's scripts have loaded.
const BOOT = `<script>(()=>{const e=document.currentScript.parentElement,l=JSON.parse(e.dataset.layouts),q=${JSON.stringify(LAYOUT_QUERIES)},u=l[(q.find(([,m])=>matchMedia(m).matches)||q[2])[0]],c=window.__blogLayouts||(window.__blogLayouts={}),i=e.querySelector("[data-inline-layout]");if(i&&i.dataset.inlineLayout===u){e.dataset.shown=u;return}c[u]=c[u]||fetch(u).then(r=>{if(!r.ok)throw r.status;return r.text()});c[u].then(h=>{if(e.isConnected&&!e.dataset.shown){e.innerHTML=h;e.dataset.shown=u}},()=>{})})()</script>`;

function cache() {
  return window.__blogLayouts ??= {};
}

function load(url: string) {
  const loaded = cache();
  loaded[url] ??= fetch(url).then((response) => {
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return response.text();
  });
  return loaded[url];
}

function current(layouts: Layouts) {
  const match = LAYOUT_QUERIES.find(([, query]) => window.matchMedia(query).matches);
  return layouts[(match ?? LAYOUT_QUERIES[2])[0]];
}

export default function BlogContent({ layouts, others }: { layouts: Layouts; others: Layouts[] }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let idle = 0;
    const show = () => {
      const element = host.current;
      const url = current(layouts);
      if (!element || element.dataset.shown === url) return;
      element.dataset.wanted = url;
      load(url).then((markup) => {
        if (cancelled || element.dataset.wanted !== url || element.dataset.shown === url) return;
        element.innerHTML = markup;
        element.dataset.shown = url;
      }, () => { delete cache()[url]; });
    };
    show();
    // Fetch the other articles once this one is in, so moving between them shows no gap.
    load(current(layouts)).finally(() => {
      if (cancelled) return;
      idle = window.setTimeout(() => others.forEach((entry) => load(current(entry)).catch(() => { delete cache()[current(entry)]; })), 300);
    });
    const lists = LAYOUT_QUERIES.map(([, query]) => window.matchMedia(query));
    lists.forEach((list) => list.addEventListener("change", show));
    return () => {
      cancelled = true;
      clearTimeout(idle);
      lists.forEach((list) => list.removeEventListener("change", show));
    };
  }, [layouts, others]);

  return <div ref={host} className="blog-content" data-layouts={JSON.stringify(layouts)} dangerouslySetInnerHTML={{ __html: BOOT }} suppressHydrationWarning />;
}
