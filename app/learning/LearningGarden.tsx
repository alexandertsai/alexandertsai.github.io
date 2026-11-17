"use client";

import { useEffect, useRef } from "react";
import SiteHeader from "../components/SiteHeader";
import { mountGarden } from "./garden-app";
import { endDeparture } from "../components/depart";

const saveUrl = process.env.NEXT_PUBLIC_GARDEN_SAVE_URL ?? "";

export default function LearningGarden({ store, className }: { store: unknown; className: string }) {
  const host = useRef<HTMLDivElement>(null);
  const editable = Boolean(saveUrl);

  useEffect(() => {
    endDeparture();
    if (!host.current) return;
    return mountGarden(host.current, store, { editable, saveUrl });
  }, [store, editable]);

  const editing = editable ? "plaintext-only" : undefined;
  return (
    <div ref={host} className={`learning ${className}${editable ? " editable" : ""}`}>
      <canvas id="plate" aria-label="A garden of concepts drawn as wireframe plants. Red crosses mark what you can open." />
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <SiteHeader />
      <nav className="tl glow" id="crumbs" aria-label="Where you are" />
      <div className="bl glow" id="g-add" />
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
        <div className="path" id="r-path" />
        <h2 id="r-title" contentEditable={editing} suppressContentEditableWarning spellCheck={false} aria-label="Concept title" />
        <p className="body" id="r-note" contentEditable={editing} suppressContentEditableWarning aria-label="Notes" />
        <section className="articles" id="r-articles" />
        <div className="cols">
          <section className="inside" id="r-inside" />
          <section className="connections" id="r-connections" />
        </div>
        <div className="del" id="r-del" />
      </article>
    </div>
  );
}
