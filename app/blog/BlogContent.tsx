"use client";

import { useEffect, useRef } from "react";
import { LAYOUT_QUERIES, type Layouts } from "./layouts";

const loaded = new Map<string, Promise<string>>();

function load(url: string) {
  if (!loaded.has(url)) {
    loaded.set(url, fetch(url).then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return response.text();
    }));
  }
  return loaded.get(url)!;
}

export default function BlogContent({ layouts }: { layouts: Layouts }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let shown = "";
    let cancelled = false;
    const lists = LAYOUT_QUERIES.map(([, query]) => window.matchMedia(query));
    const show = () => {
      const index = lists.findIndex((list) => list.matches);
      const url = layouts[LAYOUT_QUERIES[index === -1 ? 2 : index][0]];
      if (url === shown) return;
      shown = url;
      load(url).then((markup) => {
        if (!cancelled && shown === url && host.current) host.current.innerHTML = markup;
      }, () => { loaded.delete(url); shown = ""; });
    };
    show();
    lists.forEach((list) => list.addEventListener("change", show));
    return () => {
      cancelled = true;
      lists.forEach((list) => list.removeEventListener("change", show));
    };
  }, [layouts]);

  return <div ref={host} className="blog-content" />;
}
