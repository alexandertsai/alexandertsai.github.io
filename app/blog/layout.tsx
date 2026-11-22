import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog | Alexander Tsai",
  description: "Writing by Alexander Tsai.",
  openGraph: {
    title: "Blog | Alexander Tsai",
    description: "Writing by Alexander Tsai.",
    url: "/blog/",
    siteName: "Alexander Tsai",
    type: "website",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | Alexander Tsai",
    description: "Writing by Alexander Tsai.",
    images: ["/opengraph-image.png"],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="professional-blog">
      {process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_URL && (
        <link rel="stylesheet" href={process.env.NEXT_PUBLIC_ADOBE_FONTS_KIT_URL} />
      )}
      <SiteHeader />
      {children}
      <footer className="site-footer site-width" data-pond-text><a href="mailto:alexyrtsai@gmail.com">Get in touch ↗</a></footer>
    </div>
  );
}
