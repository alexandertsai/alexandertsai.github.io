import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../app/(about)/ponyo-surfaces.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { resolvePerch, isSurfaceVisible, chooseGreetingPerch } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);

const surface = {
  id: 'word', kind: 'text', label: 'Abc', left: 10, right: 70, y: 100, footprint: 12,
  glyphs: [
    { left: 0, right: 20, y: 100 },
    { left: 25, right: 45, y: 104 },
    { left: 50, right: 80, y: 108 },
  ],
};

test('feet follow the visible letters, including shorter lowercase letters', () => {
  assert.deepEqual(resolvePerch(surface, { id: 'word', fraction: 0 }), { x: 10, y: 100 });
  assert.deepEqual(resolvePerch(surface, { id: 'word', fraction: 0.5 }), { x: 40, y: 104 });
  assert.deepEqual(resolvePerch(surface, { id: 'word', fraction: 1 }), { x: 70, y: 108 });
});

test('every pacing position stays supported within the word', () => {
  for (let step = 0; step <= 100; step++) {
    const point = resolvePerch(surface, { id: 'word', fraction: step / 100 });
    assert.ok(point.x >= surface.left && point.x <= surface.right);
    assert.ok(surface.glyphs.some(glyph => glyph.left < point.x + 6 && glyph.right > point.x - 6 && glyph.y === point.y));
  }
});

test('divider landings stay exactly on the border', () => {
  assert.deepEqual(resolvePerch({ id: 'line', kind: 'divider', label: 'divider', left: 20, right: 300, y: 200 }, { id: 'line', fraction: 0.5 }), { x: 160, y: 200 });
});

test('scrolling only offers surfaces with room for the whole sprite', () => {
  assert.equal(isSurfaceVisible(surface, 0, 800, 46), true);
  assert.equal(isSurfaceVisible(surface, 60, 800, 46), false);
  assert.equal(isSurfaceVisible({ ...surface, y: 780 }, 0, 800, 46), false);
});


test('greeting follows the viewport instead of an offscreen header', () => {
  const surfaces = [
    { id: 'header', kind: 'divider', left: 20, right: 700, y: 250 },
    { id: 'section', kind: 'divider', left: 20, right: 700, y: 1000 },
    { id: 'heading', kind: 'text', left: 20, right: 160, y: 1450 },
  ];
  assert.equal(chooseGreetingPerch(surfaces, 0, 800, 46).id, 'header');
  assert.equal(chooseGreetingPerch(surfaces, 750, 800, 46).id, 'section');
  assert.equal(chooseGreetingPerch(surfaces, 1150, 700, 39).id, 'heading');
});

test('greeting leaves room above the sprite for its bubble on mobile', () => {
  const surfaces = [
    { id: 'clipped', kind: 'text', left: 20, right: 160, y: 580 },
    { id: 'safe', kind: 'text', left: 20, right: 160, y: 740 },
  ];
  assert.equal(chooseGreetingPerch(surfaces, 500, 667, 39).id, 'safe');
  assert.equal(chooseGreetingPerch(surfaces, 900, 667, 39), null);
});
