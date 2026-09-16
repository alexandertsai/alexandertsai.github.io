import "./personal.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personal | Alexander Tsai",
  description: "Personal notes and writing by Alexander Tsai.",
};

export default function PersonalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
