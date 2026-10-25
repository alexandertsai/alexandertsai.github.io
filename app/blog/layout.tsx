import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import KoiPond from "../(about)/KoiPond";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog | Alexander Tsai",
  description: "Writing by Alexander Tsai.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="professional-blog">
      <KoiPond small />
      {process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_URL && (
        <link rel="stylesheet" href={process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_URL} />
      )}
      <SiteHeader />
      {children}
      <footer className="site-footer site-width" data-pond-text><span>Alexander Tsai</span><a href="mailto:alexyrtsai@gmail.com">Get in touch ↗</a></footer>
    </div>
  );
}
