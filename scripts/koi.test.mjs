import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../app/(about)/koi-motion.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { createSchool, sampleSpine } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
const waterSource = await readFile(new URL('../app/(about)/pond-water.ts', import.meta.url), 'utf8');
const waterCompiled = ts.transpileModule(waterSource, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { waterCurrent } = await import(`data:text/javascript;base64,${Buffer.from(waterCompiled.outputText).toString('base64')}`);

for (const [width, height] of [[1440, 900], [864, 960], [390, 844]]) {
  test(`fish leave and re-enter the pond smoothly at ${width} × ${height}`, () => {
    const school = createSchool();
    const exited = school.fish.map(() => false), returned = school.fish.map(() => false);
    const bounds = school.fish.map(() => ({ minX: 1, maxX: 0, minY: 1, maxY: 0 }));
    for (let step = 1; step <= 4800; step++) {
      const previous = school.fish.map(fish => ({ ...fish }));
      school.advance(.05, step * .05, width, height, waterCurrent);
      school.fish.forEach((fish, index) => {
        const inside = fish.x >= 0 && fish.x <= 1 && fish.y >= 0 && fish.y <= 1;
        if (!inside) exited[index] = true;
        if (exited[index] && inside) returned[index] = true;
        assert.ok(fish.x > -2 && fish.x < 3 && fish.y > -2 && fish.y < 3, 'fish should stay within the extended pond');
        assert.ok(Math.abs(fish.angle - previous[index].angle) < .04, 'turns should be gradual');
        const dx = (fish.x - previous[index].x) * width;
        const dy = (fish.y - previous[index].y) * height;
        assert.ok(dx * Math.cos(fish.angle) + dy * Math.sin(fish.angle) > 0, 'fish should swim head first');
        bounds[index].minX = Math.min(bounds[index].minX, fish.x);
        bounds[index].maxX = Math.max(bounds[index].maxX, fish.x);
        bounds[index].minY = Math.min(bounds[index].minY, fish.y);
        bounds[index].maxY = Math.max(bounds[index].maxY, fish.y);
      });
    }
    assert.ok(exited.every(Boolean), 'every koi should travel offscreen');
    assert.ok(returned.every(Boolean), 'every koi should swim back into view');
    for (const bound of bounds) {
      assert.ok(bound.maxX - bound.minX > .5, 'each fish should cross more than half the viewport width');
      assert.ok(bound.maxY - bound.minY > .35, 'each fish should explore different pond depths');
    }
  });
}

test('the body follows the curved route already traveled by its head', () => {
  const fish = createSchool().fish[0];
  fish.x = .5; fish.y = .5; fish.angle = 0;
  fish.trail = Array.from({ length: 100 }, (_, index) => {
    const angle = index / 99 * Math.PI / 2;
    return { x: (.5 * 1000 - 100 * Math.sin(angle)) / 1000, y: (.5 * 1000 + 100 * (1 - Math.cos(angle))) / 1000 };
  });
  const head = sampleSpine(fish, 0, 1000, 1000);
  const middle = sampleSpine(fish, 78, 1000, 1000);
  const tail = sampleSpine(fish, 155, 1000, 1000);
  assert.equal(head.angle, 0);
  assert.ok(middle.y > head.y + 20, 'midbody should bend into the route');
  assert.ok(tail.y > middle.y + 60, 'tail should continue along the arc');
  assert.ok(tail.angle < middle.angle - .5, 'the tail should retain its earlier heading');
});

test('both page styles cap the school at four fish and give small fish more speed', () => {
  for (const small of [false, true]) {
    const school = createSchool(small);
    assert.equal(school.fish.length, 4);
    const largest = school.fish.reduce((a, b) => a.size > b.size ? a : b);
    const smallest = school.fish.reduce((a, b) => a.size < b.size ? a : b);
    assert.ok(smallest.speed > largest.speed * 2);
  }
});

test('a small fish gains speed when descending and accelerates smoothly', () => {
  const descending = createSchool();
  const ascending = createSchool();
  const down = descending.fish.at(-1), up = ascending.fish.at(-1);
  const startVelocity = down.velocity;
  for (let step = 1; step <= 20; step++) {
    down.angle = Math.PI / 2; up.angle = -Math.PI / 2;
    down.turn = 0; up.turn = 0;
    const previousVelocity = down.velocity;
    descending.advance(.05, step * .05, 1440, 900);
    ascending.advance(.05, step * .05, 1440, 900);
    assert.ok(Math.abs(down.velocity - previousVelocity) < 3, 'speed should ease between frames');
  }
  assert.ok(down.velocity > up.velocity * 1.2);
  assert.notEqual(down.velocity, startVelocity);
});
