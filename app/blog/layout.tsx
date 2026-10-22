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
      <header className="blog-header site-width" data-pond-text>
        <p className="blog-eyebrow">Alexander Tsai / Writing</p>
        <h1>Writing<span>.</span></h1>
      </header>
      {children}
      <footer className="site-footer site-width" data-pond-text><span>Alexander Tsai</span><a href="mailto:alexyrtsai@gmail.com">Get in touch ↗</a></footer>
    </div>
  );
}
