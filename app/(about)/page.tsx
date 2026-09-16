import "./about.css";
import Image from "next/image";
import Link from "next/link";
import content from "@/content/about/page.json";

export default function Home() {
  return (
    <main className="home-page min-h-screen px-6 py-14 sm:py-24">
      <div className="mx-auto max-w-[680px]">
        <header className="flex flex-col gap-6 border-b border-stone-200 pb-10 sm:flex-row sm:items-center">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-gray-100">
            <Image
              src={content.photo}
              alt={content.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          <div>
            <h1 className="text-[32px] font-semibold tracking-[-0.03em]">
              {content.name}
            </h1>
            <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {content.links.map((link) => (
                <Link className="profile-link" key={link.label} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <section className="border-b border-stone-200 py-10" aria-labelledby="about-heading">
          <h2 id="about-heading" className="section-label">
            {content.aboutHeading}
          </h2>
          <p className="mt-4 max-w-[570px] text-[16px] leading-7 text-gray-800">
            {content.about}
          </p>
        </section>

        <section className="py-10" aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="section-label">
            {content.timelineHeading}
          </h2>
          <ol className="experience-list mt-8">
            {content.timeline.map((item) => (
              <li key={`${item.startDate}-${item.place}`} className="experience-item">
                <time className="experience-date" dateTime={item.startDate}>
                  {new Intl.DateTimeFormat("en-US", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(`${item.startDate}-01T00:00:00Z`))}
                </time>
                <h3 className="experience-heading">{item.place}</h3>
                <details className="experience-details">
                  <summary>
                    <span className="experience-summary">{item.summary}</span>
                  </summary>
                  <div className="experience-body mt-3 space-y-3 pl-5">
                    {item.details.split(/\n\s*\n/).map((paragraph, index) => (
                      <p key={index}>
                        {paragraph.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, partIndex) => {
                          const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
                          return link ? (
                            <a className="profile-link" key={partIndex} href={link[2]} target="_blank" rel="noopener noreferrer">
                              {link[1]}
                            </a>
                          ) : part;
                        })}
                      </p>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
