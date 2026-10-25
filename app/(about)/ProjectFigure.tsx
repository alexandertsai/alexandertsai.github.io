export default function ProjectFigure({ index }: { index: number }) {
  const points = Array.from({ length: index === 2 ? 48 : 64 }, (_, i) => {
    if (index === 0) {
      const ring = Math.floor(i / 16), angle = i % 16 / 16 * Math.PI * 2;
      return { x: 70 + Math.cos(angle) * (12 + ring * 11), y: 50 + Math.sin(angle) * (10 + ring * 8), r: 2.4 + Math.sin(i * 3) * .7, warm: i % 7 < 2 };
    }
    if (index === 1) return { x: 32 + i % 8 * 10.7, y: 14 + Math.floor(i / 8) * 10.7, r: Math.abs(i % 8 - Math.floor(i / 8)) < 2 ? 3.5 : 2.1, warm: (i % 8 + Math.floor(i / 8)) % 7 === 0 };
    const node = Math.floor(i / 16), angle = i * 2.4, spread = Math.sqrt(i % 16) * 3.8;
    return { x: [30, 78, 115][node] + Math.cos(angle) * spread, y: [69, 27, 67][node] + Math.sin(angle) * spread, r: 2.7, warm: node === 1 };
  });
  return <svg className="home-project-figure" viewBox="0 0 145 100" aria-hidden="true" focusable="false">
    {index === 2 && <path d="m30 69 48-42 37 40Z" fill="none" stroke="#587b7d" strokeOpacity=".4" strokeWidth=".7" />}
    {index === 0 && <path d="M13 50h119M70 6v88" stroke="#587b7d" strokeOpacity=".22" strokeWidth=".6" />}
    {points.map((point, i) => <ellipse key={i} cx={point.x} cy={point.y} rx={point.r} ry={point.r * .83}
      transform={`rotate(${i * 37} ${point.x} ${point.y})`} fill={point.warm ? "#c75b37" : i % 3 ? "#537f83" : "#b59046"} opacity={.5 + i % 4 * .14} />)}
  </svg>;
}
