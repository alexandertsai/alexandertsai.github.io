import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Alexander Tsai",
  description: "Notes and writing by Alexander Tsai.",
};

export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
