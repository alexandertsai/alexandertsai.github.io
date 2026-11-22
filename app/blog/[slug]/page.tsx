import type { Metadata } from "next";
import BlogReader from "../BlogReader";
import { notFound } from "next/navigation";
import { getBlogPosts } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  const posts = getBlogPosts().map(({ slug }) => ({ slug }));
  // Static export requires a parameter even when every post is archived.
  return posts.length ? posts : [{ slug: "__empty__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPosts().find((post) => post.slug === slug);
  if (!post) notFound();
  const title = `${post.title} | Alexander Tsai`;
  const description = post.preview || "Writing by Alexander Tsai.";
  return {
    title,
    description,
    openGraph: {
      title: post.title,
      description,
      url: `/blog/${slug}/`,
      siteName: "Alexander Tsai",
      type: "article",
      publishedTime: post.date,
      images: ["/opengraph-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: ["/opengraph-image.png"],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  return <BlogReader slug={slug} />;
}
