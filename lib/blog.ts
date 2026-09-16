import content from "@/.generated/content.json";

export function getBlogPosts() {
  return content.posts.filter((post) => post.section === "blog");
}

export async function getBlogPost(slug: string) {
  return getBlogPosts().find((post) => post.slug === slug);
}

export function formatBlogDate(date: string) {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
  return formatted.replace(/ (\d{4})$/, ", $1");
}
