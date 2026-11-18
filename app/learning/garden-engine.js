// Garden engine. Plants grow from what they hold: every concept inside a plant is one leaf,
// and when a branch is full the plant puts out a new one. A concept with nothing inside is a bud.
// A concept whose children have children of their own is shown as a GARDEN of these plants;
// any other concept is shown close up as a single plant, its leaves marked with red crosses.
// Diving magnifies the camera onto a plant (or a leaf), and the next scene grows from that spot.
export function createGarden(KG) {
  const L = 40;                 // points per strand
  const TAU = Math.PI * 2, GOLDEN = Math.PI * (3 - Math.sqrt(5)), FLOOR = -1.06;
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const norm = (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  /* ---------------- drawing primitives ---------------- */
  // A plant is a list of strands; each strand is L points sampled from a curve f(t), t in 0..1.
  function strand(S, f) { const s = []; for (let i = 0; i < L; i++) s.push(f(i / (L - 1))); S.push(s); return S.length - 1; }
  const quad = (a, b, c) => (t) => add(add(mul(a, (1 - t) * (1 - t)), mul(b, 2 * t * (1 - t))), mul(c, t * t));
  const line = (S, a, b) => strand(S, (t) => add(a, mul(add(b, mul(a, -1)), t)));
  const UP = [0, 1, 0];
  const flat = (a) => [Math.cos(a), 0, Math.sin(a)];
  const sideOf = (d) => { const c = cross3(d, UP); return Math.hypot(...c) < 1e-6 ? [1, 0, 0] : norm(c); };
  // closed loop in the plane spanned by u and v
  const loop = (S, c, u, v, ru, rv, wob = 0) => strand(S, (t) => { const a = t * TAU; const k = 1 + wob * Math.sin(a * 5); return add(c, add(mul(u, Math.cos(a) * ru * k), mul(v, Math.sin(a) * rv * k))); });
  // teardrop petal / leaf outline from base along dir; curl bends the tip along `bend`
  const petal = (S, base, dir, side, len, wid, bend = UP, curl = 0) => strand(S, (t) => {
    const th = t * TAU, s = (1 - Math.cos(th)) / 2;
    return add(add(add(base, mul(dir, len * s)), mul(side, wid * Math.sin(th) * (1 - s * 0.35))), mul(bend, curl * s * s));
  });
  // midrib with leaflets: a zigzag that swings side to side along a curve
  const zigzag = (S, f, side, w, teeth = 9) => strand(S, (t) => add(f(t), mul(side, w * Math.sin(t * Math.PI * 2 * teeth) * Math.sin(Math.PI * t))));
  const lerp = (a, b, t) => add(a, mul(add(b, mul(a, -1)), t));
  // a straight-edged path through vertices; every vertex lands exactly on a sample, so corners stay sharp
  function polyline(S, V) {
    const n = V.length - 1, len = [], at = [0];
    for (let k = 0; k < n; k++) len.push(Math.hypot(...add(V[k + 1], mul(V[k], -1))) + 1e-6);
    const tot = len.reduce((a, b) => a + b, 0);
    const c = len.map((l) => Math.max(1, Math.floor(((L - 1) * l) / tot)));
    for (let k = 0, d = L - 1 - c.reduce((a, b) => a + b, 0); d !== 0; k = (k + 1) % n) { if (d > 0) { c[k]++; d--; } else if (c[k] > 1) { c[k]--; d++; } }
    const pts = [];
    for (let k = 0; k < n; k++) { for (let i = 0; i < c[k]; i++) pts.push(lerp(V[k], V[k + 1], i / c[k])); at.push(pts.length); }
    pts.push(V[n]);
    S.push(pts);
    return { id: S.length - 1, at };
  }
  // where the j-th clump of a plant stands: a sunflower spiral, so clumps never pile onto one another
  const clump = (j, D) => (j ? mul(flat(j * GOLDEN), D * Math.sqrt(j)) : [0, 0, 0]);
  const chunks = (a, k) => { const o = []; for (let i = 0; i < a.length; i += k) o.push(a.slice(i, i + k)); return o; };

  /* ---------------- reusable organs (each returns its anchor: [strand, index]) ---------------- */
  function umbelHead(S, at, size) {
    let first = null;
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * TAU, out = mul(flat(a), size * 0.5);
      const id = strand(S, (t) => {
        if (t < 0.8) { const u = t / 0.8; return add(at, [out[0] * u, size * 0.2 * Math.sin(u * Math.PI * 0.6), out[2] * u]); }
        const u = (t - 0.8) / 0.2, f = size * 0.07 * u; return add(add(at, [out[0], size * 0.2 * Math.sin(Math.PI * 0.6), out[2]]), [Math.cos(u * TAU * 2) * f, 0, Math.sin(u * TAU * 2) * f]);
      });
      if (first == null) first = id;
    }
    return [first, L - 1];
  }
  function lensLeaf(S, at, dir, size) {
    const side = sideOf(dir);
    const mid = line(S, at, add(at, mul(dir, size)));
    petal(S, at, dir, side, size, size * 0.3, [0, -1, 0], size * 0.12);
    return [mid, Math.floor(L * 0.6)];
  }
  function frond(S, at, dir, len, droop = 0.5, curlTip = false) {
    const side = sideOf(dir);
    const f = (t) => {
      const p = add(add(at, mul(dir, len * t)), [0, len * (0.35 * t - droop * t * t), 0]);
      if (!curlTip || t < 0.82) return p;
      const u = (t - 0.82) / 0.18, r = len * 0.06;
      return add(p, add(mul(dir, -r * Math.sin(u * TAU)), [0, r * (1 - Math.cos(u * TAU)), 0]));
    };
    const mid = strand(S, f);
    zigzag(S, (t) => f(t * 0.88), side, len * 0.2, 17);
    zigzag(S, (t) => f(0.04 + t * 0.8), side, len * 0.13, 13);
    return [mid, Math.floor(L * 0.55)];
  }
  function lilyFlower(S, at, dir, size) {
    const d = norm(add(dir, [0, 0.6, 0])), u = sideOf(d), v = norm(cross3(u, d));
    let first = null;
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * TAU, out = norm(add(mul(d, 0.8), add(mul(u, Math.cos(a) * 0.6), mul(v, Math.sin(a) * 0.6))));
      const id = petal(S, at, out, sideOf(out), size, size * 0.22, norm(add(mul(out, 0.3), [0, -1, 0])), size * 0.35);
      if (first == null) first = id;
    }
    return [first, Math.floor(L / 2)];
  }
  function lotusFlower(S, at, size) {
    let first = null;
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * TAU + (j % 2) * 0.3, tilt = j % 2 ? 0.35 : 0.75;
      const out = norm(add(mul(flat(a), Math.sin(tilt)), [0, Math.cos(tilt), 0]));
      const id = petal(S, at, out, sideOf(out), size * (j % 2 ? 0.85 : 1), size * 0.3, mul(flat(a), 1), size * 0.12);
      if (first == null) first = id;
    }
    return [first, Math.floor(L / 2)];
  }
  function lotusPad(S, at, size, a) {
    // a round leaf with a notch, floating on the water
    strand(S, (t) => { const th = a + 0.25 + t * (TAU - 0.5); return add(at, [Math.cos(th) * size, 0, Math.sin(th) * size]); });
    strand(S, (t) => { const th = a + t * TAU * 3; const r = size * Math.abs(Math.sin(t * Math.PI * 6)) * 0.85; return add(at, [Math.cos(th) * r, 0, Math.sin(th) * r]); });
  }
  function foliagePad(S, at, size) {
    // a bonsai cloud: a domed spiral inside a soft rim
    const sp = strand(S, (t) => { const a = t * TAU * 4, r = size * t; return add(at, [Math.cos(a) * r, size * 0.35 * (1 - t * t), Math.sin(a) * r * 0.75]); });
    loop(S, at, [1, 0, 0], [0, 0, 1], size, size * 0.75, 0.06);
    return [sp, 0];
  }
  function fanLeaf(S, at, dir, size) {
    const side = sideOf(dir);
    const f = (t) => { const a = (t - 0.5) * 1.6; return add(at, add(mul(dir, size * Math.cos(a)), mul(side, size * Math.sin(a)))); };
    strand(S, (t) => (t < 0.15 ? add(at, mul(add(f(0), mul(at, -1)), t / 0.15)) : t > 0.85 ? add(at, mul(add(f(1), mul(at, -1)), (1 - t) / 0.15)) : f((t - 0.15) / 0.7)));
    const v = strand(S, (t) => add(at, mul(add(f(0.5), mul(at, -1)), t)));
    return [v, Math.floor(L * 0.7)];
  }
  function clock(S, at, size) {
    // dandelion seed head: two zigzags of rays through a sphere
    let first = null;
    for (const off of [0, 0.37]) {
      const id = strand(S, (t) => {
        const i = Math.min(19, Math.floor(t * 20)), y = 1 - (2 * (i + 0.5)) / 20, r = Math.sqrt(1 - y * y), th = i * GOLDEN + off;
        const out = (t * 20) % 1 < 0.5;
        return out ? add(at, [Math.cos(th) * r * size, y * size, Math.sin(th) * r * size]) : at;
      });
      if (first == null) first = id;
    }
    return [first, 0];
  }
  function sprout(S, h, r) {
    // a seedling: a short curved stem and two seed leaves
    const lean = (r() - 0.5) * 0.08, top = [lean, h, 0];
    strand(S, quad([0, 0, 0], [0, h * 0.6, 0], top));
    const a = r() * TAU;
    petal(S, top, norm([Math.cos(a), 0.5, Math.sin(a)]), sideOf(flat(a)), 0.09, 0.035);
    petal(S, top, norm([-Math.cos(a), 0.5, -Math.sin(a)]), sideOf(flat(a)), 0.09, 0.035);
  }

  /* ---------------- species ---------------- */
  // Each species grows one organ per concept (a leaf, flower, frond...) and a new branch,
  // stalk or trunk once the current one is full. CAP is how many organs one branch holds.
  // `A` records where each concept's organ is.
  const CAP = {
    hogweed: 5, lily: 5, bonsai: 5, palm: 6, ginkgo: 5, willow: 5, conifer: 5, fern: 6, dandelion: 5, saguaro: 4,
    helix: 5, orrery: 5, bamboo: 5, tulip: 5, mushroom: 6, wisteria: 5, succulent: 6, crystal: 6,
    poppy: 6, iris: 5, poplar: 5, chrysanthemum: 6,
  };
  const per = (kids, sp) => chunks(kids, CAP[sp]);
  // the i-th of n evenly spaced values from a to b (b alone when there is one)
  const along = (i, n, a, b) => (n === 1 ? b : a + ((b - a) * i) / (n - 1));
  // round a centre: the first concept in the middle, the rest evenly round it
  const ringAngle = (i, n, a0) => a0 + ((i - 1) / Math.max(1, n - 1)) * TAU;
  const SPECIES = {
    hogweed(S, kids, r, A) {
      per(kids, "hogweed").forEach((g, j, all) => {
        const base = clump(j, 0.42), h = 0.5 + 0.18 * all.length + 0.05 * g.length - 0.1 * (j % 3) + r() * 0.08, out = j * GOLDEN;
        const top = add(base, [(r() - 0.5) * 0.1, h, (r() - 0.5) * 0.1]);
        for (const o of [-1, 1]) strand(S, (t) => add(add(base, mul(add(top, mul(base, -1)), t)), [o * 0.01, 0, 0]));
        g.forEach((c, i) => {
          if (i === 0) return A.set(c.id, umbelHead(S, top, 0.3));
          const p = add(base, mul(add(top, mul(base, -1)), 0.8 - (i - 1) * 0.13)), a = out + (i % 2 ? 1.3 : -1.3) + (i - 1) * 0.45;
          const end = add(p, [Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2]);
          line(S, p, end); A.set(c.id, umbelHead(S, end, 0.2 - 0.015 * (i - 1)));
        });
      });
    },
    lily(S, kids, r, A) {
      per(kids, "lily").forEach((g, j) => {
        const a0 = j * GOLDEN, base = clump(j, 0.36), h = 0.7 + 0.1 * g.length - 0.1 * (j % 3) + r() * 0.1;
        const lean = mul(flat(a0 + 1), 0.12), stalk = quad(base, add(base, [0, h * 0.6, 0]), add(add(base, lean), [0, h, 0]));
        strand(S, stalk);
        for (const sg of [-1, 1]) petal(S, base, norm(add(flat(a0 + sg * 1.4), [0, 3, 0])), flat(a0), 0.4, 0.035, flat(a0 + sg * 1.4), 0.12);
        g.forEach((c, i) => {
          const p = stalk(along(i, g.length, Math.max(0.5, 1 - 0.13 * (g.length - 1)), 1)), a = a0 + i * 2.4, end = add(p, add(mul(flat(a), 0.14), [0, 0.05, 0]));
          line(S, p, end); A.set(c.id, lilyFlower(S, end, flat(a), 0.16 - 0.008 * i));
        });
      });
    },
    lotus(S, kids, r, A) {
      // each concept is a flower on its own pad, the pads spread over a pond on a sunflower spiral
      const D = 0.38, R = D * Math.sqrt(Math.max(0, kids.length - 1)) + 0.28;
      loop(S, [0, 0.003, 0], [1, 0, 0], [0, 0, 1], R, R, 0.02); // the pond's edge
      kids.forEach((c, k) => {
        const p = clump(k, D), a = k * GOLDEN + r();
        lotusPad(S, add(p, [0, 0.006, 0]), 0.11, a);
        const top = add(p, [0, 0.24 + 0.09 * (k % 3), 0]);
        const stem = strand(S, quad(p, add(p, [0.02, 0.12, 0]), top));
        lotusFlower(S, top, 0.12);
        A.set(c.id, [stem, L - 1]);
      });
    },
    bonsai(S, kids, r, A) {
      // a shallow pot
      loop(S, [0, 0.07, 0], [1, 0, 0], [0, 0, 1], 0.26, 0.15);
      loop(S, [0, 0.0, 0], [1, 0, 0], [0, 0, 1], 0.2, 0.11);
      const groups = per(kids, "bonsai"), h = 0.32 + 0.09 * groups.length;
      const trunk = (t) => [Math.sin(t * 3.6) * 0.09 * (1 - t * 0.3), 0.07 + h * t, Math.cos(t * 2.4) * 0.04];
      for (let k = 0; k < 3; k++) strand(S, (t) => { const a = k * 2.1 + t * 5; return add(trunk(t), [Math.cos(a) * 0.03 * (1 - t * 0.6), 0, Math.sin(a) * 0.03 * (1 - t * 0.6)]); });
      groups.forEach((g, j) => {
        const t0 = groups.length === 1 ? 0.85 : 0.45 + (0.5 * j) / (groups.length - 1), a = j * GOLDEN + 0.4, p = trunk(t0);
        const len = 0.22 + 0.06 * g.length, end = add(p, add(mul(flat(a), len), [0, -0.03, 0]));
        strand(S, quad(p, add(p, add(mul(flat(a), len * 0.5), [0, 0.05, 0])), end));
        g.forEach((c, i) => {
          // the first pad at the tip, the rest in pairs along the branch, one each side
          const k = i - 1, at = i === 0 ? add(end, [0, 0.03, 0]) : add(lerp(p, end, 0.64 - 0.24 * Math.floor(k / 2)), add(mul(flat(a + (k % 2 ? -1.4 : 1.4)), 0.1), [0, 0.04, 0]));
          A.set(c.id, foliagePad(S, at, 0.1 - 0.008 * Math.min(i, 3)));
        });
      });
    },
    palm(S, kids, r, A) {
      per(kids, "palm").forEach((g, j, all) => {
        const a = j * GOLDEN + 0.3, base = clump(j, 0.32), h = 0.8 + 0.12 * all.length - 0.14 * (j % 3) + r() * 0.1;
        const lean = mul(flat(a), 0.12 + 0.08 * j), trunk = quad(base, add(base, [0, h * 0.5, 0]), add(add(base, lean), [0, h, 0]));
        strand(S, trunk);
        strand(S, (t) => add(trunk(t), [0.018 + 0.008 * Math.abs(Math.sin(t * Math.PI * 9)), 0, 0])); // ringed bark
        const crown = trunk(1);
        g.forEach((c, i) => A.set(c.id, frond(S, crown, flat(a + (i / g.length) * TAU + 0.4), 0.42 - 0.05 * (i % 2), 0.75 + 0.15 * (i % 2))));
      });
    },
    ginkgo(S, kids, r, A) {
      const groups = per(kids, "ginkgo"), h = 0.5 + 0.13 * groups.length;
      const trunk = (t) => [Math.sin(t * 2) * 0.03, h * t, 0];
      for (const o of [-1, 1]) strand(S, (t) => add(trunk(t), [o * 0.018 * (1 - t * 0.7), 0, 0]));
      groups.forEach((g, j) => {
        const t0 = groups.length === 1 ? 0.8 : 0.4 + (0.55 * j) / (groups.length - 1), a = j * GOLDEN, p = trunk(t0);
        const end = add(p, add(mul(flat(a), 0.3 + 0.08 * g.length), [0, 0.2, 0])), bf = quad(p, add(p, add(mul(flat(a), 0.24), [0, 0.02, 0])), end);
        strand(S, bf);
        g.forEach((c, i) => {
          const at = bf(along(i, g.length, 0.3, 0.97)), d = norm(add(flat(a + (g.length === 1 ? 0 : i % 2 ? 0.9 : -0.9)), [0, 0.6, 0]));
          A.set(c.id, fanLeaf(S, at, d, 0.11));
        });
      });
    },
    willow(S, kids, r, A) {
      const groups = per(kids, "willow"), h = 0.55 + 0.12 * groups.length;
      const trunk = quad([0, 0, 0], [0.04, h * 0.5, 0], [-0.05, h, 0.02]);
      for (const o of [-1, 1]) strand(S, (t) => add(trunk(t), [o * 0.02 * (1 - t * 0.6), 0, 0]));
      groups.forEach((g, j) => {
        const a = j * GOLDEN + 1, p = trunk(groups.length === 1 ? 0.9 : 0.6 + (0.4 * j) / (groups.length - 1));
        const tip = add(p, add(mul(flat(a), 0.36 + 0.05 * g.length), [0, 0.1, 0]));
        const bf = quad(p, add(p, add(mul(flat(a), 0.18), [0, 0.22, 0])), tip);
        strand(S, bf);
        g.forEach((c, i) => {
          const at = bf(along(i, g.length, 0.3, 0.95)), hang = 0.3 + 0.06 * (i % 3) + r() * 0.15;
          let first = null;
          for (let k = 0; k < 3; k++) {
            const o = add(at, mul(flat(a + k * 0.5), 0.03));
            const id = strand(S, (t) => add(o, [Math.cos(a) * 0.05 * t, -hang * t * (0.8 + k * 0.1), Math.sin(a) * 0.05 * t]));
            if (first == null) first = id;
          }
          A.set(c.id, [first, Math.floor(L * 0.35)]);
        });
      });
    },
    conifer(S, kids, r, A) {
      const groups = per(kids, "conifer"), h = 0.55 + 0.22 * groups.length;
      line(S, [0, 0, 0], [0, h + 0.08, 0]);
      groups.forEach((g, j) => {
        const y = h * (0.25 + (0.7 * j) / Math.max(1, groups.length)), w = 0.36 * (1 - j / (groups.length + 0.6));
        g.forEach((c, i) => {
          const a = j * 0.9 + (i / g.length) * TAU, d = flat(a), p = [0, y, 0];
          const f = (t) => add(p, add(mul(d, w * t), [0, -0.12 * w * t * t, 0]));
          const mid = strand(S, f);
          zigzag(S, f, [0, 1, 0], 0.035, 12);
          A.set(c.id, [mid, L - 1]);
        });
      });
    },
    fern(S, kids, r, A) {
      per(kids, "fern").forEach((g, j) => {
        const base = clump(j, 0.3);
        g.forEach((c, i) => {
          const a = j * 1.3 + (i / Math.max(1, g.length)) * TAU, d = norm(add(flat(a), [0, 1.4, 0]));
          A.set(c.id, frond(S, base, d, 0.55 + r() * 0.15, 0.55, true));
        });
      });
    },
    dandelion(S, kids, r, A) {
      per(kids, "dandelion").forEach((g, j) => {
        const base = clump(j, 0.55);
        for (let k = 0; k < 3; k++) { const a = k * 2.1 + j; zigzag(S, (t) => add(base, add(mul(flat(a), 0.2 * t), [0, 0.01, 0])), flat(a + Math.PI / 2), 0.03, 4); }
        g.forEach((c, i) => {
          const a = ringAngle(i, g.length, j), top = add(base, add(mul(flat(a), i ? 0.24 : 0), [0, 0.48 + 0.13 * ((i + 1) % 3) + r() * 0.06, 0]));
          strand(S, quad(base, add(base, [0, 0.25, 0]), top));
          A.set(c.id, clock(S, top, 0.09));
        });
      });
    },
    saguaro(S, kids, r, A) {
      per(kids, "saguaro").forEach((g, j, all) => {
        const base = clump(j, 0.48), h = 0.5 + 0.1 * all.length + 0.06 * g.length - 0.08 * (j % 2);
        // ribbed trunk with a rounded crown
        for (let k = 0; k < 3; k++) { const a = k * 2.1; strand(S, (t) => { const y = h * t, cap = t > 0.85 ? Math.sqrt(Math.max(0, 1 - ((t - 0.85) / 0.15) ** 2)) : 1; return add(base, [Math.cos(a) * 0.06 * cap, y, Math.sin(a) * 0.06 * cap]); }); }
        g.forEach((c, i) => {
          const a = j + i * 2.3 + 0.5, y0 = h * (0.32 + 0.12 * i), p = add(base, [0, y0, 0]);
          const elbow = add(p, mul(flat(a), 0.16)), top = add(elbow, [0, 0.18 + 0.04 * i, 0]);
          strand(S, quad(p, add(p, mul(flat(a), 0.17)), elbow));
          strand(S, quad(elbow, add(elbow, [0, 0.12, 0]), top));
          const f = loop(S, add(top, [0, 0.02, 0]), [1, 0, 0], [0, 0, 1], 0.035, 0.035, 0.5);
          A.set(c.id, [f, 0]);
        });
      });
    },

    // ---- some botanical, some abstract ----
    helix(S, kids, r, A) {
      // a double-helix vine with rungs; each concept is a small orbiting ring off the helix
      per(kids, "helix").forEach((g, j, all) => {
        const base = mul(flat(j * 2.4 + 0.4), j ? 0.3 : 0), h = 0.55 + 0.08 * all.length + 0.1 * g.length, R = 0.075, ph = j * 1.3;
        const H = (o, t) => add(base, [Math.cos(t * TAU * 2.2 + o * Math.PI + ph) * R * (1 - 0.35 * t), h * t, Math.sin(t * TAU * 2.2 + o * Math.PI + ph) * R * (1 - 0.35 * t)]);
        for (const o of [0, 1]) strand(S, (t) => H(o, t));
        strand(S, (t) => { const k = Math.min(9, Math.floor(t * 10)), u = (t * 10) % 1, tk = ((k + 0.5) / 10) * 0.95; return lerp(H(0, tk), H(1, tk), u < 0.5 ? u * 2 : 2 - u * 2); });
        g.forEach((c, i) => {
          const tk = along(i, g.length, Math.max(0.26, 0.9 - 0.2 * (g.length - 1)), 0.9), p = H(i % 2, tk), a = Math.atan2(p[2] - base[2], p[0] - base[0]), out = flat(a);
          const at = add(add(p, mul(out, 0.13)), [0, 0.04, 0]), v = norm([0, 1, 0.5]);
          line(S, p, at);
          const ring = loop(S, at, out, v, 0.05, 0.05);
          loop(S, at, sideOf(out), v, 0.025, 0.025);
          A.set(c.id, [ring, 0]);
        });
      });
    },
    orrery(S, kids, r, A) {
      // an armillary: a spindle with tilted orbits; each concept is a planet riding one
      const groups = per(kids, "orrery"), h = 0.35 + 0.24 * groups.length;
      line(S, [0, 0, 0], [0, h + 0.06, 0]);
      loop(S, [0, h + 0.09, 0], [1, 0, 0], [0, 1, 0], 0.03, 0.03);
      loop(S, [0, 0.004, 0], [1, 0, 0], [0, 0, 1], 0.12, 0.12);
      groups.forEach((g, j) => {
        const y = 0.3 + 0.24 * j, rad = 0.34 - 0.05 * j, u = flat(j * 1.1), v = norm(add(flat(j * 1.1 + Math.PI / 2), [0, j % 2 ? -0.22 : 0.22, 0])), c = [0, y, 0];
        loop(S, c, u, v, rad, rad);
        g.forEach((k, i) => {
          const ph = (i / g.length) * TAU + j * 0.7, pos = add(c, add(mul(u, Math.cos(ph) * rad), mul(v, Math.sin(ph) * rad))), sz = 0.04 - 0.004 * i;
          const body = loop(S, pos, [1, 0, 0], [0, 1, 0], sz, sz);
          loop(S, pos, [0, 0, 1], [0, 1, 0], sz, sz);
          if (i === 0) loop(S, pos, [1, 0, 0], norm([0, 0.3, 1]), sz * 1.9, sz * 1.9); // a ringed one
          A.set(k.id, [body, 0]);
        });
      });
    },
    bamboo(S, kids, r, A) {
      // jointed culms; each concept is a spray of lance leaves from a node
      per(kids, "bamboo").forEach((g, j, all) => {
        const base = clump(j, 0.22), h = 0.8 + 0.1 * all.length + r() * 0.12, lean = 0.06 + 0.04 * j, a0 = j * GOLDEN;
        const culm = (t) => add(base, add(mul(flat(a0), lean * t * t), [0, h * t, 0]));
        for (const o of [-1, 1]) strand(S, (t) => add(culm(t), mul(sideOf(flat(a0)), o * 0.012)));
        strand(S, (t) => { const k = Math.min(4, Math.floor(t * 5)), u = (t * 5) % 1; return add(culm((k + 1) / 6), [Math.cos(u * TAU) * 0.022, 0, Math.sin(u * TAU) * 0.022]); }); // the joints
        g.forEach((c, i) => {
          const at = culm((5 - i) / 6), a = a0 + 1 + i * 2.2;
          const id = petal(S, at, norm(add(flat(a - 0.35), [0, 0.15, 0])), sideOf(flat(a - 0.35)), 0.24, 0.022, [0, -1, 0], 0.07);
          petal(S, at, norm(add(flat(a + 0.35), [0, 0.3, 0])), sideOf(flat(a + 0.35)), 0.2, 0.02, [0, -1, 0], 0.05);
          A.set(c.id, [id, Math.floor(L / 2)]);
        });
      });
    },
    tulip(S, kids, r, A) {
      // each concept is a cupped flower on its own stem; every bunch shares a pair of blades
      per(kids, "tulip").forEach((g, j) => {
        const base = clump(j, 0.55), a0 = j * GOLDEN;
        for (const sg of [-1, 1]) petal(S, base, norm(add(flat(a0 + sg * 1.2), [0, 2.4, 0])), flat(a0), 0.36, 0.05, flat(a0 + sg * 1.2), 0.1);
        g.forEach((c, i) => {
          const a = ringAngle(i, g.length, a0), top = add(base, add(mul(flat(a), i ? 0.22 : 0.02), [0, 0.48 + 0.13 * ((i + 1) % 3) + r() * 0.05, 0]));
          strand(S, quad(base, add(base, [0, 0.3, 0]), top));
          let first = null;
          for (let k = 0; k < 6; k++) {
            const b = a + (k / 3) * Math.PI + (k > 2 ? Math.PI / 3 : 0), d = norm(add(flat(b), [0, k > 2 ? 4 : 3, 0]));
            const id = petal(S, top, d, sideOf(flat(b)), 0.15, k > 2 ? 0.05 : 0.06, flat(b), -0.02);
            if (first == null) first = id;
          }
          A.set(c.id, [first, Math.floor(L / 2)]);
        });
      });
    },
    mushroom(S, kids, r, A) {
      // a fairy ring of fungi: stem, domed cap and radiating gills; each concept is one mushroom
      per(kids, "mushroom").forEach((g, j) => {
        const cc = clump(j, 0.75);
        g.forEach((c, i) => {
          const a = ringAngle(i, g.length, j), p = add(cc, mul(flat(a), i ? 0.26 : 0)), h = (i ? 0.25 - 0.05 * (i % 2) : 0.32) + r() * 0.05, R = i ? 0.1 - 0.015 * (i % 2) : 0.13;
          const top = add(p, [Math.cos(a) * 0.02, h, Math.sin(a) * 0.02]);
          for (const o of [-1, 1]) strand(S, (t) => add(quad(p, add(p, [0, h * 0.5, 0]), top)(t), mul(sideOf(flat(a)), o * 0.012 * (1 + 0.6 * (1 - t)))));
          const cap = strand(S, (t) => { const ph = t * Math.PI * 0.5, th = t * TAU * 5; return add(top, [Math.cos(th) * Math.sin(ph) * R, Math.cos(ph) * R * 0.55 - 0.01, Math.sin(th) * Math.sin(ph) * R]); });
          loop(S, add(top, [0, -0.012, 0]), [1, 0, 0], [0, 0, 1], R, R, 0.04);
          strand(S, (t) => { const k = Math.min(11, Math.floor(t * 12)), u = (t * 12) % 1, w = u < 0.5 ? u * 2 : 2 - u * 2; return add(top, add(mul(flat((k / 12) * TAU), R * (0.15 + 0.82 * w)), [0, -0.016, 0])); });
          A.set(c.id, [cap, 0]);
        });
      });
    },
    wisteria(S, kids, r, A) {
      // a twisted trunk with arching limbs; each concept is a hanging raceme spiralling to a point
      const groups = per(kids, "wisteria"), h = 0.62 + 0.08 * groups.length;
      for (let k = 0; k < 2; k++) strand(S, (t) => [Math.cos(t * 7 + k * Math.PI) * 0.025 + 0.03 * Math.sin(t * 3), h * t, Math.sin(t * 7 + k * Math.PI) * 0.025]);
      groups.forEach((g, j) => {
        const a = j * GOLDEN + 0.5, p = [0.03 * Math.sin(3), h, 0], tip = add(p, add(mul(flat(a), 0.4 + 0.05 * g.length), [0, -0.05, 0]));
        const limb = quad(p, add(p, add(mul(flat(a), 0.2), [0, 0.16, 0])), tip);
        strand(S, limb);
        g.forEach((c, i) => {
          const at = limb(along(i, g.length, 0.25, 0.97)), len = 0.24 + 0.06 * (i % 3) + r() * 0.06;
          const id = strand(S, (t) => add(at, [Math.cos(t * TAU * 5 + i) * 0.05 * (1 - t) + 0.02 * t, -len * t, Math.sin(t * TAU * 5 + i) * 0.05 * (1 - t)]));
          A.set(c.id, [id, Math.floor(L * 0.25)]);
        });
      });
    },
    succulent(S, kids, r, A) {
      // echeveria: fleshy spoon leaves on the golden angle round a tight bud; a full rosette starts an offset
      per(kids, "succulent").forEach((g, j) => {
        const cc = add(clump(j, 0.5), [0, 0.03, 0]), k0 = j ? 0.8 : 1;
        for (let b = 0; b < 7; b++) { const a = b * GOLDEN + j, d = norm(add(flat(a), [0, b < 3 ? 2.8 : 1.4, 0])); petal(S, cc, d, sideOf(flat(a)), (b < 3 ? 0.08 : 0.13) * k0, (b < 3 ? 0.035 : 0.055) * k0, UP, 0.02 * k0); } // the cupped heart
        g.forEach((c, i) => {
          const a = j + 0.5 + i * GOLDEN, el = Math.max(0.12, 0.42 - 0.06 * i), d = norm(add(mul(flat(a), Math.cos(el)), [0, Math.sin(el), 0])), sd = sideOf(flat(a));
          const len = (0.32 - 0.02 * i) * k0, id = petal(S, cc, d, sd, len, 0.13 * k0, UP, 0.07 * k0);
          petal(S, add(cc, [0, 0.012, 0]), d, sd, len * 0.8, 0.085 * k0, UP, 0.06 * k0); // the leaf's thickness
          A.set(c.id, [id, Math.floor(L / 2)]);
        });
      });
    },
    crystal(S, kids, r, A) {
      // quartz: hexagonal prisms with pointed terminations; each concept is one shard
      per(kids, "crystal").forEach((g, j) => {
        const cc = clump(j, 0.36);
        loop(S, add(cc, [0, 0.004, 0]), [1, 0, 0], [0, 0, 1], 0.14, 0.11, 0.12);
        g.forEach((c, i) => {
          const a = j * 1.7 + i * GOLDEN, tilt = i === 0 ? 0.12 : 0.38 + 0.07 * i, d = norm(add(mul(flat(a), Math.sin(tilt)), [0, Math.cos(tilt), 0]));
          const u = sideOf(d), v = norm(cross3(d, u)), w = 0.045 - 0.005 * i, len = 0.36 - 0.04 * i + r() * 0.05, base = add(cc, mul(flat(a), 0.03 * Math.min(i, 3)));
          const ring = (h) => Array.from({ length: 6 }, (_, k) => add(add(base, mul(d, h)), add(mul(u, Math.cos((k / 6) * TAU) * w), mul(v, Math.sin((k / 6) * TAU) * w))));
          const b = ring(0), t = ring(len), ap = add(base, mul(d, len + w * 2.2));
          polyline(S, [...b, b[0], t[0], ...t.slice(1), t[0]]);
          const e = polyline(S, [b[1], t[1], ap, t[2], b[2], b[3], t[3], ap, t[4], b[4], b[5], t[5], ap, t[0]]);
          A.set(c.id, [e.id, e.at[2]]);
        });
      });
    },

    // ---- five after Monet's garden at Giverny ----
    nymphaea(S, kids, r, A) {
      // the water lily pond: a notched pad flat on the water for each concept, a low open flower on it
      const D = 0.3, R = D * Math.sqrt(Math.max(0, kids.length - 1)) + 0.26;
      loop(S, [0, 0.003, 0], [1, 0, 0], [0, 0, 1], R, R * 0.85, 0.03); // the pond's edge
      kids.forEach((c, k) => {
        const p = clump(k, D), at = [p[0], 0.006, p[2] * 0.85], a = k * GOLDEN + r(), s = 0.11;
        strand(S, (t) => { const th = a + 0.3 + t * (TAU - 0.6); return add(at, [Math.cos(th) * s, 0, Math.sin(th) * s]); });
        let first = null;
        for (let m = 0; m < 6; m++) {
          const out = norm(add(flat(a + (m / 6) * TAU), [0, 0.5, 0]));
          const id = petal(S, add(at, [0, 0.006, 0]), out, sideOf(out), 0.06, 0.022, UP, 0.006);
          if (first == null) first = id;
        }
        A.set(c.id, [first, 0]);
      });
    },
    poppy(S, kids, r, A) {
      // a poppy field: thin wavering stems, four broad cupped petals round a crown; a full patch seeds another
      per(kids, "poppy").forEach((g, j) => {
        const cc = clump(j, 0.6);
        for (let k = 0; k < 5; k++) { const a = k * 1.7 + j, b = add(cc, mul(flat(a), 0.06)); strand(S, quad(b, add(b, [0, 0.12, 0]), add(b, add(mul(flat(a), 0.14), [0, 0.2 + 0.06 * (k % 2), 0])))); } // grass
        g.forEach((c, i) => {
          const a = j * 1.3 + i * GOLDEN, p = add(cc, mul(flat(a), i ? 0.06 + 0.04 * Math.sqrt(i) : 0));
          const h = 0.42 + 0.12 * ((i * 2) % 3) + r() * 0.08, top = add(p, add(mul(flat(a), i ? 0.1 + 0.03 * Math.sqrt(i) : 0.02), [0, h, 0]));
          const sway = flat(a + 1.2), stem = quad(p, add(p, [0, h * 0.55, 0]), top);
          strand(S, (t) => add(stem(t), mul(sway, 0.012 * Math.sin(t * TAU * 1.5))));
          const face = norm(add(flat(a), [0, 2.4, 0]));
          for (let k = 0; k < 4; k++) {
            const b = a + (k / 4) * TAU + (k % 2) * 0.25, out = norm(add(flat(b), [0, 0.55, 0]));
            petal(S, top, out, sideOf(out), 0.09 - 0.01 * (k % 2), 0.07, face, 0.045);
          }
          A.set(c.id, [loop(S, add(top, [0, 0.012, 0]), [1, 0, 0], [0, 0, 1], 0.014, 0.014, 0.4), 0]);
        });
      });
    },
    iris(S, kids, r, A) {
      // a fan of sword leaves; each concept is a flower on its own stem, three falls drooping and three standards rising
      per(kids, "iris").forEach((g, j) => {
        const base = clump(j, 0.5), a0 = j * GOLDEN, q = flat(a0);
        for (let k = 0; k < 6; k++) {
          const s = (k - 2.5) * 0.22, d = norm(add(mul(q, s), [0, 1, 0]));
          petal(S, add(base, mul(q, s * 0.05)), d, q, 0.5 - 0.06 * Math.abs(k - 2.5), 0.028, q, s * 0.12);
        }
        g.forEach((c, i) => {
          const a = a0 + Math.PI / 2 + i * GOLDEN, top = add(base, add(mul(flat(a), i ? 0.15 + 0.03 * i : 0.03), [0, 0.62 + 0.12 * ((i + 1) % 3) + r() * 0.05, 0]));
          strand(S, quad(base, add(base, [0, 0.35, 0]), top));
          let first = null;
          for (let k = 0; k < 3; k++) {
            const b = a + (k / 3) * TAU, up = norm(add(flat(b), [0, 2.6, 0])), down = norm(add(flat(b + Math.PI / 3), [0, -0.3, 0]));
            const id = petal(S, top, up, sideOf(flat(b)), 0.1, 0.035, flat(b + Math.PI), 0.025);
            petal(S, top, down, sideOf(flat(b + Math.PI / 3)), 0.12, 0.045, [0, -1, 0], 0.05);
            if (first == null) first = id;
          }
          A.set(c.id, [first, Math.floor(L / 2)]);
        });
      });
    },
    poplar(S, kids, r, A) {
      // poplars along the Epte: tall thin trunks in a row on the bank, foliage held in a narrow column of tufts
      const groups = per(kids, "poplar"), n = groups.length, gap = 0.28, row = flat(0.3), across = flat(0.3 + Math.PI / 2);
      for (const o of [0.14, 0.3]) strand(S, (t) => add(mul(row, (t - 0.5) * (n * gap + 0.7)), add(mul(across, o + 0.03 * Math.sin(t * TAU * 1.3 + o * 9)), [0, 0.002, 0]))); // the river
      groups.forEach((g, j) => {
        const base = add(mul(row, (j - (n - 1) / 2) * gap), mul(across, -0.03 * (j % 2))), h = 0.95 + 0.11 * g.length + 0.08 * Math.sin(j * 2.1) + r() * 0.06;
        const trunk = quad(base, add(base, [0, h * 0.5, 0]), add(add(base, mul(across, 0.03)), [0, h, 0]));
        strand(S, trunk);
        strand(S, (t) => add(trunk(t), mul(row, 0.012 * (1 - t))));
        g.forEach((c, i) => {
          const t0 = along(i, g.length, 0.42, 0.9), at = trunk(t0), w = 0.085 * (1 - 0.4 * t0), tall = 0.6 * (h * 0.48) / Math.max(1, g.length - 1) + 0.04;
          loop(S, at, row, UP, w, Math.min(0.1, tall), 0.15);
          loop(S, at, across, UP, w * 0.85, Math.min(0.1, tall) * 0.9, 0.2);
          A.set(c.id, [line(S, add(at, [0, -0.03, 0]), add(at, [0, 0.03, 0])), Math.floor(L / 2)]);
        });
        line(S, trunk(0.92), add(trunk(1), [0, 0.06, 0]));
      });
    },
    chrysanthemum(S, kids, r, A) {
      // Monet's chrysanthemums: a mound of lobed leaves, each concept a full bloom of fine incurving petals
      per(kids, "chrysanthemum").forEach((g, j) => {
        const cc = clump(j, 0.65);
        for (let k = 0; k < 6; k++) { const a = k * 1.05 + j, d = norm(add(flat(a), [0, 0.9, 0])); zigzag(S, (t) => add(cc, mul(d, 0.3 * t)), sideOf(flat(a)), 0.04, 5); }
        g.forEach((c, i) => {
          const a = j + i * GOLDEN, rad = i ? 0.12 + 0.05 * Math.sqrt(i) : 0, top = add(cc, add(mul(flat(a), rad), [0, 0.46 - 1.4 * rad * rad + r() * 0.04, 0])), sz = 0.07;
          strand(S, quad(add(cc, mul(flat(a), rad * 0.3)), add(cc, add(mul(flat(a), rad * 0.5), [0, 0.25, 0])), top));
          const ball = strand(S, (t) => {
            const m = Math.min(23, Math.floor(t * 24)), u = (t * 24) % 1, y = 1 - (m + 0.5) / 24, rr = Math.sqrt(1 - y * y), th = m * GOLDEN + a;
            const w = u < 0.5 ? u * 2 : 2 - u * 2, dir = [Math.cos(th) * rr, y * 0.8 + 0.1, Math.sin(th) * rr];
            return add(top, add(mul(dir, sz * w), [0, sz * 0.25 * w * w, 0]));
          });
          strand(S, (t) => {
            const m = Math.min(17, Math.floor(t * 18)), u = (t * 18) % 1, w = u < 0.5 ? u * 2 : 2 - u * 2, th = (m / 18) * TAU + a;
            return add(top, add(mul(flat(th), sz * 1.35 * w), [0, -0.03 * w * w, 0]));
          });
          A.set(c.id, [ball, 0]);
        });
      });
    },
  };
  const SPECIES_ORDER = Object.keys(SPECIES);

  /** Species for a concept: siblings take different species, and it never changes with the view. */
  function speciesOf(node) {
    if (node.species && SPECIES[node.species]) return node.species;
    if (!node.parent) return "lotus";
    const sibs = KG.byId[node.parent].children, i = sibs.indexOf(node);
    return SPECIES_ORDER[(hash(node.parent) + i) % SPECIES_ORDER.length];
  }

  /** Strands for a concept: one organ per concept inside it. Base at y = 0. */
  function grow(node) {
    const S = [], r = rng(hash(node.id + "grow")), A = new Map();
    if (!node.children.length) sprout(S, 0.2 + r() * 0.06, r);
    else SPECIES[speciesOf(node)](S, node.children, r, A);
    return { S, anchorsOut: A };
  }

  const cache = new Map();
  /** Float32Array of k*L*3 points, with .k (strand count), .h (height), .w (widest reach from the base), .top (index of the highest point). */
  function figure(node) {
    if (cache.has(node.id)) return cache.get(node.id);
    const { S, anchorsOut } = grow(node);
    const a = new Float32Array(S.length * L * 3);
    let h = 0, top = 0, w = 0;
    S.forEach((s, k) => s.forEach((p, i) => { const j = (k * L + i) * 3; a[j] = p[0]; a[j + 1] = p[1]; a[j + 2] = p[2]; if (p[1] > h) { h = p[1]; top = k * L + i; } w = Math.max(w, Math.hypot(p[0], p[2])); }));
    a.k = S.length; a.h = h; a.top = top; a.w = w;
    a.anchors = new Map([...anchorsOut].map(([id, [k, i]]) => [id, k * L + i]));
    cache.set(node.id, a);
    return a;
  }
  const anchors = (node) => figure(node).anchors;

  /* ---------------- scenes ---------------- */
  const isGarden = (n) => n.children.some((c) => c.children.length);
    const closeUpScale = (n) => Math.max(1.1, Math.min(3.6, 1.9 / figure(n).h));

  /** A scene: plants {node, pos (base), s, top (the child of `node` it belongs to), nested}
      and plots {pos, r, node} for every garden drawn inside it. Nested gardens are drawn whole,
      only smaller: nothing that exists is left out. */
  const PLOT_K = 0.3, sceneCache = new Map();
  const nestedT = (P0, k) => (q) => add(P0, mul(add(q, [0, -FLOOR, 0]), k));
  function scene(node) {
    if (sceneCache.has(node.id)) return sceneCache.get(node.id);
    let out;
    if (!isGarden(node)) out = { plants: [{ node, pos: [0, FLOOR, 0], s: closeUpScale(node), crosses: true, top: node, nested: false }], plots: [] };
    else {
      const kids = node.children, n = kids.length, r = rng(hash(node.id + "garden"));
      // plants of one garden huddle together; mini gardens sit further apart so each reads as its own bed
      const nests = kids.some(isGarden), a0 = r() * TAU;
      const R = n === 1 ? 0 : nests ? Math.min(1.15, 0.9 + 0.05 * n) : Math.min(0.95, 0.6 + 0.06 * n);
      const loose = kids.filter((c) => !isGarden(c));
      let gs = loose.length ? Math.max(0.9, Math.min(2.6, 1.4 / Math.max(...loose.map((c) => figure(c).h)))) : 1;
      // beside mini gardens, single plants are drawn smaller so neither dwarfs the other
      if (kids.some(isGarden)) gs = Math.min(gs, 0.7);
      // neighbours round the ring must not overlap: widen the ring to fit the widest pair side by side
      const reach = kids.map((c) => (isGarden(c) ? 1.45 * PLOT_K : figure(c).w * gs));
      let Rfit = R;
      if (n > 1) for (let i = 0; i < n; i++) Rfit = Math.max(Rfit, (reach[i] + reach[(i + 1) % n] + 0.12) / (2 * Math.sin(Math.PI / n)) / 0.92);
      out = { plants: [], plots: [] };
      kids.forEach((c, i) => {
        const a = a0 + (i / n) * TAU + (r() - 0.5) * 0.15, d = Rfit * (0.92 + r() * 0.12);
        const P0 = [Math.cos(a) * d, FLOOR, Math.sin(a) * d];
        if (isGarden(c)) {
          const T = nestedT(P0, PLOT_K), sub = scene(c);
          for (const p of sub.plants) out.plants.push({ node: p.node, pos: T(p.pos), s: p.s * PLOT_K, crosses: false, top: c, nested: true });
          for (const pl of sub.plots) out.plots.push({ pos: T(pl.pos), r: pl.r * PLOT_K, node: pl.node, top: c, nested: true });
          out.plots.push({ pos: P0, r: 1.45 * PLOT_K, node: c, top: c, nested: false });
        } else out.plants.push({ node: c, pos: P0, s: gs, crosses: false, top: c, nested: false });
      });
    }
    sceneCache.set(node.id, out);
    return out;
  }

  /* ---------------- camera with fractal dives ---------------- */
  function createView(opts = {}) {
    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    return {
      node: null, outer: null, inner: null, c: [0, 0, 0], s: 1, u: 0, dir: 0, t0: 0, fade: 0,
      dur: opts.dur || 1000, yaw: 0.7, pitch: opts.pitch ?? 0.56,
      set(n) { this.node = n; this.outer = this.inner = null; this.dir = 0; },
      /** The child's scene sits inside the parent's as q -> c + q * s. */
      locate(parent, child) {
        const F = [0, FLOOR, 0], sc = scene(parent);
        // a garden drawn as a plot: its own scene is exactly that plot, enlarged
        const plot = sc.plots.find((p) => p.node === child && !p.nested);
        if (plot) return { c: add(plot.pos, mul(F, -PLOT_K)), s: PLOT_K };
        const pl = sc.plants.find((p) => p.node === child && !p.nested);
        if (pl && !pl.crosses) { const s = pl.s / closeUpScale(child); return { c: add(pl.pos, mul(F, -s)), s }; }
        // a leaf on a single plant: the concept's own seedling grows out of the leaf
        const host = sc.plants[0], f = figure(host.node), i = anchors(host.node).get(child.id);
        const w = i == null ? host.pos : add(host.pos, mul([f[i * 3], f[i * 3 + 1], f[i * 3 + 2]], host.s));
        const s = 0.1;
        return { c: add(w, mul(F, -s)), s };
      },
      dive(child) { const p = this.locate(this.node, child); Object.assign(this, { c: p.c, s: p.s, outer: this.node, inner: child, node: child, dir: 1, u: 0, t0: performance.now() }); },
      rise(parent) { const p = this.locate(parent, this.node); Object.assign(this, { c: p.c, s: p.s, outer: parent, inner: this.node, node: parent, dir: -1, u: 1, t0: performance.now() }); },
      jump(n) { Object.assign(this, { node: n, outer: null, inner: null, dir: 0, fade: performance.now() }); },
      step(now, reduce) {
        if (!this.dir) return;
        const p = Math.min(1, (now - this.t0) / (reduce ? 1 : this.dur)), e = ease(p);
        this.u = this.dir > 0 ? e : 1 - e;
        if (p >= 1) { this.dir = 0; this.outer = this.inner = null; }
      },
      layers(now) {
        if (!this.outer) {
          let sc = 1, a = 1;
          if (this.fade) { const p = Math.min(1, (now - this.fade) / 600); sc = 0.7 + 0.3 * (1 - Math.pow(1 - p, 3)); a = p; if (p >= 1) this.fade = 0; }
          return [{ node: this.node, scale: sc, off: [0, 0, 0], alpha: a }];
        }
        // camera glides to c while magnifying by 1/s; the inner scene lives at c, shrunk by s
        const u = this.u, z = Math.exp(u * Math.log(1 / this.s)), c = this.c;
        return [
          { node: this.outer, scale: z, off: c.map((v) => -u * v * z), alpha: 1 - smooth(0.45, 0.92, u) },
          { node: this.inner, scale: z * this.s, off: c.map((v) => v * (1 - u) * z), alpha: smooth(0.08, 0.6, u) },
        ];
      },
    };
  }

  function projector(view, cx, cy, S) {
    const cyw = Math.cos(view.yaw), syw = Math.sin(view.yaw), cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
    return (x, y, z, out) => {
      const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
      out[0] = cx + x1 * S; out[1] = cy - (y * cp - z1 * sp) * S; out[2] = y * sp + z1 * cp; return out;
    };
  }

  /** Drop cached shapes and scenes after the knowledge changes (a concept added). */
  const forget = () => { cache.clear(); sceneCache.clear(); };

  return { SPECIES_ORDER, forget, L, FLOOR, figure, anchors, scene, isGarden, createView, projector, hash };
}
