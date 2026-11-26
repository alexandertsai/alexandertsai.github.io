export function gardenMarkup(editable = false) {
  const field = editable ? 'contenteditable="plaintext-only"' : "";
  return `
      <canvas id="plate" aria-label="A garden of concepts drawn as wireframe plants. Red crosses mark what you can open."></canvas>
      <div class="grain" aria-hidden="true"></div>
      <div class="vignette" aria-hidden="true"></div>
      <nav class="tl glow" id="crumbs" aria-label="Where you are"></nav>
      <div class="bl glow" id="g-add"></div>
      <div class="br glow" id="g-hint">
        <span>drag</span>
        <span aria-hidden="true">·</span>
        <button type="button" data-hint="find"><i>f</i> find</button>
        <span aria-hidden="true">·</span>
        <button type="button" data-hint="keys"><i>?</i> keys</button>
      </div>
      <div class="undo glow" id="undo" hidden aria-live="polite"></div>
      <div class="find" id="find" hidden>
        <input id="f-q" type="text" placeholder="find a concept" autocomplete="off" spellcheck="false" aria-label="Find a concept" role="combobox" aria-expanded="false" aria-controls="f-sugg">
        <ul class="sugg" id="f-sugg" role="listbox"></ul>
      </div>
      <dl class="keys" id="keys" hidden>
        <dt>arrows, hjkl</dt><dd>move between concepts</dd>
        <dt>enter</dt><dd>open</dd>
        <dt>esc</dt><dd>go up</dd>
        <dt>gg</dt><dd>go to the top</dd>
        ${editable ? "<dt>a</dt><dd>add a concept</dd><dt>c</dt><dd>connect to another concept</dd><dt>e</dt><dd>edit notes</dd>" : ""}
        <dt>f</dt><dd>find a concept and go to it</dd>
        ${editable ? "<dt>dd</dt><dd>delete the selected or open concept</dd><dt>u</dt><dd>undo delete</dd>" : ""}
        <dt>?</dt><dd>show or hide keys</dd>
      </dl>
      <button type="button" id="creature" aria-label="Inspect flying connection" hidden></button>
      <div id="bloom" aria-live="polite"></div>
      <article class="reader glow" id="reader" aria-live="polite">
        <header class="head">
          <div class="path" id="r-path"></div>
          <h2 id="r-title" ${field} spellcheck="false" aria-label="Concept title"></h2>
        </header>
        <div class="scroll" id="r-scroll">
          <p class="body" id="r-note" ${field} aria-label="Notes"></p>
          <section class="articles" id="r-articles"></section>
          <div class="cols">
            <section class="inside" id="r-inside"></section>
            <section class="connections" id="r-connections"></section>
          </div>
          <div class="del" id="r-del"></div>
        </div>
      </article>`;
}
