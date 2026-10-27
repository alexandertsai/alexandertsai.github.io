import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../app/(about)/pond-water.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { createWakeField, createWaterSchools, rippleCurrent, rippleRadius, RIPPLE_DURATION, waterCurrent } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);

test('ripples gently push outward at the visible wavefront and leave distant fish alone', () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const ripple = { x: width / 2, y: height / 2, born: 0 };
    const time = .3, radius = rippleRadius(time / RIPPLE_DURATION, width, height);
    const right = rippleCurrent(ripple.x + radius, ripple.y, time, [ripple], width, height);
    const above = rippleCurrent(ripple.x, ripple.y - radius * .76, time, [ripple], width, height);
    assert.ok(right.x > 0 && right.x < 18);
    assert.equal(right.y, 0);
    assert.ok(above.y < 0 && above.y > -18);
    const distant = rippleCurrent(ripple.x + radius + 150, ripple.y, time, [ripple], width, height);
    assert.ok(Math.hypot(distant.x, distant.y) < .001);
    assert.deepEqual(rippleCurrent(ripple.x + radius, ripple.y, RIPPLE_DURATION, [ripple], width, height), { x: 0, y: 0 });
    const repeated = rippleCurrent(ripple.x + radius, ripple.y, time, Array(6).fill(ripple), width, height);
    assert.ok(Math.hypot(repeated.x, repeated.y) <= 18);
    assert.deepEqual(rippleCurrent(ripple.x, ripple.y, time, [ripple], width, height), { x: 0, y: 0 });
  }
});

test('tail wakes spread into nearby cells and fade without gaining energy', () => {
  const wake = createWakeField(25, 25);
  wake.stamp(84, 120, 1, 1);
  const center = 12 * 25 + 12;
  const before = wake.energy.reduce((a, b) => a + b, 0);
  wake.advance(1 / 60);
  assert.ok(wake.energy[center + 2] > 0, 'wake should spread beyond the deposited cells');
  assert.ok(wake.energy.reduce((a, b) => a + b, 0) < before);
  for (let i = 0; i < 900; i++) wake.advance(1 / 60);
  assert.ok(wake.energy.every(value => Number.isFinite(value) && value >= 0 && value < .00001));
});

test('water currents have no accumulating source or sink', () => {
  for (const [x, y, time] of [[100, 200, 0], [900, 600, 20], [30, 50, 120]]) {
    const h = .01;
    const divergence = (waterCurrent(x + h, y, time).x - waterCurrent(x - h, y, time).x + waterCurrent(x, y + h, time).y - waterCurrent(x, y - h, time).y) / (2 * h);
    assert.ok(Math.abs(divergence) < .000001);
  }
});

test('a splash scatters nearby minnows outward and their alarm settles afterward', () => {
  const school = createWaterSchools(800, 600);
  school.fish.splice(1);
  const fish = school.fish[0];
  Object.assign(fish, { x: 420, y: 300, vx: 20, vy: 0 });
  school.splash(400, 300);
  assert.ok(fish.vx > 80);
  assert.equal(fish.alarm, 1);
  for (let i = 1; i <= 600; i++) school.advance(1 / 60, i / 60, [], { active: false, x: 0, y: 0 });
  assert.ok(fish.alarm < .001);
});

test('minnows split away from a koi and react to a nearby cursor', () => {
  for (const cursor of [false, true]) {
    const school = createWaterSchools(800, 600);
    school.fish.splice(1);
    Object.assign(school.fish[0], { x: 420, y: 300, vx: 0, vy: 20 });
    school.advance(.1, 0, cursor ? [] : [{ x: 400, y: 300, angle: 0, radius: 100 }], { active: cursor, x: 400, y: 300 });
    assert.ok(school.fish[0].vx > 0);
    assert.ok(school.fish[0].alarm > .4);
  }
});

test('schools remain finite and keep their population through screen crossings', () => {
  const school = createWaterSchools(390, 844);
  const count = school.fish.length;
  for (let i = 1; i <= 1800; i++) school.advance(1 / 60, i / 60, [], { active: false, x: 0, y: 0 });
  assert.equal(school.fish.length, count);
  assert.ok(school.fish.every(fish => [fish.x, fish.y, fish.vx, fish.vy].every(Number.isFinite)));
  assert.ok(school.fish.every(fish => fish.x >= -70 && fish.x <= 460 && fish.y >= -70 && fish.y <= 914));
});
