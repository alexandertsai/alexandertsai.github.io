import type { Metadata } from "next";
import Image from "next/image";
import "./blog.css";

export const metadata: Metadata = {
  title: "Blog | Alexander Tsai",
  description: "Writing on internships, teaching, and technical projects by Alexander Tsai.",
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="professional-blog">
      <div className="blog-banner" />
      <header className="blog-header">
        <Image src="/_content/blog/assets/profile.jpg" alt="Alexander Tsai" className="blog-profile" width={120} height={120} priority />
        <h1>Alexander Tsai</h1>
        <p>My website where I post writings and other projects!</p>
      </header>
      {children}
    </div>
  );
}
