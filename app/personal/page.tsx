import { getAllPosts } from "@/lib/posts";
import Image from "next/image";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import AudioScroller from "./AudioScroller";

export default async function Personal() {
  const posts = await getAllPosts();

  return (
    <div className="personal-journal min-h-screen bg-[#080a09]">
      <SiteHeader />
      <AudioScroller />
      <div className="relative h-[308px] w-full bg-gradient-to-br from-blue-200 via-blue-100 to-orange-100">
        <Image src="/_content/personal/assets/cover.webp" alt="Cover" fill className="object-cover" priority />
      </div>

      <div className="relative mx-auto max-w-[540px] px-4">
        <div className="relative -mt-16 mb-6 text-center">
          <div className="relative mx-auto mb-4 h-32 w-32 overflow-hidden rounded-full border-4 border-[#080a09] bg-gray-300">
            <Image src="/_content/personal/assets/profile.webp" alt="Alexander Tsai" fill className="object-cover" />
          </div>

          <h1 className="mb-1 text-[26px] font-bold text-[#e6e5df]">蔡毅睿</h1>
          <p className="text-sm text-[#a5aa9c]">@yihrae</p>
          <Link
            href="/"
            className="mt-3 inline-block text-[13px] text-[#a5aa9c] underline decoration-[#555d4d] underline-offset-4 transition-colors hover:text-white"
          >
            About me
          </Link>
        </div>

        <main className="pb-8">
          {posts.length === 0 ? (
            <div className="rounded-lg border border-[#ffffff18] bg-[#0e110e] p-8 text-center">
              <p className="text-[#a5aa9c]">No posts yet.</p>
            </div>
          ) : (
            posts.map((post, index) => (
              <article
                key={post.slug}
                className="animate-pop-in mb-6 rounded-lg border border-[#ffffff18] p-5"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {post.title && (
                  <h2 className="mb-3 text-[28px] font-bold leading-tight text-[#e6e5df]">{post.title}</h2>
                )}

                <div
                  className="text-[15px] leading-relaxed text-[#e6e5df] [&_a]:text-[#c98468] [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#555d4d] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#a5aa9c] [&_code]:rounded [&_code]:bg-[#ffffff0a] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_em]:italic [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#e6e5df] [&_img]:mx-auto [&_img]:my-4 [&_img]:block [&_img]:max-w-full [&_img]:rounded-lg [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:ml-5 [&_ol]:list-decimal [&_p:last-child]:mb-0 [&_p]:mb-4 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:border [&_pre]:border-[#ffffff18] [&_pre]:bg-[#ffffff0a] [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-bold [&_ul]:mb-4 [&_ul]:ml-5 [&_ul]:list-disc"
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
