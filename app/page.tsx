import { getAllPosts } from '@/lib/posts';
import Image from 'next/image';

export default async function Home() {
  const posts = await getAllPosts();

  return (
    <div className="min-h-screen bg-white">
      {/* Cover Image */}
      <div className="w-full h-[280px] relative bg-gradient-to-br from-blue-200 via-blue-100 to-orange-100">
        <Image
          src="/cover.webp"
          alt="Cover"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Profile Section */}
      <div className="max-w-[540px] mx-auto px-4 relative">
        <div className="relative -mt-16 mb-6 text-center">
          {/* Profile Picture */}
          <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-white mb-4 mx-auto relative overflow-hidden">
            <Image
              src="/profile.webp"
              alt="Profile"
              fill
              className="object-cover"
            />
          </div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-black mb-1">蔡毅睿</h1>
          <p className="text-sm text-gray-600">@yihrae</p>
        </div>

        {/* Posts */}
        <main className="pb-8">
          {posts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-500">No posts yet. Add markdown files to the posts/ directory.</p>
            </div>
          ) : (
            posts.map((post) => (
              <article key={post.slug} className="mb-6 pb-6 border-b border-gray-200 last:border-b-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0 relative overflow-hidden">
                    <Image
                      src="/profile.webp"
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="text-black font-semibold text-sm">yihrae</span>
                </div>

                {post.title && (
                  <h2 className="text-[28px] font-bold mb-3 text-black leading-tight">{post.title}</h2>
                )}

                <div
                  className="text-black text-[15px] leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0 [&_h3]:text-black [&_h3]:font-bold [&_h3]:text-base [&_h3]:mb-2 [&_h3]:mt-4 [&_strong]:font-bold [&_em]:italic [&_a]:text-[#00539f] [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-4 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-700 [&_blockquote]:my-4 [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_pre]:bg-gray-50 [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:border [&_pre]:border-gray-200 [&_pre_code]:bg-transparent [&_pre_code]:p-0"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </article>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
