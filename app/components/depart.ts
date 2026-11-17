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
