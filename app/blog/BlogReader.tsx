import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBlogDate, getBlogPost, getBlogPosts } from "@/lib/blog";

export default async function BlogReader({ slug }: { slug: string }) {
  const posts = getBlogPosts();
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <div className="blog-reader">
      {/* TODO: replace this mobile menu with something better, e.g. a /blog/ index page and a back link on posts. */}
      <nav className="blog-menu" aria-label="Posts menu">
        <details key={slug}>
          <summary>
            <span className="blog-menu-text">
              <span className="blog-menu-label">Articles · {posts.length}</span>
              <span className="blog-menu-current">{post.title}</span>
            </span>
            <span className="blog-menu-icon" aria-hidden="true"><span /><span /><span /></span>
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
        <span className="blog-menu-progress" aria-hidden="true" />
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
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: post.html }} />
      </article></main>
    </div>
  );
}
