import content from "@/.generated/content.json";

export async function getAllPosts() {
  return content.posts
    .filter((post) => post.section === "personal")
    .map((post) => ({ ...post, content: post.html }));
}
