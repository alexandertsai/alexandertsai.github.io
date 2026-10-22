export type WaterPointer = { x: number; y: number; active: boolean };
export type Obstacle = { x: number; y: number; radius: number; angle: number };
export type Minnow = { x: number; y: number; vx: number; vy: number; group: number; alarm: number; turn: number; depth: number; phase: number };

export function waterCurrent(x: number, y: number, time: number) {
  const a = x / 260 + time * .07, b = y / 310 - time * .05, c = (x + y) / 190 + time * .11;
  return { x: (-Math.sin(a) * Math.sin(b) / 310 + Math.cos(c) / 380) * 3000, y: (-Math.cos(a) * Math.cos(b) / 260 - Math.cos(c) / 380) * 3000 };
}

export function createWakeField(cols: number, rows: number) {
  let energy = new Float32Array(cols * rows), scratch = new Float32Array(cols * rows);
  return {
    get energy() { return energy; },
    stamp(x: number, y: number, radius: number, strength: number) {
      const cx = x / 7, cy = y / 10;
      for (let row = Math.max(0, Math.floor(cy - radius)); row <= Math.min(rows - 1, Math.ceil(cy + radius)); row++) {
        for (let col = Math.max(0, Math.floor(cx - radius)); col <= Math.min(cols - 1, Math.ceil(cx + radius)); col++) {
          const distance = Math.hypot(col - cx, (row - cy) * 1.3);
          if (distance <= radius) energy[row * cols + col] = Math.min(1.6, energy[row * cols + col] + strength * (1 - distance / (radius + .5)));
        }
      }
    },
    advance(dt: number) {
      const decay = Math.exp(-dt * .95), spread = Math.min(.2, dt * 3);
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const adjacent = energy[col ? i - 1 : i] + energy[col < cols - 1 ? i + 1 : i] + energy[row ? i - cols : i] + energy[row < rows - 1 ? i + cols : i];
        scratch[i] = (energy[i] * (1 - spread * 4) + adjacent * spread) * decay;
      }
      [energy, scratch] = [scratch, energy];
    },
  };
}

export function createWaterSchools(width: number, height: number, small = false) {
  let seed = 97421;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const count = Math.round(Math.max(64, Math.min(190, width * height / 6500)) * (small ? .7 : 1));
  const fish: Minnow[] = Array.from({ length: count }, (_, index) => {
    const group = Math.floor(index / 18), angle = group % 2 ? Math.PI + .2 : -.2;
    const cx = (.12 + (group * .283) % .76) * width, cy = (.16 + (group * .237) % .68) * height;
    return { x: cx + (random() - .5) * 140, y: cy + (random() - .5) * 90, vx: Math.cos(angle) * 29, vy: Math.sin(angle) * 29, group, alarm: 0, turn: 0, depth: .35 + random() * .6, phase: random() * Math.PI * 2 };
  });
  return {
    fish,
    splash(x: number, y: number) {
      for (const f of fish) {
        const dx = f.x - x, dy = f.y - y, distance = Math.hypot(dx, dy);
        if (distance > 190 || distance < .01) continue;
        const impulse = (1 - distance / 190) * 95;
        f.vx += dx / distance * impulse; f.vy += dy / distance * impulse; f.alarm = 1;
      }
    },
    advance(dt: number, time: number, obstacles: Obstacle[], pointer: WaterPointer) {
      const previous = fish.map(f => ({ ...f }));
      fish.forEach((f, index) => {
        let ax = 0, ay = 0, alignX = 0, alignY = 0, centerX = 0, centerY = 0, neighbours = 0, relayedAlarm = 0;
        for (let j = 0; j < previous.length; j++) {
          if (j === index) continue;
          const other = previous[j], dx = other.x - f.x, dy = other.y - f.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 85 || distance < .1) continue;
          const spacing = 17 + f.alarm * 14;
          if (distance < spacing) { ax -= dx / distance * (spacing - distance) * 7; ay -= dy / distance * (spacing - distance) * 7; }
          if (f.group === other.group) { alignX += other.vx; alignY += other.vy; centerX += dx; centerY += dy; neighbours++; }
          relayedAlarm = Math.max(relayedAlarm, other.alarm * .8);
        }
        if (neighbours) {
          ax += (alignX / neighbours - f.vx) * 1.5 + centerX / neighbours * .6;
          ay += (alignY / neighbours - f.vy) * 1.5 + centerY / neighbours * .6;
        }
        let fear = 0;
        for (const obstacle of obstacles) {
          const dx = f.x - obstacle.x, dy = f.y - obstacle.y, distance = Math.hypot(dx, dy);
          if (distance > obstacle.radius || distance < .1) continue;
          const weight = (1 - distance / obstacle.radius) ** 2;
          const side = Math.cos(obstacle.angle) * dy - Math.sin(obstacle.angle) * dx > 0 ? 1 : -1;
          ax += (dx / distance - Math.sin(obstacle.angle) * side * .65) * weight * 280;
          ay += (dy / distance + Math.cos(obstacle.angle) * side * .65) * weight * 280;
          fear = Math.max(fear, Math.sqrt(weight));
        }
        if (pointer.active) {
          const dx = f.x - pointer.x, dy = f.y - pointer.y, distance = Math.hypot(dx, dy);
          if (distance < 110 && distance > .1) {
            const weight = (1 - distance / 110) ** 2;
            ax += dx / distance * weight * 350; ay += dy / distance * weight * 350; fear = Math.max(fear, weight);
          }
        }
        f.alarm = Math.max(f.alarm * Math.exp(-dt * .9), fear, relayedAlarm);
        const flow = waterCurrent(f.x, f.y, time);
        ax += flow.x * .65 + Math.sin(time * .8 + f.phase) * 5;
        ay += flow.y * .65 + Math.cos(time * .65 + f.phase) * 4 - f.vy * .15;
        const speed = Math.hypot(f.vx, f.vy) || 1, preferred = 25 + f.group % 3 * 5 + f.alarm * 36;
        ax += (preferred - speed) * f.vx / speed * 1.3; ay += (preferred - speed) * f.vy / speed * 1.3;
        const heading = Math.atan2(f.vy, f.vx);
        f.vx += ax * dt; f.vy += ay * dt;
        const nextSpeed = Math.hypot(f.vx, f.vy) || 1, boundedSpeed = Math.max(13, Math.min(70 + f.alarm * 55, nextSpeed));
        f.vx *= boundedSpeed / nextSpeed; f.vy *= boundedSpeed / nextSpeed;
        const rotation = Math.atan2(Math.sin(Math.atan2(f.vy, f.vx) - heading), Math.cos(Math.atan2(f.vy, f.vx) - heading));
        f.turn += (rotation / dt - f.turn) * Math.min(1, dt * 6);
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < -70) f.x = width + 60;
        else if (f.x > width + 70) f.x = -60;
        if (f.y < -70) f.y = height + 60;
        else if (f.y > height + 70) f.y = -60;
      });
    },
  };
}
