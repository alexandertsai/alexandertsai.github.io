"use client";

import { useEffect, useRef } from "react";
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
    endDeparture();
    const element = host.current;
    if (!element) return;
    let stop: (() => void) | undefined, cancelled = false;
    const start = (data: unknown) => { if (!cancelled) stop = mountGarden(element, data, { editable, saveUrl }); };
    if (editable) fetch(saveUrl.replace(/\/save$/, "/garden"), { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : initial.current), () => initial.current)
      .then(start, () => start(initial.current));
    else start(initial.current);
    return () => { cancelled = true; stop?.(); };
  }, [editable]);

  const editing = editable ? "plaintext-only" : undefined;
  return (
    <div ref={host} className={`learning ${className}${editable ? " editable" : ""}`}>
      <canvas id="plate" aria-label="A garden of concepts drawn as wireframe plants. Red crosses mark what you can open." />
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <SiteHeader />
      <nav className="tl glow" id="crumbs" aria-label="Where you are" />
      <div className="bl glow" id="g-add" />
      <div className="br glow" id="g-hint">
        <span>drag</span>
        <span aria-hidden="true">·</span>
        <button type="button" data-hint="find"><i>f</i> find</button>
        <span aria-hidden="true">·</span>
        <button type="button" data-hint="keys"><i>?</i> keys</button>
      </div>
      <div className="undo glow" id="undo" hidden aria-live="polite" />
      <div className="find" id="find" hidden>
        <input id="f-q" type="text" placeholder="find a concept" autoComplete="off" spellCheck={false} aria-label="Find a concept" role="combobox" aria-expanded="false" aria-controls="f-sugg" />
        <ul className="sugg" id="f-sugg" role="listbox" />
      </div>
      <dl className="keys" id="keys" hidden>
        <dt>arrows, hjkl</dt><dd>move between concepts</dd>
        <dt>enter</dt><dd>open</dd>
        <dt>esc</dt><dd>go up</dd>
        <dt>gg</dt><dd>go to the top</dd>
        {editable && <>
          <dt>a</dt><dd>add a concept</dd>
          <dt>c</dt><dd>connect to another concept</dd>
          <dt>e</dt><dd>edit notes</dd>
        </>}
        <dt>f</dt><dd>find a concept and go to it</dd>
        {editable && <>
          <dt>dd</dt><dd>delete the selected or open concept</dd>
          <dt>u</dt><dd>undo delete</dd>
        </>}
        <dt>?</dt><dd>show or hide keys</dd>
      </dl>
      <div id="bloom" aria-live="polite" />
      <article className="reader glow" id="reader" aria-live="polite">
        <header className="head">
          <div className="path" id="r-path" />
          <h2 id="r-title" contentEditable={editing} suppressContentEditableWarning spellCheck={false} aria-label="Concept title" />
        </header>
        <div className="scroll" id="r-scroll">
          <p className="body" id="r-note" contentEditable={editing} suppressContentEditableWarning aria-label="Notes" />
          <section className="articles" id="r-articles" />
          <div className="cols">
            <section className="inside" id="r-inside" />
            <section className="connections" id="r-connections" />
          </div>
          <div className="del" id="r-del" />
        </div>
      </article>
    </div>
  );
}
