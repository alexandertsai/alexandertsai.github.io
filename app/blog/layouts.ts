export type Layouts = { small: string; medium: string; large: string };

export const LAYOUT_QUERIES = [
  ["small", "(max-width: 567px)"],
  ["medium", "(min-width: 568px) and (max-width: 727px)"],
  ["large", "(min-width: 728px)"],
] as const;
