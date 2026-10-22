export default function ContactIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === "linkedin" ? (
        <>
          <rect x="2" y="2" width="20" height="20" rx="1" fill="currentColor" stroke="none" />
          <path d="M6.5 10v8M10.5 18v-8m0 3a3.25 3.25 0 0 1 6.5 0v5" stroke="var(--icon-cutout, white)" strokeWidth="2.2" strokeLinecap="butt" />
          <circle cx="6.5" cy="6.7" r="1.3" fill="var(--icon-cutout, white)" stroke="none" />
        </>
      ) : name === "mail" ? (
        <>
          <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
          <path d="m3.5 6 8.5 7 8.5-7" />
        </>
      ) : name === "github" ? (
        <path stroke="none" fill="currentColor" d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.76-.24.76-.54v-2.1c-3.12.68-3.78-1.33-3.78-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.72.39-1.22.71-1.5-2.49-.28-5.11-1.25-5.11-5.54 0-1.22.43-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15A10.7 10.7 0 0 1 12 6.18c.95 0 1.9.13 2.79.38 2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3.01 0 4.3-2.63 5.25-5.13 5.53.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z" />
      ) : name === "blog" ? (
        <>
          <path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15" />
          <path d="M5 8h3m-3 4h3m8-4h3m-3 4h3" />
        </>
      ) : (
        <>
          <path d="M5 2h9l5 5v15H5Z" />
          <path d="M14 2v6h5M8 12h8m-8 4h8" />
        </>
      )}
    </svg>
  );
}
