import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBlogDate, getBlogPost, getBlogPosts } from "@/lib/blog";
import BlogContent from "./BlogContent";
import { LAYOUT_QUERIES, type Layouts } from "./layouts";

export default async function BlogReader({ slug }: { slug: string }) {
  const posts = getBlogPosts();
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <div className="blog-reader">
      <nav className="blog-menu" aria-label="Posts menu">
        <details key={slug}>
          <summary>
            <span className="blog-menu-label">Browse articles<span className="blog-menu-count">{posts.length}</span></span>
            <svg className="blog-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <ul className="blog-menu-panel">
            {posts.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/blog/${entry.slug}/`} aria-current={entry.slug === slug ? "page" : undefined}>
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </nav>
      <nav className="blog-sidebar" aria-label="Posts">
        <p className="blog-sidebar-label">Articles</p>
        <ul data-pond-text>
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
      <main className="blog-article" data-pond-text><article>
        <h1>{post.title}</h1>
        <div className="blog-post-meta">
          <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          <span aria-hidden="true"> · </span>
          <span>Approx. {post.readingMinutes} min read</span>
        </div>
        {LAYOUT_QUERIES.map(([name, query]) => <link key={name} rel="preload" as="fetch" href={(post.layouts as Layouts)[name]} media={query} crossOrigin="anonymous" fetchPriority="high" />)}
        <BlogContent layouts={post.layouts as Layouts} others={posts.filter((entry) => entry.slug !== slug).map((entry) => entry.layouts as Layouts)} />
      </article></main>
    </div>
  );
}
