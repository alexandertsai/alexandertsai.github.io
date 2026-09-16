import { getAllPosts } from "@/lib/posts";
import Image from "next/image";
import Link from "next/link";
import AudioScroller from "./AudioScroller";

export default async function Personal() {
  const posts = await getAllPosts();

  return (
    <div className="min-h-screen bg-white">
      <AudioScroller />
      <div className="relative h-[308px] w-full bg-gradient-to-br from-blue-200 via-blue-100 to-orange-100">
        <Image src="/_content/personal/assets/cover.webp" alt="Cover" fill className="object-cover" priority />
      </div>

      <div className="relative mx-auto max-w-[540px] px-4">
        <div className="relative -mt-16 mb-6 text-center">
          <div className="relative mx-auto mb-4 h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-gray-300">
            <Image src="/_content/personal/assets/profile.webp" alt="Alexander Tsai" fill className="object-cover" />
          </div>

          <h1 className="mb-1 text-[26px] font-bold text-black">蔡毅睿</h1>
          <p className="text-sm text-gray-600">@yihrae</p>
          <Link
            href="/"
            className="mt-3 inline-block text-[13px] text-gray-500 underline decoration-gray-300 underline-offset-4 transition-colors hover:text-black"
          >
            About me
          </Link>
        </div>

        <main className="pb-8">
          {posts.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-500">No posts yet.</p>
            </div>
          ) : (
            posts.map((post, index) => (
              <article
                key={post.slug}
                className="animate-pop-in mb-6 rounded-lg border border-gray-200 p-5"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {post.title && (
                  <h2 className="mb-3 text-[28px] font-bold leading-tight text-black">{post.title}</h2>
                )}

                <div
                  className="text-[15px] leading-relaxed text-black [&_a]:text-[#00539f] [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-700 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_em]:italic [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-black [&_img]:mx-auto [&_img]:my-4 [&_img]:block [&_img]:max-w-full [&_img]:rounded-lg [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:ml-5 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:mb-4 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:border [&_pre]:border-gray-200 [&_pre]:bg-gray-50 [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-bold [&_ul]:mb-4 [&_ul]:ml-5 [&_ul]:list-disc"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />

                <div className="mt-4 text-right text-xs text-gray-400 opacity-50">{post.date}</div>
              </article>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
