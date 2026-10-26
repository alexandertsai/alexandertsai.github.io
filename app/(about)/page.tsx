import SiteHeader from "../components/SiteHeader";
import content from "@/content/about/page.json";
import KoiPond from "./KoiPond";
import ContactIcon from "./ContactIcon";
import ProjectFigure from "./ProjectFigure";
import "./home.css";

type Entry = (typeof content.experience)[number] | (typeof content.research)[number];

function inlineLinks(text: string) {
  return text.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    return link ? <a key={index} className="home-link" href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a> : part;
  });
}

function emphasize(text: string, focused = false) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  const highlight = parts.findIndex((part, index) => index % 2 && /\d[\d.,]*\s*(?:%|×)/.test(part));
  return parts.map((part, index) => index % 2 && (!focused || index === (highlight < 0 ? 1 : highlight)) ? <strong key={index}>{inlineLinks(part)}</strong> : inlineLinks(part));
}

function Heading({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} data-pond-text className={`home-heading ${className}`}>
      {children}
    </h2>
  );
}

function TimelineEntry({ entry }: { entry: Entry }) {
  return (
    <li className="home-job">
      <div className="home-job-identity" data-pond-text>
        <h3 className="home-org">{entry.org}</h3>
        <p className="home-title">{entry.title}</p>
        <p className="home-meta home-dates">{entry.dates}</p>
        {entry.location && <p className="home-location">{entry.location}</p>}
      </div>
      <p className="home-summary" data-pond-text>{emphasize(entry.summary, true)}</p>
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
      <KoiPond />
      <a className="skip-link" href="#experience-heading">Skip to experience</a>
      <SiteHeader />
      <div className="home-shell">
        <section className="home-hero" aria-label="About">
          <p className="home-eyebrow"><span />{content.facts[0].value}</p>
          <h1 className="home-name">Alexander<br />Tsai<span>.</span></h1>
          <p className="home-intro" data-pond-text>{emphasize(content.about)}</p>
          <nav aria-label="Contact and links">
            <ul className="home-links" data-pond-text>
              {contacts.map((link) => (
                <li key={link.label}>
                  <a href={link.href} title={link.label} {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    <ContactIcon name={link.icon === "doc" ? "blog" : link.icon} />
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a className="home-scroll" href="#experience-heading">Selected experience <span aria-hidden="true">↓</span></a>
        </section>
        <div className="home-content">
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

          <section className="home-section home-projects" aria-labelledby="projects-heading">
            <Heading id="projects-heading">Selected projects</Heading>
            <ol className="home-project-list">
              {content.projects.map((item, index) => (
                <li key={item.href}>
                  <a className="home-project" href={item.href} target="_blank" rel="noopener noreferrer">
                    <span className="home-project-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <div data-pond-text><h3>{item.title}</h3><p>{item.note}</p></div>
                    <div className="home-project-art" data-pond-text><ProjectFigure href={item.href} /></div>
                  </a>
                </li>
              ))}
            </ol>
          </section>

          <section className="home-section home-details grid gap-12 md:grid-cols-2" aria-label="Education, talks and toolkit">
            <div data-pond-text>
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
            <div data-pond-text>
              <Heading id="toolkit-heading">Toolkit</Heading>
              <dl className="home-toolkit">
                {content.skills.map((group) => (
                  <div className="home-toolkit-group" key={group.group}>
                    <dt>{group.group}</dt>
                    <dd>
                      <ul>
                        {group.items.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>
      </div>

      <footer className="site-footer site-width" data-pond-text><span>{content.name}</span><a href="mailto:alexyrtsai@gmail.com">Get in touch ↗</a></footer>
    </main>
  );
}
