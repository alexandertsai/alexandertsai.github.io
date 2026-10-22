import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./components/site.css";
import "../public/typography.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://alexandertsai.github.io"),
  title: "Alexander Tsai",
  description:
    "Machine learning engineer and aspiring AI researcher working on image forensics, multimodal models and interpretability.",
  openGraph: {
    title: "Alexander Tsai",
    description: "Machine learning engineer and aspiring AI researcher.",
    url: "/",
    siteName: "Alexander Tsai",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Alexander Tsai" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} font-mono antialiased`}>
        {children}
      </body>
    </html>
  );
}
