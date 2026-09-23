export type Surface = {
  id: string;
  kind: "text" | "divider";
  label: string;
  left: number;
  right: number;
  y: number;
  footprint?: number;
  glyphs?: { left: number; right: number; y: number }[];
};

export type Perch = { id: string; fraction: number };
export type Point = { x: number; y: number };

export function measureSurfaces(elements: HTMLElement[], width: number): Surface[] {
  const context = document.createElement("canvas").getContext("2d");
  const surfaces: Surface[] = [];
  const add = (surface: Surface) => {
    const halfFootprint = width * 0.22;
    surface.left = Math.max(surface.left + halfFootprint, width / 2 + 8);
    surface.right = Math.min(surface.right - halfFootprint, window.innerWidth - width / 2 - 8);
    if (surface.right >= surface.left) surfaces.push(surface);
  };

  elements.forEach((element, index) => {
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    if (element.dataset.ponyoPerch === "divider") {
      add({ id: `${index}`, kind: "divider", label: "divider", left: bounds.left, right: bounds.right, y: bounds.bottom - 1 + window.scrollY });
      return;
    }

    const style = getComputedStyle(element);
    if (context) context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    let nodeIndex = 0;
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? "";
      for (const match of text.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const rect = range.getBoundingClientRect();
        const metrics = context?.measureText(match[0]);
        // Range includes font leading; use the visible glyph top as the landing surface.
        const ascent = metrics?.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * 0.8;
        const descent = metrics?.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * 0.2;
        const inkAscent = metrics?.actualBoundingBoxAscent ?? ascent;
        const baseline = rect.top + (rect.height - ascent - descent) / 2 + ascent + window.scrollY;
        const glyphs: NonNullable<Surface["glyphs"]> = [];
        for (let offset = 0; offset < match[0].length; offset++) {
          range.setStart(node, match.index + offset);
          range.setEnd(node, match.index + offset + 1);
          const characterRect = range.getBoundingClientRect();
          const character = context?.measureText(match[0][offset]);
          glyphs.push({
            left: characterRect.left - (character?.actualBoundingBoxLeft ?? 0),
            right: characterRect.left + (character?.actualBoundingBoxRight ?? characterRect.width),
            y: baseline - (character?.actualBoundingBoxAscent ?? inkAscent),
          });
        }
        add({
          id: `${index}:${nodeIndex}:${match.index}`,
          kind: "text", label: match[0], left: rect.left, right: rect.right,
          y: baseline - inkAscent, glyphs, footprint: width * 0.44,
        });
      }
      nodeIndex++;
    }
  });
  return surfaces;
}

export function resolvePerch(surface: Surface, perch: Perch): Point {
  const x = surface.left + (surface.right - surface.left) * perch.fraction;
  const halfFootprint = (surface.footprint ?? 0) / 2;
  const supportingGlyphs = surface.glyphs?.filter((glyph) => glyph.left < x + halfFootprint && glyph.right > x - halfFootprint);
  return { x, y: supportingGlyphs?.length ? Math.min(...supportingGlyphs.map((glyph) => glyph.y)) : surface.y };
}

export function isSurfaceVisible(surface: Surface, scrollY: number, viewportHeight: number, petHeight: number): boolean {
  return surface.y - scrollY >= petHeight + 12 && surface.y - scrollY <= viewportHeight - 30;
}

export function chooseGreetingPerch(surfaces: Surface[], scrollY: number, viewportHeight: number, petHeight: number): Perch | null {
  const candidates = surfaces.filter((surface) =>
    isSurfaceVisible(surface, scrollY, viewportHeight, petHeight) &&
    surface.y - scrollY >= petHeight + 90,
  );
  const preferredY = scrollY + viewportHeight * 0.35;
  const landing = candidates.sort((a, b) =>
    (Math.abs(a.y - preferredY) + (a.kind === "divider" ? 0 : 40)) -
    (Math.abs(b.y - preferredY) + (b.kind === "divider" ? 0 : 40)),
  )[0];
  return landing ? { id: landing.id, fraction: landing.kind === "divider" ? 0.73 : 0.5 } : null;
}
