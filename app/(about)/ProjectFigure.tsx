export default function ProjectFigure({ href }: { href: string }) {
  const index = href.endsWith("/stella") ? 3 : href.includes("/cs180/") ? 0 : 2;
  const points = Array.from({ length: index >= 2 ? 48 : 64 }, (_, i) => {
    if (index === 3) {
      const stage = Math.floor(i / 16), mark = i % 16;
      if (stage === 0) return { x: 10 + mark % 4 * 6, y: 35 + Math.floor(mark / 4) * 8, r: 2.2, warm: mark % 5 === 0 };
      if (stage === 1) return { x: 62 + mark % 4 * 6, y: 35 + Math.floor(mark / 4) * 8, r: mark % 5 === 0 ? 3 : 1.8, warm: mark % 5 === 0 };
      const cursor = [[0, 0], [0, 6], [0, 12], [0, 18], [0, 24], [5, 4], [5, 10], [5, 16], [5, 22], [10, 8], [10, 14], [10, 20], [15, 12], [15, 18], [10, 26], [14, 31]][mark];
      return { x: 116 + cursor[0], y: 32 + cursor[1], r: 2.3, warm: mark > 13 };
    }
    if (index === 0) {
      const ring = Math.floor(i / 16), angle = i % 16 / 16 * Math.PI * 2;
      return { x: 70 + Math.cos(angle) * (12 + ring * 11), y: 50 + Math.sin(angle) * (10 + ring * 8), r: 2.4 + Math.sin(i * 3) * .7, warm: i % 7 < 2 };
    }
    const node = Math.floor(i / 16), angle = i * 2.4, spread = Math.sqrt(i % 16) * 3.8;
    return { x: [30, 78, 115][node] + Math.cos(angle) * spread, y: [69, 27, 67][node] + Math.sin(angle) * spread, r: 2.7, warm: node === 1 };
  });
  return <svg className="home-project-figure" viewBox="0 0 145 100" aria-hidden="true" focusable="false">
    {index === 3 && <path d="M35 48h18m-4-4 4 4-4 4m38-4h20m-4-4 4 4-4 4M125 72v10H19V72" fill="none" stroke="#587b7d" strokeOpacity=".4" strokeWidth=".7" />}
    {index === 2 && <path d="m30 69 48-42 37 40Z" fill="none" stroke="#587b7d" strokeOpacity=".4" strokeWidth=".7" />}
    {index === 0 && <path d="M13 50h119M70 6v88" stroke="#587b7d" strokeOpacity=".22" strokeWidth=".6" />}
    {points.map((point, i) => <ellipse key={i} cx={point.x} cy={point.y} rx={point.r} ry={point.r * .83}
      transform={`rotate(${i * 37} ${point.x} ${point.y})`} fill={point.warm ? "#c75b37" : i % 3 ? "#537f83" : "#b59046"} opacity={.5 + i % 4 * .14} />)}
  </svg>;
}
