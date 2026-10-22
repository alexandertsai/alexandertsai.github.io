"use client";

import { useEffect, useState } from "react";

// The cursor after the name blinks "PONYO" in Morse code, like Sosuke's signal lamp.
const MESSAGE = ".--. --- -. -.-- ---";
const UNIT = 160;

function timeline() {
  const steps: [boolean, number][] = [];
  for (const symbol of MESSAGE) {
    if (symbol === " ") steps.push([false, 2]);
    else steps.push([true, symbol === "." ? 1 : 3], [false, 1]);
  }
  steps.push([false, 8]);
  return steps;
}

export default function MorseCursor({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const steps = timeline();
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      const [lit, units] = steps[index];
      setOn(lit);
      index = (index + 1) % steps.length;
      timer = setTimeout(next, units * UNIT);
    };
    next();
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className={className} style={{ opacity: on ? 1 : 0.15 }} title="... that's Morse code" aria-hidden>
      _
    </span>
  );
}
