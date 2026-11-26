"use client";

import { useEffect, useRef } from "react";
import { gardenMarkup } from "./garden-markup";
import SiteHeader from "../components/SiteHeader";
import { mountGarden } from "./garden-app";
import { endDeparture } from "../components/depart";

const saveUrl = process.env.NEXT_PUBLIC_GARDEN_SAVE_URL ?? "";

export default function LearningGarden({ store, className }: { store: unknown; className: string }) {
  const host = useRef<HTMLDivElement>(null);
  const initial = useRef(store);
  const editable = Boolean(saveUrl);

  // Mount once: later renders (a dev refresh after each save) must not restart the garden.
  // While editing, read the file itself so the page never starts from an older copy.
  useEffect(() => {
    const element = host.current;
    if (!element) { endDeparture(); return; }
    let stop: (() => void) | undefined, cancelled = false, frame = 0;
    const start = (data: unknown) => {
      if (cancelled) return;
      stop = mountGarden(element, data, { editable, saveUrl });
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(endDeparture); });
    };
    if (editable) fetch(saveUrl.replace(/\/save$/, "/garden"), { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : initial.current), () => initial.current)
      .then(start, () => start(initial.current));
    else start(initial.current);
    return () => { cancelled = true; cancelAnimationFrame(frame); stop?.(); };
  }, [editable]);

  return (
    <div ref={host} className={`learning ${className}${editable ? " editable" : ""}`}>
      <SiteHeader />
      <div className="garden-surface" dangerouslySetInnerHTML={{ __html: gardenMarkup(editable) }} />
    </div>
  );
}
