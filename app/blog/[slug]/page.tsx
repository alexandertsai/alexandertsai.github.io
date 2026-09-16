import type { Metadata } from "next";
import BlogReader from "../BlogReader";
import { notFound } from "next/navigation";
import { getBlogPosts } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getBlogPosts().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPosts().find((post) => post.slug === slug);
  if (!post) notFound();
  return { title: `${post.title} | Alexander Tsai`, description: post.preview };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  return <BlogReader slug={slug} />;
}
