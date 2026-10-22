import content from "@/content/about/page.json";

export default function SiteHeader() {
  return <header className="site-header site-width" data-pond-text>
    <nav aria-label="Main navigation">
      <a href={content.resume} target="_blank" rel="noopener noreferrer">Résumé <span aria-hidden="true">↗</span></a>
    </nav>
  </header>;
}
