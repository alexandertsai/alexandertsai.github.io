import Image from "next/image";
import "./ponyo-kit.css";

function WaveLayer({ depth }: { depth: "middle" | "front" }) {
  return (
    <div className={`fish-waves-layer fish-waves-layer-${depth}`}>
      <div className="fish-waves-track">
        {Array.from({ length: 8 }, (_, index) => (
          <Image key={index} src="/art/ponyo/wave-layer-pixel.webp" alt="" width={1536} height={512} className="fish-waves-tile" />
        ))}
      </div>
    </div>
  );
}

export default function FishWaves() {
  return (
    <footer className="fish-waves" aria-label="Ocean illustration">
      <div className="fish-waves-stage" aria-hidden>
        <Image src="/art/ponyo/ocean-still-pixel.webp" alt="" width={2048} height={683} className="fish-waves-art" />
        <WaveLayer depth="middle" />
        <div className="fish-waves-boat">
          <Image src="/art/ponyo/boat-pixel.webp" alt="" width={384} height={256} />
        </div>
        <WaveLayer depth="front" />
        <div data-ponyo-perch="divider" className="fish-waves-surface" />
      </div>
    </footer>
  );
}
