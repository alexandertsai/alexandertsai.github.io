export type Swimmer = {
  x: number; y: number; angle: number; size: number; speed: number; velocity: number;
  targetX: number; targetY: number; turn: number;
  alarm: number; threatX: number; threatY: number;
  excursionAt: number; excursionUntil: number; excursion: boolean; variant: number; depth: number; phase: number;
  trail: { x: number; y: number }[];
};

export function sampleSpine(fish: Swimmer, distance: number, width: number, height: number) {
  const head = { x: fish.x * width, y: fish.y * height, angle: fish.angle };
  if (distance <= 0) return { x: head.x - Math.cos(fish.angle) * distance, y: head.y - Math.sin(fish.angle) * distance, angle: fish.angle };
  let previous = head;
  for (const point of fish.trail) {
    const x = point.x * width, y = point.y * height;
    const length = Math.hypot(previous.x - x, previous.y - y);
    if (length < .01) continue;
    const angle = Math.atan2(previous.y - y, previous.x - x);
    if (distance <= length) return { x: previous.x + (x - previous.x) * distance / length, y: previous.y + (y - previous.y) * distance / length, angle };
    distance -= length;
    previous = { x, y, angle };
  }
  return { x: previous.x - Math.cos(previous.angle) * distance, y: previous.y - Math.sin(previous.angle) * distance, angle: previous.angle };
}

export function createSchool(small = false) {
  const starts = [
    [.84, .55, 1.8, 1.15, 34], [.13, .78, -.8, .98, 43],
    [.82, .86, -2.5, .65, 58], [.32, .12, .9, .42, 72],
  ];
  const fish: Swimmer[] = starts.map(([x, y, angle, size, speed], index) => ({
    x, y, angle, size: size * (small ? .5 : 1), speed: speed * (small ? .78 : 1),
    velocity: speed * (small ? .78 : 1), alarm: 0, threatX: 0, threatY: 0,
    excursionAt: 9 + index * 11, excursionUntil: 0, excursion: false, variant: index, depth: .78 + index % 2 * .12, phase: index * 1.9,
    targetX: x < .5 ? .85 : .15, targetY: .15 + (index * .23) % .7, turn: 0, trail: [],
  }));
  let seed = 7301;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return {
    fish,
    disturb(x: number, y: number, width: number, height: number) {
      let closest: Swimmer | undefined;
      let nearest = 1;
      for (const swimmer of fish) {
        const size = Math.max(.7, Math.min(width / 1250, 1.15)) * swimmer.size;
        for (const distance of [0, 45, 100, 160, 215]) {
          const point = sampleSpine(swimmer, distance * size, width, height);
          const proximity = Math.hypot(x - point.x, y - point.y) / (20 + size * 25);
          if (proximity < nearest) { closest = swimmer; nearest = proximity; }
        }
      }
      if (!closest) return;
      closest.alarm = Math.min(1, closest.alarm + .35 + .25 * (1 - nearest));
      closest.threatX = x; closest.threatY = y;
    },
    resetTrails(width: number, height: number) {
      for (const swimmer of fish) swimmer.trail = Array.from({ length: 210 }, (_, index) => ({
        x: swimmer.x - Math.cos(swimmer.angle) * index * 3 / width,
        y: swimmer.y - Math.sin(swimmer.angle) * index * 3 / height,
      }));
    },
    advance(dt: number, time: number, width: number, height: number, flow?: (x: number, y: number, time: number) => { x: number; y: number }) {
      const previous = fish.map(swimmer => ({ x: swimmer.x, y: swimmer.y, size: swimmer.size }));
      fish.forEach((swimmer, index) => {
        swimmer.alarm *= Math.exp(-dt * .7);
        const distance = Math.hypot((swimmer.targetX - swimmer.x) * width, (swimmer.targetY - swimmer.y) * height);
        if (!swimmer.excursion && time >= swimmer.excursionAt && fish.filter(other => other.excursion).length < 2) {
          const extension = 180 + 120 * swimmer.size;
          const edge = (index + Math.floor(time / 40)) % 4;
          swimmer.targetX = edge === 0 ? -extension / width : edge === 1 ? 1 + extension / width : .15 + random() * .7;
          swimmer.targetY = edge === 2 ? -extension / height : edge === 3 ? 1 + extension / height : .15 + random() * .7;
          swimmer.excursion = true;
          swimmer.excursionUntil = time + 12 + Math.hypot((swimmer.targetX - swimmer.x) * width, (swimmer.targetY - swimmer.y) * height) / (swimmer.speed * .65 * Math.min(1, width / 650));
        } else if (distance < 65 || (swimmer.excursion && time > swimmer.excursionUntil)) {
          swimmer.targetX = swimmer.x < .5 ? .7 + random() * .2 : .1 + random() * .2;
          swimmer.targetY = .1 + random() * .8;
          if (swimmer.excursion) { swimmer.excursion = false; swimmer.excursionAt = time + 24 + random() * 22; }
        }
        let dx = (swimmer.targetX - swimmer.x) * width;
        let dy = (swimmer.targetY - swimmer.y) * height;
        const beyond = Math.max(-swimmer.x * width, (swimmer.x - 1) * width, -swimmer.y * height, (swimmer.y - 1) * height);
        const outerLimit = Math.max(440, 380 * swimmer.size);
        if (beyond > outerLimit) {
          swimmer.targetX = .5; swimmer.targetY = .5; swimmer.excursion = false; swimmer.excursionAt = time + 30;
          dx = (.5 - swimmer.x) * width; dy = (.5 - swimmer.y) * height;
        }
        if (flow) { const current = flow(swimmer.x * width, swimmer.y * height, time); dx += current.x * 3; dy += current.y * 3; }
        for (let otherIndex = 0; otherIndex < previous.length; otherIndex++) {
          if (otherIndex === index) continue;
          const other = previous[otherIndex];
          const sx = (swimmer.x - other.x) * width, sy = (swimmer.y - other.y) * height;
          const separation = Math.hypot(sx, sy);
          const space = Math.min(width * .3, 120 + (swimmer.size + other.size) * 55);
          if (separation < space && separation > 0) {
            dx += sx / separation * (space - separation) * 3;
            dy += sy / separation * (space - separation) * 3;
          }
        }
        if (swimmer.alarm > .01 && beyond < outerLimit) {
          let awayX = swimmer.x * width - swimmer.threatX, awayY = swimmer.y * height - swimmer.threatY;
          const awayLength = Math.hypot(awayX, awayY);
          if (awayLength < 1) { awayX = Math.cos(swimmer.angle); awayY = Math.sin(swimmer.angle); }
          const blend = Math.min(.95, swimmer.alarm * 1.4);
          const routeLength = Math.max(1, Math.hypot(dx, dy));
          const length = Math.max(1, awayLength);
          dx = dx / routeLength * (1 - blend) + awayX / length * blend;
          dy = dy / routeLength * (1 - blend) + awayY / length * blend;
        }
        const desired = Math.atan2(dy, dx) + Math.sin(time * .4 + index * 3) * .08;
        const difference = Math.atan2(Math.sin(desired - swimmer.angle), Math.cos(desired - swimmer.angle));
        const radius = Math.max(68, swimmer.size * Math.max(.7, Math.min(width / 1250, 1.15)) * 115);
        const agility = Math.min(1.5, Math.min(.75, swimmer.velocity * Math.min(1, width / 650) / radius) * (1 + swimmer.alarm * 2));
        const desiredTurn = Math.max(-agility, Math.min(agility, difference * 1.2));
        swimmer.turn += (desiredTurn - swimmer.turn) * Math.min(1, dt * 2.5);
        swimmer.angle += swimmer.turn * dt;
        const relativeSize = swimmer.size / (small ? .5 : 1);
        const descending = Math.max(0, Math.sin(swimmer.angle));
        const descentBoost = 1 + Math.max(0, 1 - relativeSize) * descending * .6;
        const cruise = .8 + .2 * Math.sin(time * (.35 + index * .07) + index * 2);
        const desiredSpeed = swimmer.speed * cruise * descentBoost * (1 + swimmer.alarm * .9);
        swimmer.velocity += (desiredSpeed - swimmer.velocity) * Math.min(1, dt * 1.5);
        const speed = swimmer.velocity * Math.min(1, width / 650);
        swimmer.x += Math.cos(swimmer.angle) * speed * dt / width;
        swimmer.y += Math.sin(swimmer.angle) * speed * dt / height;
        swimmer.phase += dt * (2.4 + swimmer.velocity / 22) * (1 + swimmer.alarm * .8);
        const latest = swimmer.trail[0];
        if (!latest || Math.hypot((swimmer.x - latest.x) * width, (swimmer.y - latest.y) * height) >= 2) {
          swimmer.trail.unshift({ x: swimmer.x, y: swimmer.y });
          if (swimmer.trail.length > 320) swimmer.trail.pop();
        }
      });
    },
  };
}
