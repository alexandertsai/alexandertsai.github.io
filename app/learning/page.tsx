import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import LearningGarden from "./LearningGarden";
import "./garden.css";

const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Learning | Alexander Tsai",
  description: "What I am learning, drawn as a garden of concepts.",
};

export default function Learning() {
  const store = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/learning/garden.json"), "utf8"));
  return <LearningGarden store={store} className={plexMono.variable} />;
}
