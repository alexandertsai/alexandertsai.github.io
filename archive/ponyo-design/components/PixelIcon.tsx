// 8×8 bitmap icons drawn with crisp SVG squares.
const icons: Record<string, string[]> = {
  mail: ["........", "########", "##....##", "#.#..#.#", "#..##..#", "#......#", "########", "........"],
  github: [".#....#.", ".##..##.", ".######.", "##.##.##", "########", ".######.", "..#..#..", "........"],
  doc: [".#####..", ".#...##.", ".#....#.", ".#.##.#.", ".#....#.", ".#.##.#.", ".#....#.", ".######."],
  linkedin: ["########", "#.######", "########", "#.#..###", "#.#.#.##", "#.#.#.##", "#.#.#.##", "########"],
  download: ["...##...", "...##...", "...##...", ".######.", "..####..", "...##...", "........", "########"],
  ham: ["....###.", "...#####", "..######", ".#######", "..#####.", ".#.###..", "##......", ".#......"],
};

export default function PixelIcon({ name, className = "" }: { name: keyof typeof icons; className?: string }) {
  const rows = icons[name];
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} className={className} shapeRendering="crispEdges" aria-hidden focusable="false">
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) => (cell === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)),
      )}
    </svg>
  );
}
