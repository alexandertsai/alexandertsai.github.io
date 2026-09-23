"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import "./ponyo.css";
import { chooseGreetingPerch, isSurfaceVisible, measureSurfaces, resolvePerch, type Perch, type Point, type Surface } from "./ponyo-surfaces";

const animations = {
  idle: { row: 0, frames: 6 },
  right: { row: 1, frames: 8 },
  left: { row: 2, frames: 8 },
  wave: { row: 3, frames: 4 },
  jump: { row: 4, frames: 5 },
} as const;

type Animation = keyof typeof animations;

export default function Ponyo({ originRef }: { originRef: RefObject<HTMLDivElement | null> }) {
  const petRef = useRef<HTMLButtonElement>(null);
  const greetingRef = useRef<HTMLDivElement>(null);
  const greetingUntil = useRef<number | null>(null);
  const spriteRef = useRef<HTMLSpanElement>(null);
  const restingRef = useRef<Perch | null>(null);
  const enteredRef = useRef(false);
  const interaction = useRef({ hovered: false, focused: false, jump: false });
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stopped = paused || reducedMotion;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const pet = petRef.current;
    const sprite = spriteRef.current;
    if (!pet || !sprite) return;

    type Flight = { from: Point; to: Perch; start: number; duration: number; arc: number; entrance?: boolean };
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-ponyo-perch]"));
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
    let surfaces: Surface[] = [];
    let width = pet.offsetWidth;
    let height = parseFloat(getComputedStyle(pet).height);
    let dirty = true;
    let point: Point = { x: 0, y: 0 };
    let perch: Perch | null = restingRef.current;
    let flight: Flight | null = null;
    let walkTarget: number | null = null;
    let paceLegs = 0;
    let paceBounds = [0, 1];
    let visits = 0;
    let state: Animation | "sit" = "idle";
    let elapsed = 0;
    let started = 0;
    let nextAction = 1000;
    let previous = performance.now();
    let request = 0;
    let disposed = false;
    let pointer: Point | null = null;
    let greetingTimer: ReturnType<typeof setTimeout> | undefined;

    const surfaceFor = (spot: Perch | null) => surfaces.find((surface) => surface.id === spot?.id);
    const visible = (surface: Surface) => isSurfaceVisible(surface, window.scrollY, window.innerHeight, height);
    const greetingPerch = () => chooseGreetingPerch(surfaces, window.scrollY, window.innerHeight, height);
    const resolve = (spot: Perch) => {
      const surface = surfaceFor(spot);
      return surface ? resolvePerch(surface, spot) : point;
    };
    const measure = () => {
      width = pet.offsetWidth;
      height = parseFloat(getComputedStyle(pet).height);
      surfaces = measureSurfaces(elements, width);
      dirty = false;
    };
    const change = (value: typeof state) => {
      if (state !== value) {
        state = value;
        started = elapsed;
      }
    };
    const choosePerch = (): Perch | null => {
      const candidates = surfaces.filter(visible);
      const alternatives = candidates.filter((surface) => surface.id !== perch?.id);
      const nearest = (alternatives.length ? alternatives : candidates)
        .sort((a, b) => Math.hypot((a.left + a.right) / 2 - point.x, a.y - point.y) - Math.hypot((b.left + b.right) / 2 - point.x, b.y - point.y))
        .slice(0, 5);
      const chosen = nearest[Math.floor(Math.random() * nearest.length)];
      return chosen ? { id: chosen.id, fraction: 0.2 + Math.random() * 0.6 } : null;
    };
    const draw = () => {
      sprite.dataset.pose = state === "sit" ? "sit" : "stand";
      if (state === "sit") {
        const time = elapsed - started;
        const frame = time < 200 ? 0 : time % 3600 > 3250 ? 2 : time % 5200 > 4200 ? 3 : 1;
        const centers = [296, 291, 252.5, 240];
        const bottoms = [594, 593, 593, 593];
        const spriteWidth = width * 1.15;
        const spriteHeight = spriteWidth * 724 / 543;
        sprite.style.backgroundPosition = `${frame / 3 * 100}% 0`;
        sprite.style.transform = `translate(${(271.5 - centers[frame]) / 543 * spriteWidth}px, ${(724 - bottoms[frame]) / 724 * spriteHeight}px)`;
        return;
      }
      const animation = animations[state];
      const frame = flight
        ? Math.min(4, Math.floor((elapsed - flight.start) / flight.duration * 5))
        : Math.floor((elapsed - started) / 130) % animation.frames;
      const bottoms = state === "left" || state === "right"
        ? [203, 200, 200, 200, 203, 201, 200, 203]
        : state === "jump" ? [203, 202, 203, 202, 203] : [203, 203, 203, 202, 203, 203];
      sprite.style.backgroundPosition = `${frame / 7 * 100}% ${animation.row / 10 * 100}%`;
      sprite.style.transform = `translateY(${(208 - bottoms[frame]) / 208 * height}px)`;
      if (pointer && state === "idle") {
        const dx = pointer.x - point.x;
        const dy = pointer.y - (point.y - window.scrollY - height / 2);
        if (Math.hypot(dx, dy) > 24 && Math.hypot(dx, dy) < 220) {
          const direction = Math.round((Math.atan2(dx, -dy) + Math.PI * 2) / (Math.PI / 8)) % 16;
          sprite.style.backgroundPosition = `${direction % 8 / 7 * 100}% ${(9 + Math.floor(direction / 8)) / 10 * 100}%`;
          sprite.style.transform = `translateY(${(208 - (direction > 0 && direction < 6 ? 202 : 203)) / 208 * height}px)`;
        }
      }
    };
    const position = () => {
      const surface = surfaceFor(perch);
      const emergence = flight?.entrance ? clamp((elapsed - flight.start) / 180, 0, 1) : 1;
      pet.style.visibility = surface || flight ? "visible" : "hidden";
      pet.style.opacity = `${emergence}`;
      pet.style.transformOrigin = "50% 100%";
      pet.style.transform = `translate3d(${point.x - width / 2}px, ${point.y - window.scrollY - height}px, 0) scale(${0.35 + emergence * 0.65})`;
      pet.dataset.motion = flight ? "jump" : state;
      pet.dataset.perch = surface?.label ?? "";
      pet.dataset.surfaceLeft = `${surface?.left ?? 0}`;
      pet.dataset.surfaceRight = `${surface?.right ?? 0}`;
      pet.dataset.surfaceY = `${perch && surface ? resolve(perch).y : 0}`;
      const greeting = greetingRef.current;
      if (greeting) {
        greeting.hidden = greetingUntil.current === null || performance.now() > greetingUntil.current;
        if (!greeting.hidden && greetingTimer === undefined) {
          greetingTimer = setTimeout(() => {
            if (greetingRef.current) greetingRef.current.hidden = true;
          }, Math.max(0, greetingUntil.current! - performance.now()));
        }
        const left = clamp(point.x - greeting.offsetWidth / 2, 12, window.innerWidth - greeting.offsetWidth - 12);
        const top = point.y - window.scrollY - height - greeting.offsetHeight - 3;
        greeting.style.transform = `translate3d(${left}px, ${Math.max(12, top)}px, 0)`;
        greeting.style.setProperty("--tail-left", `${clamp(point.x - left, 16, greeting.offsetWidth - 16)}px`);
      }
      draw();
    };
    const rest = () => {
      walkTarget = null;
      change("sit");
      nextAction = elapsed + 2600 + Math.random() * 2000;
    };
    const pace = () => {
      const surface = surfaceFor(perch);
      if (!surface || !perch || surface.right - surface.left < width * 0.6) {
        rest();
        return;
      }
      paceLegs = 2 + Math.floor(Math.random() * 2);
      const span = Math.min(0.9, width * 2 / (surface.right - surface.left));
      const left = clamp(perch.fraction - span / 2, 0.05, 0.95 - span);
      paceBounds = [left, left + span];
      walkTarget = perch.fraction < left + span / 2 ? paceBounds[1] : paceBounds[0];
      change(walkTarget > perch.fraction ? "right" : "left");
    };
    const land = () => {
      visits++;
      if (visits % 2 === 0) pace();
      else rest();
    };
    const jumpTo = (to: Perch) => {
      const target = resolve(to);
      const distance = Math.hypot(target.x - point.x, target.y - point.y);
      flight = { from: { ...point }, to, start: elapsed, duration: clamp(distance * 1.8, 600, 1300), arc: clamp(distance * 0.2, 28, 90) };
      restingRef.current = to;
      walkTarget = null;
      change("jump");
      started = elapsed;
    };
    const settle = () => {
      if (!surfaceFor(perch)) perch = choosePerch();
      if (perch) {
        point = resolve(perch);
        restingRef.current = perch;
      }
    };
    const invalidate = () => {
      dirty = true;
      if (stopped) {
        measure();
        settle();
        position();
      }
    };
    const track = (event: PointerEvent) => {
      if (event.pointerType === "mouse") pointer = { x: event.clientX, y: event.clientY };
    };
    const leave = () => { pointer = null; };
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 50);
      previous = now;
      elapsed += delta;
      if (dirty) measure();
      const engaged = interaction.current.hovered || interaction.current.focused;
      const destination = surfaceFor(flight ? flight.to : perch);
      if (!destination || !visible(destination)) {
        const greetingActive = flight?.entrance || (greetingUntil.current !== null && performance.now() < greetingUntil.current);
        const next = greetingActive ? greetingPerch() ?? choosePerch() : choosePerch();
        if (next) {
          if (perch || flight) {
            const entrance = flight?.entrance;
            jumpTo(next);
            if (entrance && flight) flight.entrance = true;
          }
          else { perch = next; settle(); rest(); }
        } else {
          flight = null;
          walkTarget = null;
          perch = null;
        }
      }
      if (interaction.current.jump && !(greetingUntil.current && performance.now() < greetingUntil.current)) {
        interaction.current.jump = false;
        const next = choosePerch();
        if (!flight && next) jumpTo(next);
      }
      if (flight) {
        const progress = clamp((elapsed - flight.start) / flight.duration, 0, 1);
        const target = resolve(flight.to);
        point = {
          x: flight.from.x + (target.x - flight.from.x) * progress,
          y: flight.from.y + (target.y - flight.from.y) * progress - 4 * flight.arc * progress * (1 - progress),
        };
        if (progress === 1) {
          const entrance = flight.entrance;
          if (entrance) {
            enteredRef.current = true;
            greetingUntil.current = performance.now() + 15_000;
          }
          perch = flight.to;
          restingRef.current = perch;
          flight = null;
          land();
          if (entrance) {
            change("wave");
            nextAction = elapsed + 15_000;
          }
        }
      } else if (perch) {
        if (engaged || (greetingUntil.current !== null && performance.now() < greetingUntil.current)) {
          walkTarget = null;
          change("wave");
          nextAction = elapsed + 600;
        } else if (walkTarget !== null) {
          const surface = surfaceFor(perch)!;
          const distance = surface.right - surface.left;
          const step = distance > 0 ? delta * 0.033 / distance : 1;
          change(walkTarget > perch.fraction ? "right" : "left");
          perch.fraction += Math.sign(walkTarget - perch.fraction) * Math.min(Math.abs(walkTarget - perch.fraction), step);
          if (Math.abs(walkTarget - perch.fraction) < 0.001) {
            paceLegs--;
            if (paceLegs > 0) walkTarget = walkTarget === paceBounds[0] ? paceBounds[1] : paceBounds[0];
            else rest();
          }
        } else if (elapsed >= nextAction) {
          const next = choosePerch();
          if (next) jumpTo(next);
        }
        point = resolve(perch);
        restingRef.current = perch;
      }
      position();
      request = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(request);
      if (!document.hidden && !stopped) {
        previous = performance.now();
        dirty = true;
        request = requestAnimationFrame(tick);
      }
    };

    measure();
    const origin = originRef.current?.getBoundingClientRect();
    if (!enteredRef.current && origin && !stopped && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const target = greetingPerch() ?? choosePerch();
      if (target) {
        const destination = resolve(target);
        point = { x: destination.x, y: destination.y + height * 0.5 };
        flight = { from: { ...point }, to: target, start: elapsed, duration: 650, arc: 55, entrance: true };
        restingRef.current = target;
        change("jump");
      } else settle();
    } else settle();
    if (stopped) {
      if (!enteredRef.current) {
        perch = greetingPerch() ?? perch;
        settle();
      }
      change("sit");
      if (!enteredRef.current) {
        enteredRef.current = true;
        greetingUntil.current = performance.now() + 15_000;
      }
    }
    position();
    interaction.current.jump = false;
    const observer = new ResizeObserver(invalidate);
    for (const element of elements) observer.observe(element);
    const page = pet.closest("main");
    if (page) observer.observe(page);
    document.fonts.ready.then(() => { if (!disposed) invalidate(); });
    if (!stopped && !document.hidden) request = requestAnimationFrame(tick);
    window.addEventListener("resize", invalidate);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("pointermove", track, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearTimeout(greetingTimer);
      cancelAnimationFrame(request);
      observer.disconnect();
      window.removeEventListener("resize", invalidate);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("pointermove", track);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [stopped, originRef]);

  return (
    <aside className="ponyo-companion" aria-label="Ponyo companion">
      <div ref={greetingRef} className="ponyo-greeting" role="status" hidden>
        thank you for reading! feel free to send an email and say hi.
      </div>
      <button
        ref={petRef}
        type="button"
        className="ponyo-pet"
        aria-label="Play with Ponyo"
        title="Play with Ponyo"
        disabled={stopped}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") interaction.current.hovered = true; }}
        onPointerLeave={() => { interaction.current.hovered = false; }}
        onFocus={(event) => { interaction.current.focused = event.currentTarget.matches(":focus-visible"); }}
        onBlur={() => { interaction.current.focused = false; }}
        onClick={() => { interaction.current.jump = true; }}
      >
        <span ref={spriteRef} className="ponyo-sprite" aria-hidden="true" />
      </button>
      {!reducedMotion && (
        <button className="ponyo-toggle" type="button" onClick={() => setPaused(!paused)}>
          {paused ? "Resume Ponyo" : "Pause Ponyo"}
        </button>
      )}
    </aside>
  );
}
