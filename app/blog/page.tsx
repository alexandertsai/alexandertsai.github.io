import { getBlogPosts } from "@/lib/blog";
import BlogReader from "./BlogReader";

export default function Blog() {
  const posts = getBlogPosts();
  if (posts.length === 0) return <p>No posts yet.</p>;
  return <BlogReader slug={posts[0].slug} />;
}
