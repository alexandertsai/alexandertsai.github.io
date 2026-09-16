import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBlogDate, getBlogPost, getBlogPosts } from "@/lib/blog";

export default async function BlogReader({ slug }: { slug: string }) {
  const posts = getBlogPosts();
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <div className="blog-reader">
      <nav className="blog-sidebar" aria-label="Posts">
        <ul>
          {posts.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={`/blog/${entry.slug}/`}
                scroll={false}
                aria-current={entry.slug === slug ? "page" : undefined}
              >
                <span>{entry.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="blog-article"><article>
        <h2>{post.title}</h2>
        <div className="blog-post-meta">
          <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
        </div>
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.html }} />
      </article></main>
    </div>
  );
}
