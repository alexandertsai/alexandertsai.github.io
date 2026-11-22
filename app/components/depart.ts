export const DEPART_EVENT = "site:depart";
export const DEPART_MS = 950;

const OVERLAY_ID = "site-depart";

// The page text dissolves and the koi pond's fish flee; once the water is empty it fades to black.
export function depart() {
  document.getElementById(OVERLAY_ID)?.remove();
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("aria-hidden", "true");
  document.body.append(overlay);
  for (const element of document.querySelectorAll<HTMLElement>("main.home > :not(.pond), .professional-blog > *")) {
    element.animate([
      { opacity: 1, filter: "blur(0)", transform: "translateY(0)" },
      { opacity: 0, filter: "blur(2px)", transform: "translateY(-6px)" },
    ], { duration: 380, easing: "ease-out", fill: "forwards" });
  }
  window.dispatchEvent(new Event(DEPART_EVENT));
  window.setTimeout(endDeparture, 5000);
}

export function endDeparture() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay || overlay.dataset.ending) return;
  overlay.dataset.ending = "1";
  overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: "ease-out", fill: "forwards" }).finished.then(() => overlay.remove(), () => overlay.remove());
}

export const RETURN_MS = 700;
const RETURN_ID = "site-return";
let returning = false;

// Leaving Learning: the garden rushes toward the viewer as darkness closes in from the edges.
export function returnHome() {
  document.getElementById(RETURN_ID)?.remove();
  const overlay = document.createElement("div");
  overlay.id = RETURN_ID;
  overlay.setAttribute("aria-hidden", "true");
  document.body.append(overlay);
  overlay.animate([{ "--return-hole": "80vmax" }, { "--return-hole": "0vmax" }], { duration: RETURN_MS, easing: "cubic-bezier(.5, 0, .75, .3)", fill: "forwards" });
  document.querySelector<HTMLElement>(".learning")?.animate([
    { transform: "scale(1)", filter: "blur(0)" },
    { transform: "scale(2.8)", filter: "blur(8px)" },
  ], { duration: RETURN_MS, easing: "cubic-bezier(.55, 0, .85, .35)", fill: "forwards" });
  returning = true;
  window.setTimeout(() => { returning = false; document.getElementById(RETURN_ID)?.remove(); }, RETURN_MS + 5000);
}

export function isReturning() {
  return returning;
}

// Arriving home: the darkness opens back out from the centre while the page settles into place.
export function openReturn() {
  const overlay = document.getElementById(RETURN_ID);
  if (!overlay || overlay.dataset.opening) return;
  overlay.dataset.opening = "1";
  overlay.getAnimations().forEach((animation) => animation.cancel());
  for (const element of document.querySelectorAll<HTMLElement>("main.home > :not(.pond)")) {
    element.animate([{ transform: "scale(.96)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 850, easing: "cubic-bezier(.2, .7, .2, 1)" });
  }
  overlay.animate([{ "--return-hole": "0vmax" }, { "--return-hole": "80vmax" }], { duration: 1000, easing: "cubic-bezier(.3, .6, .3, 1)", fill: "forwards" })
    .finished.then(() => { returning = false; overlay.remove(); }, () => overlay.remove());
}
