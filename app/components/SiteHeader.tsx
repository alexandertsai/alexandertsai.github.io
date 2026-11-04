"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import content from "@/content/about/page.json";

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const indicator = useRef<HTMLSpanElement>(null);
  const animation = useRef<Animation | null>(null);
  const navigation = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writing = pathname === "/blog" || pathname.startsWith("/blog/");

  useEffect(() => () => {
    animation.current?.cancel();
    if (navigation.current) clearTimeout(navigation.current);
  }, []);

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const underline = indicator.current;
    const anchor = underline?.parentElement;
    if (!underline || !anchor || typeof underline.animate !== "function") return;
    event.preventDefault();
    if (navigation.current) clearTimeout(navigation.current);
    const origin = anchor.getBoundingClientRect();
    const current = underline.getBoundingClientRect();
    const target = event.currentTarget.getBoundingClientRect();
    animation.current?.cancel();
    animation.current = underline.animate([
      { transform: `translateX(${current.left - origin.left}px)`, width: `${current.width}px` },
      { transform: `translateX(${target.left - origin.left}px)`, width: `${target.width}px` },
    ], { duration: 220, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "forwards" });
    if (href !== pathname) navigation.current = setTimeout(() => router.push(href), 180);
  }

  return <header className="site-header site-width" data-pond-text>
    <nav aria-label="Main navigation">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined} onClick={(event) => navigate(event, "/")}>
        Home
        {pathname === "/" && <span ref={indicator} className="site-nav-active" aria-hidden="true" />}
      </Link>
      <Link href="/blog/" aria-current={writing ? "page" : undefined} onClick={(event) => navigate(event, "/blog/")}>
        Writing
        {writing && <span ref={indicator} className="site-nav-active" aria-hidden="true" />}
      </Link>
      <a href={content.resume} target="_blank" rel="noopener noreferrer">Résumé <span aria-hidden="true">↗</span></a>
    </nav>
  </header>;
}
