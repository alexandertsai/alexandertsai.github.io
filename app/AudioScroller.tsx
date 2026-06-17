'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Length of each fade. The handoff is fade-out then fade-in, so a track change
// spans roughly twice this. Kept long for a gentle, subtle transition.
const FADE_MS = 2500;
// Ceiling for playback volume (0–1). Kept below 1 so the music sits gently
// under the reading rather than blasting.
const MAX_VOLUME = 0.35;
// Where the "reading line" sits as a fraction of viewport height.
// Mobile readers keep their eyes higher up; desktop a touch lower.
const MOBILE_TRIGGER = 0.33;
const DESKTOP_TRIGGER = 0.5;
const MOBILE_MAX_WIDTH = 768;

type Track = {
  token: string;
  el: HTMLAudioElement;
  marker: HTMLElement;
};

export default function AudioScroller() {
  const [controlNode, setControlNode] = useState<HTMLElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  const tracksRef = useRef<Track[]>([]);
  const activeRef = useRef<Track | null>(null);
  const primedRef = useRef(false);
  const fadeRef = useRef<Map<HTMLAudioElement, number>>(new Map());

  // --- Discover markers in the rendered post and build an <audio> per track ---
  useEffect(() => {
    const markers = Array.from(
      document.querySelectorAll<HTMLElement>('[data-audio-marker]')
    );
    if (markers.length === 0) return;

    const tracks: Track[] = markers.map((marker) => {
      const token = marker.dataset.audioMarker as string;
      const el = new Audio(`/audio/${token}.mp3`);
      el.loop = true; // keep playing while the reader lingers in a section
      el.preload = 'auto';
      el.volume = 0;
      return { token, el, marker };
    });

    tracksRef.current = tracks;
    setControlNode(document.querySelector<HTMLElement>('[data-audio-control]'));

    const fades = fadeRef.current;
    return () => {
      fades.forEach((id) => cancelAnimationFrame(id));
      fades.clear();
      tracks.forEach((t) => t.el.pause());
    };
  }, []);

  // --- Volume fading helpers ---
  const cancelFade = (el: HTMLAudioElement) => {
    const id = fadeRef.current.get(el);
    if (id !== undefined) {
      cancelAnimationFrame(id);
      fadeRef.current.delete(el);
    }
  };

  const fade = (
    el: HTMLAudioElement,
    to: number,
    ms: number,
    onDone?: () => void
  ) => {
    cancelFade(el);
    const from = el.volume;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // Ease in/out so the fade feels gentle at both ends.
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      el.volume = Math.max(0, Math.min(1, from + (to - from) * eased));
      if (t < 1) {
        fadeRef.current.set(el, requestAnimationFrame(step));
      } else {
        fadeRef.current.delete(el);
        onDone?.();
      }
    };
    fadeRef.current.set(el, requestAnimationFrame(step));
  };

  // --- Switch the active track: fade the old one out, THEN fade the new in ---
  const switchTo = (next: Track | null) => {
    const current = activeRef.current;
    if (current === next) return;
    activeRef.current = next;

    if (current) {
      fade(current.el, 0, FADE_MS, () => current.el.pause());
    }

    if (next) {
      const begin = () => {
        if (activeRef.current !== next) return; // reader moved on mid-fade
        next.el.volume = 0;
        // Resumes from wherever it was paused (currentTime is preserved).
        const p = next.el.play();
        if (p) p.catch(() => {});
        fade(next.el, MAX_VOLUME, FADE_MS);
      };
      // Wait out the fade-out for a clean "fade out then in" handoff.
      if (current) window.setTimeout(begin, FADE_MS);
      else begin();
    }
  };

  // --- Which section is the reader currently in? ---
  const computeActive = (): Track | null => {
    const tracks = tracksRef.current;
    if (tracks.length === 0) return null;

    // Silence once the whole post has scrolled above the viewport.
    const article = tracks[0].marker.closest('article');
    if (article && article.getBoundingClientRect().bottom < 0) return null;

    const line =
      window.innerHeight *
      (window.innerWidth < MOBILE_MAX_WIDTH ? MOBILE_TRIGGER : DESKTOP_TRIGGER);

    let active: Track | null = null;
    for (const t of tracks) {
      if (t.marker.getBoundingClientRect().top <= line) {
        active = t; // last marker above the reading line wins
      }
    }
    return active;
  };

  // --- React to scrolling while audio is enabled ---
  useEffect(() => {
    if (!enabled) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        switchTo(computeActive());
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const enable = () => {
    // The click is the user gesture browsers require before audio can play.
    // Prime every non-active track within it so later scroll-triggered
    // playback is allowed without another tap (notably on iOS Safari).
    if (!primedRef.current) {
      primedRef.current = true;
      const active = computeActive();
      tracksRef.current.forEach((t) => {
        if (t === active) return;
        t.el.muted = true;
        const p = t.el.play();
        if (p) {
          p.then(() => {
            t.el.pause();
            t.el.currentTime = 0;
            t.el.muted = false;
          }).catch(() => {
            t.el.muted = false;
          });
        }
      });
    }
    activeRef.current = null;
    setEnabled(true);
    switchTo(computeActive());
  };

  const disable = () => {
    setEnabled(false);
    const current = activeRef.current;
    activeRef.current = null;
    if (current) fade(current.el, 0, FADE_MS, () => current.el.pause());
  };

  if (!controlNode) return null;

  return createPortal(
    <div className="mb-4">
      <button
        onClick={enabled ? disable : enable}
        className="group inline-flex items-center gap-1.5 text-[13px] tracking-[0.04em] text-black [font-family:inherit]"
      >
        <span
          className={`inline-block transition-all duration-300 group-hover:-translate-x-[3px] group-hover:opacity-100 ${
            enabled ? '-translate-x-[3px] opacity-100' : 'opacity-50'
          }`}
        >
          [
        </span>
        <span>{enabled ? 'stop sound' : 'play sound'}</span>
        <span
          className={`inline-block transition-all duration-300 group-hover:translate-x-[3px] group-hover:opacity-100 ${
            enabled ? 'translate-x-[3px] opacity-100' : 'opacity-50'
          }`}
        >
          ]
        </span>
      </button>
    </div>,
    controlNode
  );
}
