"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Ponyo from "./Ponyo";

export default function ProfilePicture({ src, name }: { src: string; name: string }) {
  const pictureRef = useRef<HTMLDivElement>(null);
  const [showPonyo, setShowPonyo] = useState(false);

  useEffect(() => {
    let remaining = 45_000;
    let started = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      started = performance.now();
      timer = setTimeout(() => setShowPonyo(true), remaining);
    };
    const visibility = () => {
      if (document.hidden) {
        clearTimeout(timer);
        remaining = Math.max(0, remaining - (performance.now() - started));
      } else start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <>
      <div
        ref={pictureRef}
        className="profile-picture relative h-28 w-28 shrink-0 rounded-full"
      >
        <span className="profile-picture-image absolute inset-0 overflow-hidden rounded-full bg-gray-100">
          <Image src={src} alt={name} fill className="object-cover" priority draggable={false} />
        </span>
      </div>
      {showPonyo && <Ponyo originRef={pictureRef} />}
    </>
  );
}
