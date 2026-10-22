import Image from "next/image";
import GrowingPonyo from "./GrowingPonyo";

export default function BucketHero() {
  return (
    <div className="bucket-hero">
      <Image src="/art/ponyo/bucket-pixel.webp" alt="Sosuke's green bucket" width={256} height={256} priority />
      <span className="bucket-rim" data-ponyo-perch="divider" aria-hidden />
      <GrowingPonyo left={0.5} top={0.5} />
    </div>
  );
}
