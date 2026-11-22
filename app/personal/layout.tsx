import "./personal.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personal | Alexander Tsai",
  description: "Personal notes and writing by Alexander Tsai.",
  openGraph: {
    title: "Personal | Alexander Tsai",
    description: "Personal notes and writing by Alexander Tsai.",
    url: "/personal/",
    siteName: "Alexander Tsai",
    type: "website",
    images: ["/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Personal | Alexander Tsai",
    description: "Personal notes and writing by Alexander Tsai.",
    images: ["/opengraph-image.png"],
  },
};

export default function PersonalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
