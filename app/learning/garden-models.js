export function botanicalModels({ strand, petal, loop, quad, flat, add, mul, norm, sideOf, TAU, L }) {
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const UP = [0, 1, 0], X = [1, 0, 0], Z = [0, 0, 1];
  const middle = Math.floor(L / 2);
  const tip = L - 1;
  const stalk = (base, angle, reach, height) => (t) => add(base, [Math.cos(angle) * reach * t * t, height * t, Math.sin(angle) * reach * t * t]);
  const anchors = (children, set, id, point, index) => { if (children[index]) set.set(children[index].id, [id, point]); };
  const groves = (children, size, grow) => {
    for (let start = 0; start < children.length; start += size) {
      const i = start / size;
      grow(children.slice(start, start + size), mul(flat(i * GOLDEN), 0.52 * Math.sqrt(i)), i * GOLDEN);
    }
  };

  return {
    // The Mac garden's three original silhouettes.
    wireFern(S, kids, rng, A) {
      groves(kids, 7, (group, base, turn) => {
        for (const side of [-1, 0, 1]) strand(S, (t) => add(base, [0.035 * Math.sin(t * 4) + side * 0.012, t, side * 0.016]));
        for (let i = 0; i < Math.max(3, group.length); i++) {
          const layer = i / Math.max(2, group.length - 1), a = turn + i * GOLDEN + 0.7, length = 0.54 - layer * 0.19;
          const branch = (t, side = 0, lift = 0) => add(base, [
            Math.cos(a) * length * t - Math.sin(a) * side,
            0.18 + layer * 0.67 + length * (0.94 * t - 0.60 * t * t) + lift,
            Math.sin(a) * length * t + Math.cos(a) * side
          ]);
          anchors(group, A, strand(S, (t) => branch(t)), Math.floor(L * 0.72), i);
          for (let k = 1; k < 8; k++) for (const side of [-1, 1]) {
            const at = k / 8;
            strand(S, (t) => branch(at + (1 - Math.cos(t * TAU)) * 0.09,
              side * (Math.sin(t * Math.PI) * (0.08 - at * 0.046) + Math.sin(t * TAU) * 0.027), Math.sin(t * Math.PI) * 0.065));
          }
        }
      });
    },
    meadow(S, kids, rng, A) {
      groves(kids, 6, (group, base, turn) => {
        for (let i = 0; i < Math.max(3, group.length); i++) {
          const a = turn + i * GOLDEN + 0.45, f = stalk(base, a, i ? 0.20 + 0.031 * (i % 5) : 0.04, 0.46 + (i % 3) * 0.13);
          const at = f(1);
          anchors(group, A, strand(S, f), tip, i);
          for (let j = 0; j < 7; j++) {
            const angle = a + j * TAU / 7;
            petal(S, at, norm(add(flat(angle), [0, 0.42, 0])), norm(add(flat(angle + Math.PI / 2), [0, 0.45, 0])), 0.19, 0.045);
          }
          for (const side of [-1, 1]) petal(S, f(0.39 + side * 0.15), norm(add(flat(a + side), [0, 0.55, 0])), UP, 0.15, 0.043);
        }
      });
    },
    seedOrbits(S, kids, rng, A) {
      groves(kids, 6, (group, base, turn) => {
        for (let i = 0; i < Math.max(4, group.length); i++) {
          const a = turn + i * GOLDEN, h = i === 0 ? 0.86 : 0.46 + (i % 3) * 0.11;
          const f = stalk(base, a, i === 0 ? 0.05 : 0.18 + (i % 3) * 0.09, h), at = f(1);
          anchors(group, A, strand(S, f), tip, i);
          for (const sign of [-1, 1]) strand(S, (t) => add(f(t), mul(flat(a + Math.PI / 2), sign * Math.sin(t * Math.PI) * 0.042)));
          for (let j = 0; j < 3; j++) {
            const angle = a + j * Math.PI / 3, r = 0.10 + h * 0.045;
            loop(S, at, flat(angle), norm(add(UP, flat(angle + Math.PI / 2))), r, r * 0.91);
          }
        }
      });
    },
    redwood(S, kids, rng, A) {
      groves(kids, 7, (group, base, turn) => {
        const h = 1.24;
        for (const a of [0, 2.1, 4.2]) strand(S, (t) => add(base, add(mul(flat(a), 0.055 * (1 - t)), [0, h * t, 0])));
        group.forEach((_, i) => {
          const y = 0.4 + 0.67 * (i + 1) / group.length, at = add(base, [0, y, 0]), a = turn + i * GOLDEN, r = 0.40 * (1 - y / (h * 1.28));
          anchors(group, A, strand(S, quad(at, add(at, mul(flat(a), r * 0.52)), add(at, add(mul(flat(a), r), [0, 0.11, 0])))), tip, i);
          for (let j = 0; j < 6; j++) {
            const b = a + j * TAU / 6, point = add(at, mul(flat(b), r * 0.48));
            petal(S, point, norm(add(flat(b), [0, 0.42, 0])), sideOf(flat(b)), r * 0.78, r * 0.17);
          }
        });
      });
    },
    oak(S, kids, rng, A) {
      groves(kids, 6, (group, base, turn) => {
        const trunk = stalk(base, turn, 0.12, 0.92);
        for (const offset of [-0.034, 0, 0.034]) strand(S, (t) => add(trunk(t), [offset * (1 - t), 0, 0]));
        group.forEach((_, i) => {
          const a = turn + i * GOLDEN, p = trunk(0.48 + 0.16 * (i % 3)), crown = add(p, add(mul(flat(a), 0.29 + rng() * 0.06), [0, 0.28, 0]));
          strand(S, quad(p, add(p, mul(flat(a), 0.21)), crown));
          anchors(group, A, loop(S, crown, X, Z, 0.23, 0.21, 0.13), middle, i);
          for (const plane of [X, Z, flat(a)]) loop(S, crown, plane, UP, 0.20, 0.14, 0.17);
        });
      });
    },
    magnolia(S, kids, rng, A) {
      groves(kids, 5, (group, base, turn) => {
        const trunk = stalk(base, turn, 0.09, 0.83);
        strand(S, trunk);
        group.forEach((_, i) => {
          const a = i * GOLDEN + turn, p = trunk(0.45 + 0.13 * (i % 4)), at = add(p, add(mul(flat(a), 0.26), [0, 0.16, 0]));
          strand(S, quad(p, add(p, mul(flat(a), 0.2)), at));
          for (let j = 0; j < 8; j++) {
            const theta = a + j * TAU / 8, d = norm(add(flat(theta), [0, j % 2 ? 1.25 : 0.5, 0]));
            const k = petal(S, at, d, sideOf(d), j % 2 ? 0.21 : 0.26, 0.065, mul(flat(theta), -1), 0.045);
            if (!j) anchors(group, A, k, middle, i);
          }
        });
      });
    },
    horsetail(S, kids, rng, A) {
      groves(kids, 7, (group, base, turn) => {
        const trunk = stalk(base, turn, 0.05, 1.08);
        strand(S, trunk);
        group.forEach((_, i) => {
          const t = 0.28 + 0.61 * (i + 1) / group.length, at = trunk(t), r = 0.34 * (1 - 0.63 * t);
          loop(S, at, X, Z, 0.034, 0.034);
          for (let j = 0; j < 9; j++) {
            const d = flat(turn + j * TAU / 9 + i * 0.31);
            const id = strand(S, quad(at, add(at, mul(d, 0.66 * r)), add(at, add(mul(d, r), [0, r * 0.56, 0]))));
            if (!j) anchors(group, A, id, tip, i);
          }
        });
      });
    },
    pitcher(S, kids, rng, A) {
      groves(kids, 5, (group, base, turn) => group.forEach((_, i) => {
        const a = turn + i * GOLDEN, stem = stalk(base, a, 0.22 + 0.035 * i, 0.43 + 0.1 * (i % 3)), top = stem(1);
        strand(S, stem);
        const c = add(top, add(mul(flat(a), 0.10), [0, 0.12, 0]));
        const body = (t, angle) => add(c, add(mul(flat(angle), 0.08 + Math.sin(t * Math.PI) * 0.065), [0, (t - 0.6) * 0.34, 0]));
        for (let j = 0; j < 8; j++) strand(S, (t) => body(t, j * TAU / 8));
        for (const t of [0, 0.52, 1]) {
          const k = strand(S, (u) => body(t, u * TAU));
          if (t === 1) anchors(group, A, k, middle, i);
        }
        petal(S, body(1, a), norm(add(flat(a), [0, 0.65, 0])), sideOf(flat(a)), 0.19, 0.075);
      }));
    },
    lichen(S, kids, rng, A) {
      groves(kids, 6, (group, base, turn) => group.forEach((_, i) => {
        const a = turn + i * GOLDEN, p = add(base, mul(flat(a), i ? 0.16 : 0));
        const fork = (p, a, size, depth) => {
          const end = add(p, add(mul(flat(a), size * 0.56), [0, size * 0.88, 0]));
          const k = strand(S, quad(p, add(p, [0, size * 0.60, 0]), end));
          if (depth > 0) for (const d of [-0.8, 0.72]) fork(end, a + d + rng() * 0.32, size * 0.67, depth - 1);
          return k;
        };
        anchors(group, A, fork(p, a, 0.22 + rng() * 0.10, 3), tip, i);
      }));
    },
    coralFungus(S, kids, rng, A) {
      groves(kids, 6, (group, base, turn) => group.forEach((_, i) => {
        const a = turn + i * GOLDEN, h = 0.41 + rng() * 0.24, f = stalk(base, a, 0.12 + 0.032 * i, h);
        const k = strand(S, f);
        anchors(group, A, k, tip, i);
        for (const side of [-1, 0, 1]) {
          const dir = flat(a + side * 1.05), at = f(0.60 + Math.abs(side) * 0.06);
          const end = add(at, add(mul(dir, 0.14), [0, 0.22, 0]));
          strand(S, quad(at, add(at, mul(dir, 0.15)), end));
          for (const bend of [-0.5, 0.5]) strand(S, quad(end, add(end, [0, 0.07, 0]),
            add(end, add(mul(flat(a + side * 1.05 + bend), 0.055), [0, 0.13, 0]))));
        }
      }));
    },
  };
}
