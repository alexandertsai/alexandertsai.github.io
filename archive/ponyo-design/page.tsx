import content from "@/content/about/page.json";
import BucketHero from "./components/BucketHero";
import FishWaves from "./components/FishWaves";
import ContactIcon from "@/app/(about)/ContactIcon";
import "./home.css";

type Entry = (typeof content.experience)[number] | (typeof content.research)[number];

function emphasize(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 ? <strong key={index}>{part}</strong> : part));
}

function Heading({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} data-ponyo-perch="text" className={`home-heading ${className}`}>
      {children}
    </h2>
  );
}

function TimelineEntry({ entry }: { entry: Entry }) {
  return (
    <li className="home-job">
      <div className="home-job-side">
        <p className="home-meta">{entry.dates}</p>
      </div>
      <div className="min-w-0">
        <h3 className="home-org">{entry.org}</h3>
        <p className="home-title">
          {entry.title}
          {entry.location && <span className="home-meta"> · {entry.location}</span>}
        </p>
        <p className="home-summary">{emphasize(entry.summary)}</p>
      </div>
    </li>
  );
}

export default function Home() {
  const contacts = [
    ...content.links.filter((link) => link.icon === "linkedin"),
    { label: "Résumé", href: content.resume, icon: "resume" },
    ...content.links.filter((link) => link.icon !== "linkedin"),
  ];
  return (
    <main className="home">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16 lg:py-14">
        <aside className="home-sidebar">
          <div className="home-masthead">
            <h1 data-ponyo-perch="text" className="home-name">
              {content.name}
            </h1>
            <BucketHero />
          </div>

          <nav aria-label="Contact and links">
            <ul className="home-links">
              {contacts.map((link) => (
                <li key={link.label}>
                  <a href={link.href} aria-label={link.label} title={link.label} {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    <ContactIcon name={link.icon === "doc" ? "blog" : link.icon} />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="home-group">
            <p className="home-label">At a glance</p>
            <dl className="home-facts mt-3">
              {content.facts.map((fact) => (
                <div key={fact.label} className="contents">
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>

        <div className="min-w-0">
          <section aria-label="About">
            <p className="text-[17px]">{emphasize(content.about)}</p>
          </section>

          <section className="home-section" aria-labelledby="experience-heading">
            <Heading id="experience-heading">Industry experience</Heading>
            <ol className="mt-5 grid gap-7">
              {content.experience.map((job) => <TimelineEntry key={`${job.org}-${job.dates}`} entry={job} />)}
            </ol>
          </section>

          <section className="home-section" aria-labelledby="research-heading">
            <Heading id="research-heading">Research &amp; mentorship</Heading>
            <ol className="mt-5 grid gap-7">
              {content.research.map((item) => <TimelineEntry key={item.org} entry={item} />)}
            </ol>
          </section>

          <section className="home-section grid gap-10 md:grid-cols-2" aria-label="Education, talks, toolkit and projects">
            <div>
              <Heading id="education-heading">Education</Heading>
              <ul className="mt-5 grid gap-5">
                {content.education.map((item) => (
                  <li key={item.school}>
                    <p className="font-semibold leading-snug">{item.school}</p>
                    <p className="text-[15px]">{item.detail}</p>
                    <p className="home-meta">{item.note ? `${item.dates} · ${item.note}` : item.dates}</p>
                  </li>
                ))}
              </ul>
              <Heading id="talks-heading" className="mt-10">Publications &amp; talks</Heading>
              <ul className="mt-5 grid gap-4">
                {content.talks.map((item) => (
                  <li key={item.href}>
                    <a className="home-link text-[15px] font-medium" href={item.href} target="_blank" rel="noopener noreferrer">{item.title}</a>
                    <p className="home-meta">{item.venue}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Heading id="toolkit-heading">Toolkit</Heading>
              <dl className="mt-5 grid gap-4">
                {content.skills.map((group) => (
                  <div key={group.group}>
                    <dt className="home-label">{group.group}</dt>
                    <dd className="mt-1.5">
                      <ul className="flex flex-wrap gap-1.5">
                        {group.items.map((item) => <li key={item} className="home-chip">{item}</li>)}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
              <Heading id="projects-heading" className="mt-10">Projects</Heading>
              <ul className="mt-5 grid gap-4">
                {content.projects.map((item) => (
                  <li key={item.href}>
                    <a className="home-link text-[15px] font-medium" href={item.href} target="_blank" rel="noopener noreferrer">{item.title} ↗</a>
                    <p className="home-meta">{item.note}</p>
                  </li>
                ))}
              </ul>
              <p className="home-personal mt-8">{content.personal}</p>
            </div>
          </section>
        </div>
      </div>

      <FishWaves />
    </main>
  );
}
