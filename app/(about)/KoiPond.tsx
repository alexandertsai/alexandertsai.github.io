"use client";

import { useEffect, useRef, useState } from "react";
import { createSchool, sampleSpine } from "./koi-motion";
import { createWakeField, createWaterSchools, rippleCurrent, rippleRadius, RIPPLE_DURATION, waterCurrent, type Ripple, type WaterPointer } from "./pond-water";
import "./pond.css";

const TAU = Math.PI * 2;
const PALETTES = [
  { shade: ["#7e979a", "#d4ded8", "#a4b8b6"], patch: "#df4423", fin: "#b6c7c6" },
  { shade: ["#aa6c16", "#efbb48", "#ce8c21"], patch: "#f4d87a", fin: "#d49e37" },
  { shade: ["#242e32", "#526062", "#303e43"], patch: "#e65127", fin: "#556c72" },
  { shade: ["#95a9af", "#e7eee9", "#b7c8c9"], patch: "#252e33", fin: "#9eb8be" },
];

function koi(ctx: CanvasRenderingContext2D, time: number, variant: number, turn: number, alarm: number) {
  const palette = PALETTES[variant % PALETTES.length];
  const bend = (x: number) => {
    const tail = Math.max(0, (80 - x) / 185);
    return Math.sin(time * 4.5 - tail * 4) * 15 * (1 + alarm * 1.4) * tail * tail;
  };
  const body = new Path2D();
  body.moveTo(108, bend(108));
  body.bezierCurveTo(108, -19, 92, -30, 70, -35);
  body.bezierCurveTo(25, -47, -22, -36 + bend(-22), -58, -22 + bend(-58));
  body.bezierCurveTo(-79, -12 + bend(-79), -91, -6 + bend(-91), -106, -5 + bend(-106));
  body.lineTo(-106, 5 + bend(-106));
  body.bezierCurveTo(-91, 6 + bend(-91), -79, 12 + bend(-79), -58, 22 + bend(-58));
  body.bezierCurveTo(-22, 36 + bend(-22), 25, 47, 70, 35);
  body.bezierCurveTo(92, 30, 108, 19, 108, bend(108));
  body.closePath();

  ctx.save();
  ctx.globalAlpha = .94;
  for (const side of [-1, 1]) {
    const reach = side * (1 - side * Math.max(-.23, Math.min(.23, turn * .3)));
    const flutter = Math.sin(time * 3.5 + side) * 5;
    ctx.fillStyle = palette.fin;
    ctx.beginPath();
    ctx.moveTo(55, reach * 23);
    ctx.bezierCurveTo(53, reach * 58, 8, reach * (77 + flutter), -16, reach * 59);
    ctx.quadraticCurveTo(-28, reach * 47, 18, reach * 26);
    ctx.fill();
    ctx.strokeStyle = "#27465b"; ctx.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(43 - i * 3, reach * 29);
      ctx.quadraticCurveTo(23 - i * 5, reach * 46, 12 - i * 4, reach * (63 - i)); ctx.stroke();
    }
    ctx.fillStyle = palette.fin;
    ctx.beginPath(); ctx.ellipse(-54, reach * 24 + bend(-54), 23, 10, reach * -.5, 0, TAU); ctx.fill();
  }
  const tail = bend(-106), tip = bend(-165);
  ctx.fillStyle = palette.fin;
  ctx.beginPath(); ctx.moveTo(-101, tail - 5);
  ctx.bezierCurveTo(-129, tail - 8, -141, tip - 54, -179, tip - 45);
  ctx.bezierCurveTo(-193, tip - 37, -158, tip - 12, -149, tip);
  ctx.bezierCurveTo(-161, tip + 15, -190, tip + 38, -179, tip + 45);
  ctx.bezierCurveTo(-146, tip + 53, -125, tail + 7, -101, tail + 5); ctx.fill();
  ctx.strokeStyle = "#27465b"; ctx.lineWidth = 1.2;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(-109, tail); ctx.quadraticCurveTo(-137, tip + i * 3, -176 + Math.abs(i) * 2, tip + i * 10); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.clip(body);
  const shade = ctx.createLinearGradient(0, -42, 0, 42);
  shade.addColorStop(0, palette.shade[0]); shade.addColorStop(.45, palette.shade[1]); shade.addColorStop(1, palette.shade[2]);
  ctx.fillStyle = shade; ctx.fillRect(-115, -95, 235, 190);
  ctx.fillStyle = palette.patch;
  const patches = variant === 1 ? [[53, -5, 32, 26], [-22, 8, 22, 25]] : [[75, 0, 22, 24], [9, -9, 32, 26], [-63, 3, 18, 18]];
  for (const [x, y, rx, ry] of patches) {
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const angle = i / 24 * TAU;
      const edge = 1 + Math.sin(angle * 3 + x) * .14 + Math.cos(angle * 5) * .1;
      const px = x + Math.cos(angle) * rx * edge, py = y + bend(x) + Math.sin(angle) * ry * edge;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.fill();
  }
  if (variant === 2) {
    ctx.fillStyle = "#e9ece0";
    for (const [x, y, r] of [[35, 22, 16], [-20, -18, 19], [-77, 2, 10]]) {
      ctx.beginPath(); ctx.ellipse(x, y + bend(x), r, r * .7, .5, 0, TAU); ctx.fill();
    }
  }
  if (variant === 3) {
    ctx.fillStyle = "#e34622"; ctx.beginPath(); ctx.ellipse(81, 0, 13, 18, 0, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = "#65745c"; ctx.globalAlpha = .3; ctx.lineWidth = 1;
  for (let x = -85; x < 66; x += 10) for (let y = -38; y < 40; y += 11) {
    ctx.beginPath(); ctx.arc(x + (Math.abs(y) % 2) * 4, y + bend(x), 6, -.9, .9); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#5e7679"; ctx.lineWidth = 3.5; ctx.stroke(body);
  ctx.strokeStyle = "#24475e"; ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(63, side * 29); ctx.quadraticCurveTo(48, side * 13, 56, side * 4); ctx.stroke();
    ctx.fillStyle = "#141f18";
    ctx.beginPath(); ctx.ellipse(88, side * 22, 5, 3.7, side * .4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e9e7d1";
    ctx.beginPath(); ctx.arc(90, side * 23, 1.7, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#d3cba3"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(102, side * 9); ctx.quadraticCurveTo(126, side * 17, 117, side * 29); ctx.stroke();
  }
  ctx.strokeStyle = "#626e59";
  ctx.beginPath(); ctx.moveTo(102, -7); ctx.quadraticCurveTo(99, 0, 102, 7); ctx.stroke();
}

export default function KoiPond({ small = false }: { small?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visitor, setVisitor] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const buffer = document.createElement("canvas");
    const paint = buffer.getContext("2d", { willReadFrequently: true });
    if (!paint) return;
    const texture = document.createElement("canvas");
    texture.width = 340; texture.height = 240;
    const ink = texture.getContext("2d");
    if (!ink) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, raf = 0, last = 0, time = 0, accumulator = 0;
    let sequence = "";
    const ripples: Ripple[] = [];
    const school = createSchool(small);
    const current = (x: number, y: number, time: number) => {
      const flow = waterCurrent(x, y, time);
      const ripple = rippleCurrent(x, y, time, ripples, width, height);
      return { x: flow.x + ripple.x, y: flow.y + ripple.y };
    };
    const hero = document.querySelector(".home-hero");
    let pondOpacity = 1;
    let minnows: ReturnType<typeof createWaterSchools>;
    let wake: ReturnType<typeof createWakeField>;
    const waterPointer: WaterPointer = { x: 0, y: 0, active: false };
    const leavePointer = () => { waterPointer.active = false; };
    const movePointer = (event: PointerEvent) => {
      waterPointer.x = event.clientX; waterPointer.y = event.clientY;
      waterPointer.active = event.pointerType !== "touch" && !(event.target as Element).closest("a, button, input, textarea");
    };
    let mask = new Float32Array(0), maskDirty = true, lastMask = 0;
    const invalidateMask = () => {
      maskDirty = true;
      const remaining = hero?.getBoundingClientRect().bottom ?? height;
      pondOpacity = small ? .55 : .28 + .72 * Math.max(0, Math.min(1, remaining / (height * .65)));
    };
    const measureText = () => {
      const cols = buffer.width, rows = buffer.height;
      mask = new Float32Array(cols * rows).fill(1);
      for (const element of document.querySelectorAll("[data-pond-text]")) {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -30 || rect.top > height + 30) continue;
        for (let y = Math.max(0, Math.floor((rect.top - 28) / 10)); y < Math.min(rows, Math.ceil((rect.bottom + 28) / 10)); y++) {
          for (let x = Math.max(0, Math.floor((rect.left - 28) / 7)); x < Math.min(cols, Math.ceil((rect.right + 28) / 7)); x++) {
            const dx = Math.max(rect.left - x * 7, 0, x * 7 - rect.right);
            const dy = Math.max(rect.top - y * 10, 0, y * 10 - rect.bottom);
            const fade = Math.min(1, Math.hypot(dx, dy) / 28);
            mask[y * cols + x] = Math.min(mask[y * cols + x], .13 + .87 * fade * fade * (3 - 2 * fade));
          }
        }
      }
      maskDirty = false;
    };
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buffer.width = Math.ceil(width / 7); buffer.height = Math.ceil(height / 10);
      school.resetTrails(width, height);
      minnows = createWaterSchools(width, height, small);
      wake = createWakeField(buffer.width, buffer.height);
      invalidateMask();
    };
    const pointer = (event: PointerEvent) => {
      if (motion.matches || event.button !== 0 || (event.target as Element).closest("a, button, input, textarea")) return;
      minnows.splash(event.clientX, event.clientY);
      school.disturb(event.clientX, event.clientY, width, height);
      wake.stamp(event.clientX, event.clientY, 5, .75);
      ripples.push({ x: event.clientX, y: event.clientY, born: time });
      if (ripples.length > 6) ripples.shift();
    };
    const key = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || (event.target as Element).closest("input, textarea, [contenteditable]")) return;
      sequence = (sequence + event.key.toLowerCase()).slice(-5);
      if (sequence === "ponyo") setVisitor(value => !value);
      if (event.key === "Escape") setVisitor(false);
    };
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 32) return;
      const dt = Math.min((now - last) / 1000, 0.08); last = now;
      if (document.hidden) return;
      const still = motion.matches;

      ctx.clearRect(0, 0, width, height);
      const cols = buffer.width, rows = buffer.height;
      paint.clearRect(0, 0, cols, rows);
      const scale = Math.min(width / 1250, 1.15);
      if (!still) {
        accumulator += dt;
        let steps = 0;
        while (accumulator >= 1 / 60 && steps < 5) {
          const step = 1 / 60;
          time += step; school.advance(step, time, width, height, current);
          const obstacles = school.fish.flatMap(swimmer => {
            const size = Math.max(.7, scale) * swimmer.size;
            return [0, 85, 155].map(distance => ({ ...sampleSpine(swimmer, distance * size, width, height), radius: 40 + size * 65 }));
          });
          minnows.advance(step, time, obstacles, waterPointer);
          wake.advance(step);
          for (const swimmer of school.fish) {
            const size = Math.max(.7, scale) * swimmer.size;
            for (const distance of [205, 240, 275]) {
              const tail = sampleSpine(swimmer, distance * size, width, height);
              wake.stamp(tail.x + Math.sin(swimmer.phase) * 7 * size, tail.y + Math.cos(swimmer.phase) * 7 * size, 2, step * (2.4 + swimmer.velocity * .02) * size);
            }
          }
          for (const f of minnows.fish) wake.stamp(f.x, f.y, .7, step * (.2 + f.alarm * .45));
          if (waterPointer.active) wake.stamp(waterPointer.x, waterPointer.y, 1.8, step * 2.3);
          accumulator -= step; steps++;
        }
        if (steps === 5) accumulator = 0;
      }
      [...school.fish].sort((a, b) => a.depth - b.depth).forEach((swimmer) => {
        ink.clearRect(0, 0, texture.width, texture.height);
        ink.save(); ink.translate(200, 120); koi(ink, swimmer.phase / 4.5, swimmer.variant, swimmer.turn, swimmer.alarm); ink.restore();
        const size = Math.max(.7, scale) * swimmer.size;
        paint.save(); paint.scale(1 / 7, 1 / 10);
        const light = 1 + .035 * Math.sin(time * .27 + swimmer.x * 4) * Math.cos(time * .18 + swimmer.y * 5);
        paint.filter = `brightness(${light * (.94 + swimmer.depth * .06)})`;
        // Each strip follows the position the head previously swam through.
        for (let x = -190; x < 128; x += 4) {
          const pose = sampleSpine(swimmer, (108 - x) * size, width, height);
          paint.save(); paint.translate(pose.x, pose.y); paint.rotate(pose.angle);
          paint.drawImage(texture, x + 200, 0, 4, 240, -2 * size, -120 * size, 4.7 * size, 240 * size);
          paint.restore();
        }
        paint.restore();
      });
      if (maskDirty || now - lastMask > 750) { measureText(); lastMask = now; }
      const pixels = paint.getImageData(0, 0, cols, rows).data;
      ctx.globalAlpha = pondOpacity;
      ctx.font = "10px Menlo, Consolas, monospace"; ctx.textBaseline = "top";
      const occupied = new Uint8Array(cols * rows);
      for (let i = 0; i < wake.energy.length; i++) {
        const energy = wake.energy[i];
        if (energy < .045 || pixels[i * 4 + 3] > 40) continue;
        const x = i % cols, y = Math.floor(i / cols);
        const caustic = .86 + .14 * Math.sin(x * .1 + time * .3) * Math.cos(y * .13 - time * .2);
        const shadowCell = Math.max(0, y - 2) * cols + Math.max(0, x - 2);
        const shadow = pixels[shadowCell * 4 + 3] > 40 ? .3 : 1;
        const alpha = Math.min(.55, Math.sqrt(energy) * .5) * caustic * mask[i] * shadow;
        ctx.fillStyle = `rgba(44,115,117,${alpha})`;
        const dot = energy > .35 ? 3 : 2;
        ctx.fillRect(x * 7 + 4, y * 10 + 6, dot, dot);
      }
      for (const f of [...minnows.fish].sort((a, b) => b.depth - a.depth)) {
        const x = Math.floor(f.x / 7), y = Math.floor(f.y / 10), i = y * cols + x;
        if (x < 0 || x >= cols || y < 0 || y >= rows || occupied[i] || pixels[i * 4 + 3] > 40) continue;
        occupied[i] = 1;
        const glint = Math.min(1, Math.max(Math.abs(f.turn) / 4, f.alarm));
        const alpha = (.17 + f.depth * .35 + glint * .25) * mask[i];
        ctx.fillStyle = `rgba(70,101,108,${alpha})`; ctx.fillText("-", x * 7, y * 10);
      }
      const chars = ".:;=+x%S8@";
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const offset = (y * cols + x) * 4;
        if (pixels[offset + 3] < 40) continue;
        const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
        const noise = ((x * 37 + y * 71) % 101) / 101;
        const coverage = pixels[offset + 3] / 255;
        const marking = r > g * 1.2;
        const density = coverage < .55 ? .3 + noise * .25 : marking ? .74 + noise * .25 : .57 + noise * .3;
        const alpha = (.92 + noise * .08) * coverage * mask[y * cols + x];
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.24})`; ctx.fillRect(x * 7, y * 10, 6, 9);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fillText(chars[Math.min(chars.length - 1, Math.floor(density * chars.length))], x * 7, y * 10);
      }
      ctx.globalAlpha = 1;
      for (let index = ripples.length - 1; index >= 0; index--) {
        const ripple = ripples[index];
        const age = time - ripple.born;
        if (age >= RIPPLE_DURATION) { ripples.splice(index, 1); continue; }
        if (still) continue;
        const progress = age / RIPPLE_DURATION;
        const radius = rippleRadius(progress, width, height);
        const opacity = Math.pow(1 - progress, 1.8) * .42;
        ctx.strokeStyle = `rgba(57,105,115,${opacity})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(ripple.x, ripple.y, radius, radius * .76, 0, 0, TAU); ctx.stroke();
      }

    };
    resize();
    window.addEventListener("scroll", invalidateMask, { passive: true });
    window.addEventListener("pointermove", movePointer, { passive: true });
    window.addEventListener("blur", leavePointer);
    document.documentElement.addEventListener("pointerleave", leavePointer);
    window.addEventListener("resize", resize); window.addEventListener("pointerdown", pointer); window.addEventListener("keydown", key);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", movePointer); window.removeEventListener("blur", leavePointer); document.documentElement.removeEventListener("pointerleave", leavePointer); window.removeEventListener("scroll", invalidateMask); window.removeEventListener("resize", resize); window.removeEventListener("pointerdown", pointer); window.removeEventListener("keydown", key); };
  }, [small]);

  return <>
    <div className={`pond${small ? " pond-small" : ""}`} aria-hidden="true"><canvas ref={canvasRef} /><div className="pond-vignette" /></div>
    <div className="pond-controls">
      <button className="pond-secret" aria-label="Call a visitor to the pond" aria-pressed={visitor} title="Something in the water" onClick={() => setVisitor(value => !value)}>~ &gt;&lt; ~</button>
    </div>
    {visitor && <div className="ascii-ponyo" aria-hidden="true">
      <pre><span>{"   .wwwww.   \n  w( o o )w  \n   \\  v  /   \n"}</span>{"  /SSSSSSS\\  \n / SSSSSSS \\ \n   SSSSSSS   \n"}<span>{"   /     \\   "}</span></pre>
    </div>}
    <span className="sr-only" role="status">{visitor ? "Ponyo is visiting. Press Escape to send her home." : ""}</span>
  </>;
}
