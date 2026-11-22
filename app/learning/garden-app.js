// The knowledge garden: concepts drawn as wireframe plants. Mounted into the Learning page;
// mountGarden returns a function that stops it and removes every listener it added.
import { createGarden } from "./garden-engine";

// The starting tree: an empty root. Tree = "contains"; links = cross-references.
function buildTree() {
  const nodes = [{ id: "root", title: "Everything I know", parent: null, note: "" }];
  const hues = { root: [226, 232, 255] };
  const byId = Object.fromEntries(nodes.map((n) => [n.id, { ...n, children: [], links: [] }]));
  for (const n of Object.values(byId)) if (n.parent) byId[n.parent].children.push(n);
  for (const n of Object.values(byId)) {
    let d = 0, p = n;
    while (p.parent) { d++; if (p.parent === "root") n.domain = p.id; p = byId[p.parent]; }
    if (n.id === "root") n.domain = "root";
    if (n.parent === "root") n.domain = n.id;
    n.depth = d;
    n.rgb = hues[n.domain];
  }
  return { byId, root: byId.root, list: Object.values(byId) };
}

export function mountGarden(host, file, { editable = false, saveUrl = "" } = {}) {
  const controller = new AbortController(), { signal } = controller;
  const on = (target, type, fn, opts) => target.addEventListener(type, fn, { ...opts, signal });
  const timers = new Set();
  const setTimeout = (fn, ms) => {
    const id = window.setTimeout(() => { timers.delete(id); if (!signal.aborted) fn(); }, ms);
    timers.add(id);
    return id;
  };
  const FONT = getComputedStyle(host).getPropertyValue("--font-plex-mono").trim() || "monospace";
  let raf = 0;

  const KG = buildTree();
  const { byId, root, list } = KG;
  const { forget, L, FLOOR, figure, anchors, scene, isGarden, createView, projector, hash } = createGarden(KG);
  const cv = document.getElementById("plate"), ctx = cv.getContext("2d");
  const wire = document.createElement("canvas"), wctx = wire.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const darkMedia = matchMedia("(prefers-color-scheme: dark)");
  let dark = darkMedia.matches;
  on(darkMedia, "change", (e) => { dark = e.matches; });
  const THEMES = {
    dark: {
      bg: "#000", bgFade0: "rgba(0,0,0,0)",
      floor: "220,220,250", floorK: 0.42, plotK: 1, tick: "235,235,250", tickK: 1.8,
      wire: "222,222,252", wireBase: 0.55, wireDepth: 0.35, wireLit: 1,
      red: "#ff3b2e", redGlow: "rgba(255,70,50,0.8)", redBlur: 8, redLine: "rgba(255,59,46,0.55)",
      label: "rgba(222,222,234,0.95)", labelHot: "rgba(250,250,255,1)", labelHalo: "#000",
      wake: "222,222,252", wakeK: 0.32, fauna: "240,240,255", faunaK: 0.95,
      firefly: "255,244,190", fireflyK: 0.85,
    },
    light: {
      bg: "#f3f1e9", bgFade0: "rgba(243,241,233,0)",
      floor: "48,62,54", floorK: 0.24, plotK: 0.72, tick: "36,48,42", tickK: 1.35,
      wire: "38,52,45", wireBase: 0.44, wireDepth: 0.34, wireLit: 0.96,
      red: "#b84326", redGlow: "rgba(184,67,38,0.22)", redBlur: 4, redLine: "rgba(184,67,38,0.5)",
      label: "rgba(36,44,41,0.92)", labelHot: "rgba(17,23,21,1)", labelHalo: "#f3f1e9",
      wake: "48,62,54", wakeK: 0.28, fauna: "32,42,37", faunaK: 0.88,
      firefly: "218,148,32", fireflyK: 0.55,
    },
  };
  const pal = () => (dark ? THEMES.dark : THEMES.light);
  let W, H, DPR, small;

  /* ---------------- edits ---------------- */
  // Concepts you add are kept as {id, title, note, parent} records and grafted onto the starting tree.
  // The page starts from the saved file; while editing locally, every change is posted back to it.
  const NS = "";
  const PARTS = ["added", "edits", "deleted", "links", "unlinked", "articles"];
  const memory = Object.fromEntries(PARTS.map((k) => [k, JSON.stringify(file?.[k] ?? (k === "edits" || k === "articles" ? {} : []))]));
  const localStorage = { getItem: (k) => memory[k] ?? null, setItem: (k, v) => { memory[k] = v; } };
  const store = {
    snapshot() {
      const out = { saved: Date.now() };
      for (const k of PARTS) out[k] = JSON.parse(memory[k]);
      return JSON.stringify(out);
    },
    set(k, v) {
      memory[k] = v;
      if (!editable) return;
      clearTimeout(store.t); store.t = setTimeout(store.flush, 400);
    },
    flush() {
      if (!store.t || !saveUrl) return;
      clearTimeout(store.t); store.t = null;
      fetch(saveUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: store.snapshot(), keepalive: true }).catch(() => {});
    },
  };
  on(window, "pagehide", () => store.flush());
  const ADDED = NS + "added";
  let added = [];
  try { added = JSON.parse(localStorage.getItem(ADDED) || "[]"); } catch {}
  function graft(rec) {
    const p = byId[rec.parent];
    if (!p || byId[rec.id]) return null;
    const n = { ...rec, children: [], links: [], domain: p.domain === "root" ? rec.id : p.domain, depth: p.depth + 1, rgb: p.rgb, cat: String(list.length).padStart(3, "0") };
    byId[n.id] = n; p.children.push(n); list.push(n);
    return n;
  }
  const KEY = NS + "edits";
  let edits = {};
  try { edits = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
  for (const [id, e] of Object.entries(edits)) if (byId[id]) Object.assign(byId[id], e);
  const persist = () => { try { store.set(KEY, JSON.stringify(edits)); return true; } catch { return false; } };
  // Articles: links to read more, kept per concept as { id: [{ url, title }] }.
  const ARTICLES = NS + "articles";
  let articles = {};
  try { articles = JSON.parse(localStorage.getItem(ARTICLES) || "{}"); } catch {}
  const saveArticles = () => { try { store.set(ARTICLES, JSON.stringify(articles)); } catch {} };

  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; small = W < 640;
    for (const c of [cv, wire]) { c.width = W * DPR; c.height = H * DPR; }
  }

  const view = createView({ dur: 1000, pitch: 0.56 });
  view.set(root);
  list.forEach((n, i) => (n.cat = String(i).padStart(3, "0")));
  added.forEach(graft);
  for (const rec of added) if (edits[rec.id]) Object.assign(byId[rec.id], edits[rec.id]);

  // Deleting a concept removes it and everything inside it, plus every connection to them.
  let myLinks = [], unlinked = [];
  const DELETED = NS + "deleted";
  let deleted = [];
  try { deleted = JSON.parse(localStorage.getItem(DELETED) || "[]"); } catch {}
  const subtree = (n) => [n, ...n.children.flatMap(subtree)];
  function prune(n) {
    const gone = new Set(subtree(n).map((m) => m.id));
    const p = byId[n.parent];
    p.children = p.children.filter((c) => c !== n);
    for (const id of gone) { delete byId[id]; delete edits[id]; delete articles[id]; }
    for (let i = list.length - 1; i >= 0; i--) if (gone.has(list[i].id)) list.splice(i, 1);
    for (const m of list) m.links = m.links.filter((l) => !gone.has(l.id));
    added = added.filter((r) => !gone.has(r.id));
    myLinks = myLinks.filter(([a, b]) => !gone.has(a) && !gone.has(b));
    return gone;
  }
  for (const id of deleted) if (byId[id] && byId[id] !== root) prune(byId[id]);

  // Connections you add are kept as [from, to, type]; sample connections you remove as "from|to|type".
  const LINKS = NS + "links", UNLINKED = NS + "unlinked";
  try { myLinks = JSON.parse(localStorage.getItem(LINKS) || "[]"); unlinked = JSON.parse(localStorage.getItem(UNLINKED) || "[]"); } catch {}
  const attach = (a, b, type) => {
    if (!byId[a] || !byId[b] || a === b || byId[a].links.some((l) => l.id === b)) return false;
    byId[a].links.push({ id: b, type, dir: "out" }); byId[b].links.push({ id: a, type, dir: "in" });
    return true;
  };
  const detach = (a, b, type) => {
    if (byId[a]) byId[a].links = byId[a].links.filter((l) => !(l.id === b && l.type === type && l.dir === "out"));
    if (byId[b]) byId[b].links = byId[b].links.filter((l) => !(l.id === a && l.type === type && l.dir === "in"));
  };
  for (const k of unlinked) detach(...k.split("|"));
  myLinks = myLinks.filter((l) => attach(...l));
  const saveLinks = () => { try { store.set(LINKS, JSON.stringify(myLinks)); store.set(UNLINKED, JSON.stringify(unlinked)); return true; } catch { return false; } };
  const asStored = (n, l) => (l.dir === "out" ? [n.id, l.id, l.type] : [l.id, n.id, l.type]);
  const lower = (s) => s.toLowerCase();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const reading = () => !isGarden(view.node);

  /* ---------------- annotations ---------------- */
  const $ = (id) => document.getElementById(id);


  function annotate() {
    const n = view.node;
    // Inside a garden, only a quiet path back up; at the top, nothing at all.
    const up = [];
    for (let p = n.parent ? byId[n.parent] : null; p; p = p.parent ? byId[p.parent] : null)
      up.unshift(`<button type="button" data-id="${p.id}">${esc(p === root ? "knowledge" : lower(p.title))}</button>`);
    $("crumbs").innerHTML = n === root ? "" : `${up.join(" / ")} / <b>${esc(lower(n.title))}</b>`;
    if (reading()) shown = null;
    host.classList.toggle("reading", reading());
    host.classList.toggle("notes", !!shown);
    if (reading() || shown) renderReader();
    if (!reading() && !$("g-add").querySelector("#r-new")) renderGardenAdd();
  }

  // In a garden, resting on a concept opens its notes beside the garden; they stay until another is picked.
  let shown = null;
  const subj = () => (reading() ? view.node : shown || view.node);
  function closeNotes() {
    clearTimeout(dwell.t);
    if (!shown) return;
    shown = null;
    host.classList.remove("notes");
    host.classList.add("notes-out");
    clearTimeout(closeNotes.t);
    closeNotes.t = setTimeout(() => host.classList.remove("notes-out"), 320);
  }
  function show(n) {
    if (reading() || !n || !byId[n.id] || view.dir) return;
    clearTimeout(closeNotes.t); host.classList.remove("notes-out");
    if (n === shown) return;
    shown = n; annotate();
  }
  // a short pause before switching, so passing over other plants on the way to the panel leaves it alone
  function dwell(n) {
    clearTimeout(dwell.t);
    if (!n || n === shown || reading() || typing()) return;
    dwell.t = setTimeout(() => { if (!typing() && !lay.moving) show(n); }, 250);
  }
  on($("crumbs"), "mouseover", (e) => { if (e.target.closest("b")) dwell(view.node); });

  // The text below the title scrolls on its own; fades at either end show there is more.
  function edges() {
    const el = $("r-scroll");
    el.classList.toggle("more-above", el.scrollTop > 2);
    el.classList.toggle("more-below", el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  }
  on($("r-scroll"), "scroll", edges, { passive: true });
  on($("r-note"), "input", edges);
  on(window, "resize", edges);
  let lastShown = null;

  function renderReader() {
    const n = subj(), path = [];
    if (n.id !== lastShown) { lastShown = n.id; $("r-scroll").scrollTop = 0; }
    requestAnimationFrame(edges);
    if (reading()) for (let p = n.parent ? byId[n.parent] : null; p; p = p.parent ? byId[p.parent] : null)
      path.unshift(`<button type="button" data-id="${p.id}">${esc(p === root ? "knowledge" : lower(p.title))}</button>`);
    $("r-path").innerHTML = path.join(" / ");
    if (document.activeElement !== $("r-title")) $("r-title").textContent = n.title;
    if (document.activeElement !== $("r-note")) $("r-note").textContent = n.note;
    if (!$("r-articles").contains(document.activeElement) || document.activeElement.tagName !== "INPUT") renderArticles();
    $("r-inside").innerHTML = `<h3>inside</h3><ul>`
      + (n.children.length ? n.children.map((c) => `<li><button data-id="${c.id}">${esc(lower(c.title))}</button></li>`).join("") : "")
      + `<li class="add"><button id="r-add" type="button" aria-label="Add a concept inside">add</button></li></ul>`;
    $("r-connections").innerHTML = `<h3>connections</h3><ul>`
      + n.links.map((l) => `<li><button data-id="${l.id}">${esc(lower(byId[l.id].title))}</button>`
        + `<button type="button" class="unlink" data-unlink="${asStored(n, l).join("|")}" aria-label="Remove this connection">×</button></li>`).join("")
      + `<li class="add"><button id="r-link" type="button" aria-label="Connect another concept">add</button></li></ul>`;
    $("r-del").innerHTML = n === root ? "" : `<button type="button" data-del="ask">delete</button>`;
  }

  on($("r-del"), "click", (e) => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    const n = subj(), inner = subtree(n).length - 1;
    if (b.dataset.del === "ask") {
      const what = inner ? `delete "${esc(lower(n.title))}" and the ${inner} ${inner === 1 ? "concept" : "concepts"} inside it?` : `delete "${esc(lower(n.title))}"?`;
      $("r-del").innerHTML = `<span>${what}</span><button type="button" class="yes" data-del="yes">delete</button><button type="button" data-del="no">keep</button>`;
      return;
    }
    if (b.dataset.del === "no") return renderReader();
    deleteConcept(n);
  });

  // Deleting keeps what it removed, so "u" can put it back exactly: records, notes, connections and place among siblings.
  const undos = [];
  const saveAll = () => { saveArticles(); try { store.set(DELETED, JSON.stringify(deleted)); store.set(ADDED, JSON.stringify(added)); persist(); saveLinks(); } catch {} };
  function refresh() { forget(); groundCache.clear(); fit = null; hover = null; keyPick = null; }
  function deleteConcept(n) {
    if (!n || n === root || !byId[n.id]) return;
    const gone = subtree(n), ids = new Set(gone.map((m) => m.id)), p = byId[n.parent], open = view.node;
    const mine = added.some((r) => r.id === n.id);
    undos.push({
      id: n.id, title: n.title, inner: gone.length - 1, parent: p.id, order: p.children.map((c) => c.id), at: open.id, sample: !mine,
      recs: added.filter((r) => ids.has(r.id)).map((r) => ({ ...r })),
      edits: Object.fromEntries(Object.entries(edits).filter(([id]) => ids.has(id))),
      links: myLinks.filter(([a, b]) => ids.has(a) || ids.has(b)).map((l) => [...l]),
      articles: Object.fromEntries(Object.entries(articles).filter(([id]) => ids.has(id))),
    });
    prune(n);
    if (shown && ids.has(shown.id)) closeNotes();
    if (!mine) deleted.push(n.id); // a concept you added simply leaves its own record
    saveAll(); refresh();
    if (ids.has(open.id)) {
      host.classList.remove("reading");
      view.jump(p);
      setTimeout(annotate, 520);
      history.replaceState(history.state, "", p === root ? "#" : `#${p.id}`);
    } else annotate();
    showUndo();
  }
  function undo() {
    const u = undos.pop();
    if (!u || !byId[u.parent]) return showUndo();
    for (const rec of u.recs) { added.push(rec); graft(rec); if (u.edits[rec.id]) { edits[rec.id] = u.edits[rec.id]; Object.assign(byId[rec.id], u.edits[rec.id]); } }
    if (u.sample) deleted = deleted.filter((id) => id !== u.id);
    const p = byId[u.parent];
    p.children.sort((a, b) => u.order.indexOf(a.id) - u.order.indexOf(b.id));
    for (const l of u.links) if (attach(...l)) myLinks.push(l);
    Object.assign(articles, u.articles); saveArticles();
    saveAll(); refresh();
    const back = byId[u.at];
    if (back && back !== view.node) {
      host.classList.remove("reading");
      view.jump(back);
      setTimeout(annotate, 520);
      history.replaceState(history.state, "", back === root ? "#" : `#${back.id}`);
    } else annotate();
    showUndo();
  }
  function showUndo() {
    const u = undos[undos.length - 1], el = $("undo");
    clearTimeout(showUndo.t);
    if (!u) { el.hidden = true; return; }
    el.innerHTML = `<span>deleted ${esc(lower(u.title))}${u.inner ? ` and ${u.inner} inside` : ""}</span><button type="button" id="undo-btn">undo</button>`;
    el.hidden = false; el.classList.remove("gone");
    showUndo.t = setTimeout(() => { el.classList.add("gone"); showUndo.t = setTimeout(() => (el.hidden = true), 600); }, 3000);
  }
  on($("undo"), "click", (e) => { if (e.target.closest("#undo-btn")) undo(); });

  function onEdit() {
    const n = subj();
    n.title = $("r-title").textContent.trim() || n.title;
    n.note = $("r-note").textContent.trim();
    edits[n.id] = { title: n.title, note: n.note };
    persist();
  }
  function addConcept(title, parent) {
    const rec = { id: "u" + Date.now().toString(36), title, note: "", parent: parent.id };
    graft(rec); added.push(rec);
    try { store.set(ADDED, JSON.stringify(added)); } catch {}
    forget(); groundCache.clear(); fit = null;
    annotate();
  }
  // "add a concept": an inline field; Enter adds it inside the open concept and leaves the field open, Esc cancels.
  function addField(host, close, reopen, parent) {
    host.innerHTML = `<input id="r-new" type="text" placeholder="name" autocomplete="off" spellcheck="false" aria-label="New concept">`;
    const input = $("r-new"); input.focus();
    on(input, "keydown", (k) => {
      if (k.key === "Escape") { k.stopPropagation(); close(); }
      if (k.key !== "Enter") return;
      const title = input.value.trim();
      if (!title) return close();
      addConcept(title, parent());
      reopen();
    });
    on(input, "blur", () => setTimeout(() => { if (document.activeElement !== $("r-new") && $("r-new")) close(); }, 150));
  }
  on($("r-inside"), "click", (e) => {
    if (!e.target.closest("#r-add")) return;
    addField(e.target.closest("li"), renderReader, () => $("r-add")?.click(), subj);
  });
  const renderGardenAdd = () => { if (!editable) return; $("g-add").innerHTML = `<button type="button" id="g-add-btn">add to ${esc(view.node === root ? "knowledge" : lower(view.node.title))}</button>`; };
  on($("g-add"), "click", (e) => {
    if (!e.target.closest("#g-add-btn")) return;
    addField($("g-add"), renderGardenAdd, () => { renderGardenAdd(); if (!reading()) $("g-add-btn").click(); }, () => view.node);
  });
  // Connections: removing one, turning one to the next kind of relation, or adding one by typing part of a name.
  function dropConnection(k) {
    detach(...k.split("|"));
    const mine = myLinks.findIndex((l) => l.join("|") === k);
    if (mine >= 0) myLinks.splice(mine, 1); else unlinked.push(k);
  }
  function addConnection(rec) {
    if (!attach(...rec)) return false;
    const back = unlinked.indexOf(rec.join("|"));
    if (back >= 0) unlinked.splice(back, 1); else myLinks.push(rec);
    return true;
  }
  // moving through a suggestion list: arrows, or Ctrl+J/K and Ctrl+N/P
  const listMove = (k) => k.key === "ArrowDown" || (k.ctrlKey && (k.key === "j" || k.key === "n")) ? 1 : k.key === "ArrowUp" || (k.ctrlKey && (k.key === "k" || k.key === "p")) ? -1 : 0;
  // Rank every concept against what has been typed: whole-word and early matches first, then scattered letters.
  function rank(q, cands) {
    const out = [];
    for (const m of cands) {
      const t = m.title.toLowerCase();
      let at = t.indexOf(q), score, hits;
      if (at >= 0) {
        score = 1000 - at * 4 - t.length + (at === 0 ? 400 : /[\s\-_/]/.test(t[at - 1]) ? 250 : 0);
        hits = Array.from({ length: q.length }, (_, i) => at + i);
      } else {
        hits = []; let j = 0, gaps = 0;
        for (let i = 0; i < t.length && j < q.length; i++) if (t[i] === q[j]) { if (hits.length && i !== hits[hits.length - 1] + 1) gaps++; hits.push(i); j++; }
        if (j < q.length) continue;
        // letters scattered far apart only count when most of them start words ("mm" for matrix multiplication)
        const starts = hits.filter((i) => i === 0 || /[\s\-_/]/.test(t[i - 1])).length;
        if (hits[hits.length - 1] - hits[0] + 1 > 3 * q.length && starts * 2 < hits.length) continue;
        score = 500 - gaps * 30 - hits[0] * 2 - t.length + starts * 25;
      }
      out.push({ m, score, hits });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 8);
  }
  const marked = (title, hits) => { const h = new Set(hits); return [...lower(title)].map((ch, i) => (h.has(i) ? `<b>${esc(ch)}</b>` : esc(ch))).join(""); };

  on($("r-connections"), "click", (e) => {
    const un = e.target.closest("[data-unlink]");
    if (un) { dropConnection(un.dataset.unlink); saveLinks(); return renderReader(); }
    if (!e.target.closest("#r-link")) return;
    const f = subj(), li = e.target.closest("li");
    const cands = list.filter((m) => m !== f && m !== root && !f.links.some((l) => l.id === m.id));
    li.innerHTML = `<input id="r-other" type="text" placeholder="find a concept" autocomplete="off" spellcheck="false" aria-label="Find a concept to link" role="combobox" aria-expanded="false" aria-controls="r-sugg"><ul class="sugg" id="r-sugg" role="listbox"></ul>`;
    const input = $("r-other"), box = $("r-sugg");
    let found = [], sel = 0;
    const show = () => {
      const q = input.value.trim().toLowerCase();
      found = q ? rank(q, cands) : [];
      sel = Math.min(sel, Math.max(0, found.length - 1));
      box.innerHTML = q && !found.length ? `<li class="none">no matches</li>`
        : found.map((r, i) => `<li role="option" data-pick="${i}" class="${i === sel ? "on" : ""}" aria-selected="${i === sel}">${marked(r.m.title, r.hits)}${r.m.parent && r.m.parent !== "root" ? `<span class="in">${esc(lower(byId[r.m.parent].title))}</span>` : ""}</li>`).join("");
      input.setAttribute("aria-expanded", found.length ? "true" : "false");
    };
    const pick = (i) => {
      const r = found[i]; if (!r) return;
      addConnection([f.id, r.m.id, "related"]);
      saveLinks(); renderReader(); $("r-link")?.focus();
    };
    input.focus();
    on(input, "input", () => { sel = 0; show(); });
    on(input, "keydown", (k) => {
      if (k.key === "Escape") { k.stopPropagation(); return renderReader(); }
      const mv = listMove(k); if (mv) { k.preventDefault(); if (found.length) { sel = (sel + mv + found.length) % found.length; show(); } return; }
      if (k.key === "Enter" || (k.key === "Tab" && found.length)) { k.preventDefault(); pick(sel); }
    });
    on(box, "mousedown", (m) => { const it = m.target.closest("[data-pick]"); if (!it) return; m.preventDefault(); pick(+it.dataset.pick); });
    on(input, "blur", () => setTimeout(() => { if ($("r-other") && document.activeElement !== $("r-other")) renderReader(); }, 150));
  });
  // Articles: paste a link, then name it (or press Enter to use the site's name). Only http(s) links are kept.
  const siteOf = (u) => { try { const x = new URL(u); return x.hostname.replace(/^www\./, "") + (x.pathname.length > 1 ? x.pathname.replace(/\/$/, "") : ""); } catch { return u; } };
  function cleanUrl(raw) {
    const t = raw.trim(); if (!t) return null;
    try { const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : "https://" + t); return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : null; } catch { return null; }
  }
  function renderArticles() {
    const n = subj(), items = articles[n.id] || [];
    $("r-articles").innerHTML = `<h3>articles</h3><ul>`
      + items.map((a, i) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title || siteOf(a.url))}</a>`
        + (a.title ? `<span class="site">${esc(siteOf(a.url).split("/")[0])}</span>` : "") + `<button type="button" class="unlink" data-art="${i}" aria-label="Remove this article">×</button></li>`).join("")
      + `<li class="add"><button id="r-art" type="button" aria-label="Add an article">add</button></li></ul>`;
  }
  on($("r-articles"), "click", (e) => {
    const rm = e.target.closest("[data-art]");
    if (rm) { const n = subj(); (articles[n.id] || []).splice(+rm.dataset.art, 1); if (!articles[n.id]?.length) delete articles[n.id]; saveArticles(); return renderArticles(); }
    if (!e.target.closest("#r-art")) return;
    const li = e.target.closest("li"), id = subj().id;
    li.innerHTML = `<input id="r-url" type="text" placeholder="paste a link" autocomplete="off" spellcheck="false" aria-label="Article link">`;
    const input = $("r-url"); input.focus();
    let url = null;
    const close = () => setTimeout(() => { if (document.activeElement !== $("r-url")) renderArticles(); }, 150);
    on(input, "blur", close);
    on(input, "keydown", (k) => {
      if (k.key === "Escape") { k.stopPropagation(); return renderArticles(); }
      if (k.key !== "Enter") return;
      k.preventDefault();
      if (url === null) {
        url = cleanUrl(input.value);
        if (!url) { input.value = ""; input.placeholder = "not a web link"; return; }
        input.value = ""; input.placeholder = `title for ${siteOf(url).split("/")[0]} (optional)`; input.setAttribute("aria-label", "Article title");
        return;
      }
      (articles[id] ||= []).push({ url, title: input.value.trim() });
      saveArticles(); renderArticles(); $("r-art")?.click();
    });
  });

  // Find: type part of any concept's name; Enter goes straight to it.
  const pathOf = (m) => { const up = []; for (let p = byId[m.parent]; p && p !== root; p = byId[p.parent]) up.unshift(lower(p.title)); return up.join(" / "); };
  let findHits = [], findSel = 0;
  function showFind() {
    const q = $("f-q").value.trim().toLowerCase();
    findHits = q ? rank(q, list.filter((m) => m !== view.node)) : [];
    findSel = Math.min(findSel, Math.max(0, findHits.length - 1));
    $("f-sugg").innerHTML = q && !findHits.length ? `<li class="none">no matches</li>`
      : findHits.map((r, i) => `<li role="option" data-pick="${i}" class="${i === findSel ? "on" : ""}" aria-selected="${i === findSel}">${marked(r.m.title, r.hits)}${pathOf(r.m) ? `<span class="in">${esc(pathOf(r.m))}</span>` : ""}</li>`).join("");
    $("f-q").setAttribute("aria-expanded", findHits.length ? "true" : "false");
  }
  function openFind() { $("find").hidden = false; $("f-q").value = ""; findSel = 0; showFind(); $("f-q").focus(); }
  function closeFind() { $("find").hidden = true; $("f-q").blur(); }
  function findGo(i) { const r = findHits[i]; if (!r) return; closeFind(); go(r.m); }
  on($("f-q"), "input", () => { findSel = 0; showFind(); });
  on($("f-q"), "keydown", (k) => {
    if (k.key === "Escape") { k.stopPropagation(); return closeFind(); }
    const mv = listMove(k); if (mv) { k.preventDefault(); if (findHits.length) { findSel = (findSel + mv + findHits.length) % findHits.length; showFind(); } return; }
    if (k.key === "Enter" || (k.key === "Tab" && findHits.length)) { k.preventDefault(); findGo(findSel); }
  });
  on($("f-sugg"), "mousedown", (m) => { const it = m.target.closest("[data-pick]"); if (!it) return; m.preventDefault(); findGo(+it.dataset.pick); });
  on($("f-q"), "blur", () => setTimeout(() => { if (document.activeElement !== $("f-q")) $("find").hidden = true; }, 150));

  on($("r-title"), "input", onEdit);
  on($("r-note"), "input", onEdit);
  on($("r-title"), "keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("r-note").focus(); } });

  function go(node) {
    if (view.dir || node === view.node) return;
    const cur = view.node;
    if (node.parent === cur.id) view.dive(node);
    else if (cur.parent === node.id) view.rise(node);
    else view.jump(node);
    host.classList.remove("reading");
    hover = null; keyPick = null;
    if (shown && isGarden(node)) { clearTimeout(dwell.t); shown = node; renderReader(); } else closeNotes();
    $("crumbs").innerHTML = ""; $("g-add").innerHTML = "";
    // from a garden into a single plant, the plant slides aside first; show the text once it has room
    const slide = view.dir && isGarden(cur) && !isGarden(node);
    setTimeout(annotate, slide ? view.dur + 150 : view.dir ? 520 : 0);
    history.replaceState(history.state, "", node === root ? "#" : `#${node.id}`);
  }
  on(document, "click", (e) => {
    const hint = e.target.closest("#g-hint [data-hint]");
    if (hint) {
      if (hint.dataset.hint === "find") openFind();
      if (hint.dataset.hint === "keys") $("keys").hidden = !$("keys").hidden;
      return;
    }
    if (!$("keys").hidden && !e.target.closest("#keys")) $("keys").hidden = true;
    const b = e.target.closest("#crumbs [data-id], #reader [data-id], #bloom [data-id]");
    if (b) go(byId[b.dataset.id]);
  });
  // Keyboard: on an open plant, arrows and hjkl walk the "inside" list in order (down/right forward, up/left back,
  // wrapping). In a garden they pick the nearest plant in that direction, wrapping to the far side at the edge.
  // Enter opens the pick, Esc goes up.
  const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], h: [-1, 0], l: [1, 0], k: [0, -1], j: [0, 1] };
  function step([dx, dy]) {
    if (document.activeElement?.tagName === "BUTTON") document.activeElement.blur(); // so Enter opens the pick, not a focused button
    if (reading()) {
      const kids = view.node.children;
      if (!kids.length) return;
      const i = kids.indexOf(hover), fwd = dx + dy > 0;
      hover = i < 0 ? kids[fwd ? 0 : kids.length - 1] : kids[(i + (fwd ? 1 : -1) + kids.length) % kids.length];
      return;
    }
    if (!targets.length) return;
    const cur = targets.find((t) => t.n === hover);
    if (!cur) { hover = targets.reduce((a, t) => (Math.hypot(t.x - W / 2, t.y - H / 2) < Math.hypot(a.x - W / 2, a.y - H / 2) ? t : a)).n; return; }
    let best = null, bs = Infinity, wrap = null, ws = Infinity;
    for (const t of targets) {
      if (t === cur) continue;
      const vx = t.x - cur.x, vy = t.y - cur.y, along = vx * dx + vy * dy, across = Math.abs(vx * dy - vy * dx);
      if (along > 0) { const sc = along + 2 * across; if (sc < bs) { bs = sc; best = t; } }
      else { const sc = along + 0.5 * across; if (sc < ws) { ws = sc; wrap = t; } }
    }
    hover = (best || wrap || cur).n;
  }
  const markSel = () => { for (const b of $("r-inside").querySelectorAll("[data-id]")) b.classList.toggle("sel", hover?.id === b.dataset.id); };
  let keyPick = null, lastD = 0, lastG = 0;
  const typing = () => { const a = document.activeElement; return a && (a.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)); };
  on(window, "keydown", (e) => {
    if (e.key === "Escape") {
      if (typing()) return document.activeElement.blur();
      if (!$("keys").hidden) return ($("keys").hidden = true);
      if (caught) return release();
      if (shown) return closeNotes();
      if (view.node.parent) go(byId[view.node.parent]);
      return;
    }
    if (typing() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!editable && /^[acedu]$/i.test(e.key)) return;
    if (DIRS[e.key]) { e.preventDefault(); step(DIRS[e.key]); keyPick = hover; if (!reading()) show(hover); return markSel(); }
    if (e.key === "Enter" && hover && !document.activeElement?.closest?.("button")) { e.preventDefault(); return go(hover); }
    const k = e.key.toLowerCase();
    if (e.key === "g") {
      if (performance.now() - lastG < 600) { lastG = 0; return go(root); } // gg: to the top
      lastG = performance.now(); return;
    }
    if (k === "a") { e.preventDefault(); return (reading() ? $("r-add") : $("g-add-btn"))?.click(); }
    if ((k === "c" || k === "e") && !reading() && !shown) show(view.node);
    if (k === "c") { e.preventDefault(); return $("r-link")?.click(); }
    if (k === "e") {
      e.preventDefault();
      const el = $("r-note"); el.focus();
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      getSelection().removeAllRanges(); getSelection().addRange(r);
      return;
    }
    if (e.key === "d") {
      // dd: delete the concept picked with the arrows, or else the open one
      if (now() - lastD < 600) { lastD = 0; return deleteConcept(keyPick && byId[keyPick.id] ? keyPick : view.node); }
      lastD = now(); return;
    }
    if (e.key === "u") return undo();
    if (k === "f") { e.preventDefault(); return openFind(); }
    if (e.key === "?") $("keys").hidden = !$("keys").hidden;
  });
  const now = () => performance.now();

  /* ---------------- layout: garden centre stage, or the plant set aside for reading ---------------- */
  const lay = { cx: 0, cy: 0, S: 0, set: false };
  function layoutTarget() {
    const m = Math.min(W, H);
    const readLayout = view.outer ? !isGarden(view.outer) && !isGarden(view.inner) : reading();
    if (!readLayout) {
      // with the notes open, the garden moves aside and shrinks a little to make room
      const S = (m * (small ? 0.3 : 0.33) * 1.45) / ground(view.node).ext, side = !!shown;
      if (!side) return { cx: W / 2, cy: H * (small ? 0.4 : 0.41), S };
      return small ? { cx: W / 2, cy: H * 0.24, S: S * 0.62 } : (() => {
        const free = $("reader").getBoundingClientRect().left - 180, ext = ground(view.node).ext;
        return { cx: free / 2 + 8, cy: H * 0.43, S: Math.min(S * 0.85, (free / 2) / (1.25 * ext)) };
      })();
    }
    if (!fit || fit.node !== view.node || fit.W !== W || fit.H !== H) fit = fitPlant(view.node);
    return fit;
  }

  // Reading view: the plant turns slowly beside the text. Its size and place are set once so that it fits the
  // free space at every angle (it never meets the text, and never swells or drifts as it turns); it starts at the
  // angle where it and its leaf labels fit largest with the labels kept apart.
  let fit = null;
  function fitPlant(node) {
    const m = Math.min(W, H), Smax = small ? m * 0.3 : m * 0.34, pad = 28;
    // where the text starts in the reading view (left: 44% in garden.css), not where the reader is now:
    // arriving from the notes panel, it is still on the right while this runs
    const box = small
      ? { x0: 16, x1: W - 16, y0: 120, y1: Math.max(200, H * 0.42 - 20) }
      : { x0: 40, x1: Math.max(240, W * 0.44 - 48), y0: 120, y1: H - 70 };
    const aw = box.x1 - box.x0 - pad, ah = box.y1 - box.y0 - pad;
    const pl = scene(node).plants[0], P = figure(node), A = anchors(node);
    ctx.font = `400 ${small ? 11 : 12}px ${FONT}`;
    const labels = node.children.map((c) => [A.get(c.id), 12 + ctx.measureText(lower(c.title)).width]);
    const yaws = Array.from({ length: 48 }, (_, i) => view.yaw + (i < 24 ? i : i - 48) * (Math.PI / 24));
    const out = [0, 0, 0];
    let best = null;
    const all = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, lab: [] };
    for (const yaw of yaws) {
      const project = projector({ yaw, pitch: view.pitch }, 0, 0, 1), pt = (i) => project(P[i * 3] * pl.s + pl.pos[0], P[i * 3 + 1] * pl.s + pl.pos[1], P[i * 3 + 2] * pl.s + pl.pos[2], out);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 0; i < P.length / 3; i += 2) { pt(i); x0 = Math.min(x0, out[0]); x1 = Math.max(x1, out[0]); y0 = Math.min(y0, out[1]); y1 = Math.max(y1, out[1]); }
      const lab = labels.map(([i, w]) => (pt(i), [out[0], out[1], w]));
      all.x0 = Math.min(all.x0, x0); all.x1 = Math.max(all.x1, x1); all.y0 = Math.min(all.y0, y0); all.y1 = Math.max(all.y1, y1); all.lab.push(...lab);
      let S = Math.min(Smax, ah / (y1 - y0), aw / (x1 - x0)), right = x1 * S;
      for (let it = 0; it < 3; it++) {
        right = Math.max(x1 * S, ...lab.map(([x, , w]) => x * S + w));
        const over = right - x1 * S;
        S = Math.min(Smax, ah / (y1 - y0), Math.max(10, (aw - over) / (x1 - x0)));
      }
      right = Math.max(x1 * S, ...lab.map(([x, , w]) => x * S + w));
      let clash = 0;
      for (let a = 0; a < lab.length; a++) for (let b = a + 1; b < lab.length; b++) {
        const [ax, ay, aw] = lab[a], [bx, by, bw] = lab[b];
        if (Math.hypot((ax - bx) * S, (ay - by) * S) < Math.max(44, 0.2 * pl.s * S) || (Math.abs((ay - by) * S) < 17 && ax * S < bx * S + bw && bx * S < ax * S + aw)) clash++;
      }
      const turn = Math.abs(yaw - view.yaw), score = S * (1 - 0.05 * turn / Math.PI) * Math.pow(0.55, clash);
      if (!best || score > best.score) best = { score, yaw, S, cx: (box.x0 + box.x1) / 2 - (x0 * S + right) / 2, cy: (box.y0 + box.y1) / 2 - ((y0 + y1) / 2) * S };
    }
    // one layout that holds at every angle
    const { x0, x1, y0, y1, lab } = all, reach = (S) => Math.max(x1 * S, ...lab.map(([x, , w]) => x * S + w));
    let S = Math.min(Smax, ah / (y1 - y0), aw / (x1 - x0));
    for (let it = 0; it < 3; it++) S = Math.min(Smax, ah / (y1 - y0), Math.max(10, (aw - (reach(S) - x1 * S)) / (x1 - x0)));
    // centred in the free space, moved left only as far as its labels need to clear the text
    let cx = (box.x0 + box.x1) / 2 - ((x0 + x1) / 2) * S;
    cx = Math.max(Math.min(cx, box.x1 - pad / 2 - reach(S)), box.x0 + pad / 2 - x0 * S);
    return { node, W, H, yaw: best.yaw, S, cx, cy: (box.y0 + box.y1) / 2 - ((y0 + y1) / 2) * S, spin: false };
  }

  /* ---------------- drawing ---------------- */
  const tmp = [0, 0, 0];
  let targets = [], lastGroups = new Map();

  // The dashed ground: six cells a side, widened when what stands on it reaches past the edge.
  const reachOf = (node) => {
    const sc = scene(node);
    return 1.1 * Math.max(...sc.plants.map((p) => Math.hypot(p.pos[0], p.pos[2]) + figure(p.node).w * p.s), ...sc.plots.map((p) => Math.hypot(p.pos[0], p.pos[2]) + p.r));
  };
  const groundCache = new Map();
  function ground(node) {
    if (groundCache.has(node.id)) return groundCache.get(node.id);
    const g = { ext: Math.max(1.45, reachOf(node)), n: 6 };
    groundCache.set(node.id, g);
    return g;
  }
  function floor(project, ly, alpha = 1) {
    const { ext, n } = ground(ly.node), th = pal();
    const T = (x, y, z) => project(x * ly.scale + ly.off[0], y * ly.scale + ly.off[1], z * ly.scale + ly.off[2], [0, 0, 0]);
    ctx.strokeStyle = `rgba(${th.floor},${th.floorK * ly.alpha * alpha})`; ctx.lineWidth = 1; ctx.setLineDash([7, 7]);
    for (let i = 0; i <= n; i++) {
      const v = -ext + (2 * ext * i) / n;
      let a = T(v, FLOOR, -ext), b = T(v, FLOOR, ext);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      a = T(-ext, FLOOR, v); b = T(ext, FLOOR, v);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // A nested garden's plot: a small dashed square of ground with a tick at each corner.
  function plot(project, ly, pl) {
    const r = (pl.r * ground(pl.node).ext) / 1.45, [x, y, z] = pl.pos, th = pal(), a = ly.alpha * (pl.nested ? 0.22 : 0.4) * th.plotK;
    const P = (dx, dz) => project((x + dx) * ly.scale + ly.off[0], (y + 0.002) * ly.scale + ly.off[1], (z + dz) * ly.scale + ly.off[2], [0, 0, 0]);
    const c = [P(-r, -r), P(r, -r), P(r, r), P(-r, r)];
    ctx.strokeStyle = `rgba(${th.floor},${a})`; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
    ctx.beginPath(); c.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(${th.tick},${a * th.tickK})`;
    for (const p of c) { ctx.beginPath(); ctx.moveTo(p[0] - 3, p[1]); ctx.lineTo(p[0] + 3, p[1]); ctx.moveTo(p[0], p[1] - 3); ctx.lineTo(p[0], p[1] + 3); ctx.stroke(); }
  }

  const labelFont = (big) => `${big ? 500 : 400} ${big ? (small ? 12 : 13.5) : (small ? 11 : 12)}px ${FONT}`;
  // Labels sit to the right of their cross; any that would collide are moved down, top to bottom, until clear.
  function placeLabels(items) {
    const placed = [];
    for (const it of [...items].sort((a, b) => a.y - b.y)) {
      ctx.font = labelFont(it.big); it.w = ctx.measureText(lower(it.n.title)).width;
      // a label that would run off the right edge sits to the left of its cross instead
      // in the reading view, the text's left edge is the limit (left: 44% in garden.css)
      const edge = reading() && !small ? W * 0.44 - 16 : W - 8;
      it.flip = it.x + 12 + it.w > edge && it.x - 12 - it.w > 8;
      const h = it.big ? 17 : 16, x0 = it.flip ? it.x - 12 - it.w : it.x + 12, x1 = x0 + it.w;
      let ly = it.y;
      for (let guard = 0; guard < items.length; guard++) {
        const hit = placed.find((b) => x0 < b[2] + 6 && b[0] < x1 + 6 && ly - h / 2 < b[3] && b[1] < ly + h / 2);
        if (!hit) break;
        ly = hit[3] + h / 2 + 1;
      }
      it.ly = ly;
      placed.push([x0, ly - h / 2, x1, ly + h / 2]);
    }
  }
  function cross(x, y, label, hot, big, ly = y, flip = false) {
    const arm = hot ? 8 : 6, th = pal();
    ctx.strokeStyle = th.red; ctx.lineWidth = 1.6;
    ctx.shadowColor = th.redGlow; ctx.shadowBlur = th.redBlur;
    ctx.beginPath(); ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y); ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm); ctx.stroke();
    if (!label) { ctx.shadowBlur = 0; return; }
    if (Math.abs(ly - y) > 1) {
      ctx.shadowBlur = 0; ctx.lineWidth = 0.8; ctx.strokeStyle = th.redLine;
      const s = flip ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(x + s * (arm + 1), y); ctx.lineTo(x + s * 9, ly); ctx.stroke();
    }
    ctx.font = labelFont(big); ctx.textAlign = flip ? "right" : "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = hot ? th.labelHot : th.label;
    ctx.shadowColor = th.labelHalo; ctx.shadowBlur = 8;
    const tx = flip ? x - 12 : x + 12;
    ctx.fillText(label, tx, ly); ctx.fillText(label, tx, ly);
    ctx.textAlign = "left";
    ctx.shadowBlur = 0;
    return ctx.measureText(label).width;
  }

  function draw(now) {
    view.step(now, reduce);
    const tg = layoutTarget(), k = lay.set ? 0.12 : 1;
    // a garden always turns; an open plant first settles at its best angle, then turns, holding still
    // while the pointer is on it, a creature is caught, or you are typing
    if (tg === fit && !drag && !fit.spin) {
      view.yaw += reduce ? fit.yaw - view.yaw : (fit.yaw - view.yaw) * 0.1;
      if (!reduce && Math.abs(fit.yaw - view.yaw) < 0.01) fit.spin = true;
    }
    if (!drag && !reduce && !caught && (!reading() ? !hover : tg === fit && fit.spin && !hover && !typing() && !view.dir)) view.yaw += 0.0012;
    lay.moving = Math.abs(tg.cx - lay.cx) > 2 || Math.abs(tg.S - lay.S) > 0.01 * tg.S; lay.cx += (tg.cx - lay.cx) * k; lay.cy += (tg.cy - lay.cy) * k; lay.S += (tg.S - lay.S) * k; lay.set = true;
    const project = projector(view, lay.cx, lay.cy, lay.S);
    const layers = view.layers(now), settled = !view.outer && !view.fade;

    const th = pal();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    for (const ly of layers) if (ly.alpha > 0.01) {
      floor(project, ly, (reading() && settled) || shown ? 0.45 : 1);
      for (const pl of scene(ly.node).plots) plot(project, ly, pl);
    }
    // fade the ground out before it reaches the text: below the plant on phones, beside it elsewhere
    if (reading()) {
      const cut = small ? H * 0.42 - 8 : W * 0.44 - 24, fade = small ? ctx.createLinearGradient(0, cut - 40, 0, cut) : ctx.createLinearGradient(cut - 60, 0, cut, 0);
      fade.addColorStop(0, th.bgFade0); fade.addColorStop(1, th.bg);
      ctx.fillStyle = fade;
      if (small) ctx.fillRect(0, cut - 40, W, H - cut + 40); else ctx.fillRect(cut - 60, 0, W - cut + 60, H);
    }

    wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    wctx.clearRect(0, 0, W, H);
    wctx.lineJoin = "round"; wctx.lineCap = "round";
    const groups = new Map(); // bounding boxes of each top-level concept, for labels and taps
    for (const ly of layers) {
      if (ly.alpha < 0.01) continue;
      for (const pl of scene(ly.node).plants) {
        const P = figure(pl.node), s = pl.s * ly.scale;
        const ox = pl.pos[0] * ly.scale + ly.off[0], oy = pl.pos[1] * ly.scale + ly.off[1], oz = pl.pos[2] * ly.scale + ly.off[2];
        const lit = settled && hover === pl.top && !pl.crosses;
        const base = pl.nested ? 0.8 : 1;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let k = 0; k < P.k; k++) for (let seg = 0; seg < 4; seg++) {
          const i0 = k * L + seg * (L / 4), i1 = Math.min(k * L + L - 1, i0 + L / 4);
          let zsum = 0; wctx.beginPath();
          for (let i = i0; i <= i1; i++) {
            project(P[i * 3] * s + ox, P[i * 3 + 1] * s + oy, P[i * 3 + 2] * s + oz, tmp);
            if (i === i0) wctx.moveTo(tmp[0], tmp[1]); else wctx.lineTo(tmp[0], tmp[1]);
            zsum += tmp[2];
            if (tmp[0] < x0) x0 = tmp[0]; if (tmp[0] > x1) x1 = tmp[0]; if (tmp[1] < y0) y0 = tmp[1]; if (tmp[1] > y1) y1 = tmp[1];
          }
          const z = (zsum / (i1 - i0 + 1) - oz) / Math.max(0.2, s);
          wctx.strokeStyle = `rgba(${th.wire},${ly.alpha * base * (lit ? th.wireLit : th.wireBase + th.wireDepth * Math.max(-1, Math.min(1, -z)))})`;
          wctx.lineWidth = lit ? 1.2 : pl.nested ? 0.75 : 0.9;
          wctx.stroke();
        }
        if (ly === layers[layers.length - 1] || layers.length === 1) {
          const g = groups.get(pl.top) || { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, pl: null, s, ox, oy, oz };
          g.x0 = Math.min(g.x0, x0); g.y0 = Math.min(g.y0, y0); g.x1 = Math.max(g.x1, x1); g.y1 = Math.max(g.y1, y1);
          if (!pl.nested && pl.node === pl.top) Object.assign(g, { pl, s, ox, oy, oz });
          groups.set(pl.top, g);
        }
      }
    }
    lastGroups = groups;
    drawFauna(now, layers[layers.length - 1], project, settled);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (dark) {
      ctx.globalCompositeOperation = "lighter";
      ctx.filter = `blur(${4 * DPR}px)`; ctx.globalAlpha = 0.85; ctx.drawImage(wire, 0, 0);
    } else {
      ctx.globalCompositeOperation = "multiply";
      ctx.filter = `blur(${3 * DPR}px)`; ctx.globalAlpha = 0.16; ctx.drawImage(wire, 0, 0);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none"; ctx.globalAlpha = 1; ctx.drawImage(wire, 0, 0);
    ctx.restore();

    // Red crosses: one per plant or plot in a garden; on a single plant, one per concept inside it.
    targets = [];
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const items = [];
    if (settled) for (const [top, g] of groups) {
      if (g.pl && g.pl.crosses) {
        const P = figure(top), A = anchors(top);
        for (const c of top.children) {
          const i = A.get(c.id), [x, y] = project(P[i * 3] * g.s + g.ox, P[i * 3 + 1] * g.s + g.oy, P[i * 3 + 2] * g.s + g.oz, [0, 0, 0]);
          items.push({ n: c, x, y, big: false, plant: g });
        }
      } else {
        // label each plant or mini garden once, above its highest point
        let x, y;
        if (g.pl) { const P = figure(top), i = P.top; [x, y] = project(P[i * 3] * g.s + g.ox, P[i * 3 + 1] * g.s + g.oy, P[i * 3 + 2] * g.s + g.oz, [0, 0, 0]); y = Math.min(y, g.y0) - 8; }
        else { x = (g.x0 + g.x1) / 2; y = g.y0 - 10; }
        items.push({ n: top, x, y, big: true, box: g });
      }
    }
    placeLabels(items);
    for (const it of items) {
      cross(it.x, it.y, lower(it.n.title), hover === it.n, it.big, it.ly, it.flip);
      targets.push({ n: it.n, x: it.x, y: it.y, r: small ? 30 : it.big ? 22 : 20, box: it.box, plant: it.plant, label: it.flip ? [it.x - 16 - it.w, it.ly - 12, it.x + 10, it.ly + 12] : [it.x - 10, it.ly - 12, it.x + 16 + it.w, it.ly + 12] });
    }
    raf = requestAnimationFrame(draw);
  }

  /* ---------------- fauna: small creatures carry each connection between related concepts ---------------- */
  // Each connection has its own creature, the same every time: a bird, butterfly, bee, moth, dragonfly or firefly.
  const KINDS = ["bird", "butterfly", "bee", "moth", "dragonfly", "firefly"];
  let fauna = [], faunaNode = null, nextSpawn = 0;

  // Where a concept is on screen in the settled garden: its plant's crown, its leaf on a plant, or its plot.
  function spot(id, ly, project) {
    const sc = scene(ly.node), W3 = (pl, i) => {
      const P = figure(pl.node), s = pl.s * ly.scale;
      return project(P[i * 3] * s + pl.pos[0] * ly.scale + ly.off[0], P[i * 3 + 1] * s + pl.pos[1] * ly.scale + ly.off[1], P[i * 3 + 2] * s + pl.pos[2] * ly.scale + ly.off[2], [0, 0, 0]);
    };
    for (let n = byId[id]; n && n !== ly.node; n = byId[n.parent]) {
      const own = sc.plants.find((pl) => pl.node === n);
      if (own) return W3(own, figure(n).top);
      const host = sc.plants.find((pl) => pl.node.id === n.parent);
      if (host) return W3(host, anchors(host.node).get(n.id));
      const plot = sc.plots.find((pt) => pt.node === n);
      if (plot) return project(plot.pos[0] * ly.scale + ly.off[0], (plot.pos[1] + 0.25) * ly.scale + ly.off[1], plot.pos[2] * ly.scale + ly.off[2], [0, 0, 0]);
    }
    return null;
  }

  function spawn(now, ly, project) {
    const n = view.node, pairs = [];
    if (reading()) {
      // from the plant's crown to the connection in the text, or back, by the connection's direction
      const g = [...lastGroups.values()][0];
      if (!g) return;
      n.links.forEach((l) => {
        const crown = () => { const P = figure(n), i = P.top; return project(P[i * 3] * g.s + g.ox, P[i * 3 + 1] * g.s + g.oy, P[i * 3 + 2] * g.s + g.oz, [0, 0, 0]); };
        const item = () => {
          const b = $("r-connections").querySelector(`[data-id="${l.id}"]`); if (!b) return null;
          const r = b.closest("li").getBoundingClientRect(), box = $("r-scroll").getBoundingClientRect(), y = r.top + r.height / 2;
          return r.width && y > box.top && y < box.bottom ? [r.left - 16, y] : null; // only while scrolled into view
        };
        pairs.push(l.dir === "out" ? [crown, item, l.type, n.id, l.id] : [item, crown, l.type, l.id, n.id]);
      });
    } else {
      const inside = new Set(subtree(n).map((m) => m.id));
      for (const a of inside) for (const l of byId[a].links) if (l.dir === "out" && inside.has(l.id)) {
        const A = () => spot(a, ly, project), B = () => spot(l.id, ly, project);
        const pa = A(), pb = B();
        if (pa && pb && Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > 40) pairs.push([A, B, l.type, a, l.id]);
      }
    }
    if (!pairs.length) return;
    const [from, to, type, a, b] = pairs[Math.floor(Math.random() * pairs.length)];
    fauna.push({ from, to, type, ends: [a, b], kind: KINDS[hash([a, b].sort().join("|")) % KINDS.length], t0: now, dur: 4200 + Math.random() * 2600, seed: Math.random() * 1000, side: Math.random() < 0.5 ? -1 : 1 });
  }

  let caught = null, lastFrame = 0;
  function drawFauna(now, ly, project, settled) {
    const dt = now - (lastFrame || now); lastFrame = now;
    if (reduce) return;
    if (faunaNode !== view.node || !settled) { if (faunaNode !== view.node) { fauna = []; release(); } faunaNode = view.node; nextSpawn = now + 4000; if (!settled) return; }
    if (caught) caught.t0 += dt; // a caught creature hangs where it is
    // one creature at a time, setting off every 8 to 12 s
    if (now > nextSpawn && !fauna.length) { spawn(now, ly, project); nextSpawn = now + 8000 + Math.random() * 4000; }
    fauna = fauna.filter((c) => now - c.t0 < c.dur);
    for (const c of fauna) {
      const A = c.from(), B = c.to();
      if (!A || !B) continue;
      const u = (now - c.t0) / c.dur;
      let e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
      if (c.kind === "dragonfly") { const k = Math.min(3, Math.floor(u * 4)), f = u * 4 - k; e = (k + (f < 0.45 ? 0 : 1 - Math.pow(1 - (f - 0.45) / 0.55, 3))) / 4; } // hovers, then darts
      const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
      const lift = Math.min(160, 0.35 * d), C = [(A[0] + B[0]) / 2 + nx * c.side * 0.2 * d, (A[1] + B[1]) / 2 - lift];
      const at = (t) => {
        const q = 1 - t; let x = q * q * A[0] + 2 * q * t * C[0] + t * t * B[0], y = q * q * A[1] + 2 * q * t * C[1] + t * t * B[1];
        const w = c.kind === "bee" ? 5 * Math.sin(t * 46 + c.seed) : c.kind === "butterfly" || c.kind === "moth" ? 9 * Math.sin(t * 15 + c.seed) : c.kind === "firefly" ? 14 * Math.sin(t * 7 + c.seed) : 0;
        return [x + nx * w, y + ny * w + (c.kind === "butterfly" ? 4 * Math.sin(t * 31 + c.seed) : c.kind === "firefly" ? 6 * Math.sin(t * 11 + c.seed) : 0)];
      };
      const env = c === caught ? 1 : Math.min(1, u / 0.12, (1 - u) / 0.12), thf = pal();
      // the connection it carries: a faint dotted wake behind it
      wctx.fillStyle = `rgba(${thf.wake},${thf.wakeK * env})`;
      for (let k = 0; k <= 40; k++) { const t = (k / 40) * e; const [x, y] = at(t); wctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); }
      const t = now / 1000 + c.seed, hover = c.kind === "dragonfly" ? 1.5 * Math.sin(t * 9) : 0;
      let [x, y] = at(e); y += hover;
      const [x2, y2] = at(Math.min(1, e + 0.01)), th = Math.atan2(y2 + hover - y, x2 - x);
      c.x = x; c.y = y;
      if (c === caught) $("bloom").style.transform = `translate(${x}px, ${y}px)`;
      wctx.save(); wctx.translate(x, y); wctx.rotate(th); wctx.scale(1.6, 1.6);
      wctx.strokeStyle = `rgba(${thf.fauna},${thf.faunaK * env})`; wctx.lineWidth = 0.7;
      wctx.beginPath();
      if (c.kind === "bird") {
        const f = Math.sin(t * 11), tip = 7 + 2 * f;
        for (const sd of [-1, 1]) { wctx.moveTo(2.5, 0); wctx.quadraticCurveTo(-0.5, sd * (3 - 2 * f), -3.5, sd * tip); }
      } else if (c.kind === "dragonfly") {
        // a long thin tail, and two pairs of narrow wings that blur as they beat
        wctx.moveTo(-9, 0); wctx.lineTo(2, 0);
        wctx.moveTo(3.6, 0); wctx.arc(2.8, 0, 0.8, 0, Math.PI * 2);
        const f = 0.55 + 0.45 * Math.abs(Math.sin(t * 70));
        for (const sd of [-1, 1]) for (const [bx, ang] of [[1.2, 0.4], [-0.4, -0.35]]) {
          const len = 4.6 * f, cx = bx + Math.sin(ang) * len, cy = sd * Math.cos(ang) * len, rot = -sd * ang;
          wctx.moveTo(cx + Math.cos(rot) * 1.0, cy + Math.sin(rot) * 1.0); wctx.ellipse(cx, cy, 1.0, len, rot, 0, Math.PI * 2);
        }
      } else if (c.kind === "firefly") {
        // a small body under a slow pulse of light
        const glow = (0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(t * 2.6)), 2)) * env, g = wctx.createRadialGradient(-1.5, 0, 0, -1.5, 0, 7);
        g.addColorStop(0, `rgba(${thf.firefly},${thf.fireflyK * glow})`); g.addColorStop(1, `rgba(${thf.firefly},0)`);
        wctx.fillStyle = g; wctx.fillRect(-9, -8, 15, 16);
        wctx.moveTo(2, 0); wctx.ellipse(0, 0, 2, 0.9, 0, 0, Math.PI * 2);
        const f = 0.4 + 0.6 * Math.abs(Math.sin(t * 40));
        for (const sd of [-1, 1]) { wctx.moveTo(0.5, sd * 0.6); wctx.lineTo(-1.5, sd * (0.6 + 2.6 * f)); }
      } else if (c.kind === "bee") {
        wctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        const f = 0.4 + 0.6 * Math.abs(Math.sin(t * 60));
        for (const sd of [-1, 1]) { wctx.moveTo(0.6 + 1.6, sd * 2.6 * f); wctx.ellipse(0.6, sd * 2.6 * f, 1.6, 1.6 * f + 0.2, 0, 0, Math.PI * 2); }
      } else {
        const f = 0.15 + 0.85 * Math.abs(Math.sin(t * (c.kind === "moth" ? 13 : 9))), big = c.kind === "moth" ? 0.8 : 1;
        wctx.moveTo(-3, 0); wctx.lineTo(3, 0);
        for (const sd of [-1, 1]) {
          wctx.moveTo(1.2 + 3.4 * big, sd * 3.4 * f * big); wctx.ellipse(1.2, sd * 3.4 * f * big, 3.4 * big, 3.4 * f * big + 0.2, 0, 0, Math.PI * 2);
          wctx.moveTo(-1.8 + 2.4 * big, sd * 2.4 * f * big); wctx.ellipse(-1.8, sd * 2.4 * f * big, 2.4 * big, 2.4 * f * big + 0.2, 0, 0, Math.PI * 2);
        }
      }
      wctx.stroke(); wctx.restore();
    }
  }

  // Catch a creature: it stops, and its connection opens into a ring of the concepts it joins.
  function catchCreature(c) {
    release(true);
    caught = c;
    const ids = [...new Set(c.ends)].filter((id) => byId[id] && id !== view.node.id), n = ids.length, r = small ? 58 : 74;
    const el = $("bloom");
    // side by side on wide screens; above and below on phones, where names would run off the edge
    el.innerHTML = `<div class="hush"></div><div class="ring"></div>` + ids.map((id, i) => {
      const a = (small ? -Math.PI / 2 : Math.PI) + (i / n) * Math.PI * 2, x = Math.cos(a) * r, y = Math.sin(a) * r, left = Math.cos(a) < -0.3, mid = Math.abs(Math.cos(a)) <= 0.3;
      return `<button type="button" class="opt${left ? " left" : ""}" data-id="${id}" style="--x:${x.toFixed(1)}px;--y:${y.toFixed(1)}px;--ax:${left ? "-100%" : mid ? "-50%" : "0%"};--d:${(0.08 * i).toFixed(2)}s">${esc(lower(byId[id].title))}</button>`;
    }).join("");
    el.style.transform = `translate(${c.x}px, ${c.y}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("open")));
  }
  function release(now) {
    if (!caught) return;
    caught = null;
    const el = $("bloom");
    el.classList.remove("open");
    clearTimeout(release.t);
    if (now) el.innerHTML = ""; else release.t = setTimeout(() => { if (!caught) el.innerHTML = ""; }, 600);
  }
  const creatureAt = (x, y) => fauna.find((c) => c.x != null && Math.hypot(c.x - x, c.y - y) < (small ? 26 : 20));
  on($("bloom"), "click", (e) => { if (e.target.closest("[data-id]")) release(); });
  // creatures fly over the text too: catch them there unless the click lands on something to use
  on($("reader"), "pointerdown", (e) => {
    if (e.target.closest("button, input, select")) return;
    const c = creatureAt(e.clientX, e.clientY);
    if (c) { e.preventDefault(); c === caught ? release() : catchCreature(c); } // takes the click before the text does
    else if (caught) release();
  });

  /* ---------------- input ---------------- */
  let hover = null, drag = null;
  const pick = (x, y) => {
    let best = null, bd = Infinity;
    for (const t of targets) { const d = Math.hypot(t.x - x, t.y - y); if (d < t.r && d < bd) { bd = d; best = t.n; } }
    if (best) return best;
    const inside = (b, pad) => b && x > b[0] - pad && x < b[2] + pad && y > b[1] - pad && y < b[3] + pad;
    for (const t of targets) if (inside(t.label, 2)) return t.n;
    for (const t of targets) if (t.box && inside([t.box.x0, t.box.y0, t.box.x1, t.box.y1], 8)) return t.n;
    // anywhere on a plant in the reading view: the leaf nearest the pointer
    for (const t of targets) if (t.plant && inside([t.plant.x0, t.plant.y0, t.plant.x1, t.plant.y1], 12)) {
      const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = t.n; }
    }
    return best;
  };
  on(cv, "pointerdown", (e) => { drag = { x: e.clientX, yaw: view.yaw, moved: 0 }; cv.setPointerCapture(e.pointerId); });
  on(cv, "pointermove", (e) => {
    if (drag) { const dx = e.clientX - drag.x; drag.moved = Math.max(drag.moved, Math.abs(dx)); view.yaw = drag.yaw + dx * 0.008; return; }
    hover = pick(e.clientX, e.clientY); keyPick = null; markSel(); dwell(hover); cv.style.cursor = hover || creatureAt(e.clientX, e.clientY) ? "pointer" : "grab";
  });
  on(cv, "pointerup", (e) => {
    const moved = drag?.moved ?? 0; drag = null;
    if (moved >= 5 && fit && fit.node === view.node) fit.spin = true; // keep the user's angle and turn on from there
    if (moved < 5) {
      const c = creatureAt(e.clientX, e.clientY);
      if (c) return c === caught ? release() : catchCreature(c);
      if (caught) return release(); // a click elsewhere lets it fly on
      const n = pick(e.clientX, e.clientY); if (n) go(n);
    }
  });

  on(window, "resize", resize);
  resize(); annotate();
  const start = byId[location.hash.slice(1)];
  if (start && start !== root) {
    const chain = []; for (let p = start; p && p !== root; p = byId[p.parent]) chain.unshift(p);
    chain.forEach((n, i) => setTimeout(() => go(n), 700 + i * 1300));
  }
  raf = requestAnimationFrame(draw);

  return () => {
    store.flush();
    controller.abort();
    cancelAnimationFrame(raf);
    for (const id of timers) clearTimeout(id);
  };
}
