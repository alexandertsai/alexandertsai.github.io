"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Ponyo from "./Ponyo";
import "./ponyo-kit.css";

const GREETING = (
  <>
    Thanks for visiting my site! If you&apos;d like to chat, reach out at{" "}
    <a href="mailto:alexyrtsai@gmail.com">alexyrtsai@gmail.com</a>. I&apos;d love to hear from you.
  </>
);

export default function GrowingPonyo({ left, top }: { left: number; top: number }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [released, setReleased] = useState(false);

  useEffect(() => {
    if (released || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let elapsed = 0;
    const timer = setInterval(() => {
      if (!document.hidden) elapsed += 1;
      if (elapsed >= 14) setReleased(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [released]);

  return (
    <>
      <div ref={anchorRef} className="growing-ponyo" style={{ left: `${left * 100}%`, top: `${top * 100}%` }}>
        {!released && (
          <button type="button" className="growing-ponyo-sprite" aria-label="Play with Ponyo" title="Play with Ponyo" onClick={() => setReleased(true)}>
            <Image src="/art/ponyo/goldfish-pixel.webp" alt="" width={192} height={192} priority />
          </button>
        )}
      </div>
      {released && createPortal(<Ponyo originRef={anchorRef} leapFromOrigin greeting={GREETING} />, document.body)}
    </>
  );
}
