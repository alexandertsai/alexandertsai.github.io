# Personal website

Alexander Tsai’s personal website, built with Next.js App Router, React, TypeScript, and Tailwind CSS. It exports static files for GitHub Pages; there is no database, CMS, or runtime backend.

## Intent and pages

- `/` is the main profile: a short introduction, contact links, résumé, and recent experience. Keep it simple and readable. Experience summaries expand in place to reveal details.
- `/blog/` is the personal journal: full posts in reverse chronological order, with optional images and sound. It links back to the profile; the profile links to the blog.

These are two routes in one site. Blog posts currently appear in a single feed, not on individual post pages. Content is kept separate from page components so routine writing does not require editing layout code.

## Repository structure

```text
app/
  layout.tsx           Shared HTML shell, font setup, and default metadata
  globals.css          Shared styles and homepage styles
  page.tsx             / — profile and experience layout
  blog/
    layout.tsx         Blog-specific metadata
    page.tsx           /blog/ — journal feed
  AudioScroller.tsx    Client component for opt-in, scroll-triggered blog audio
content/
  home.json            Homepage text, links, photo path, and experience
posts/
  YYYY-MM-DD.md        Blog posts; filenames determine dates and ordering
lib/
  posts.ts             Reads posts, renders Markdown, expands image/audio markers
public/
  profile.webp         Profile photo
  cover.webp           Blog cover
  images/              Images used in posts
  audio/               MP3 files used by audio markers
  alexander-tsai-resume.pdf
.github/workflows/
  deploy.yml           Builds and publishes GitHub Pages on pushes to main
next.config.ts         Static export, trailing slashes, and image settings
```

The homepage imports `content/home.json` directly. The blog calls `getAllPosts()` in `lib/posts.ts` at build time. That function renders the Markdown to HTML and sorts posts newest first. `AudioScroller` handles playback in the browser after the reader selects “play sound.”

Keep page-specific layout in its route component, content in JSON or Markdown, and post-processing in `lib/posts.ts`. Extract shared components when both pages need them; the current two routes do not need a separate routing or content framework.

`node_modules/`, `.next/`, and `out/` are generated and ignored by Git. Do not edit them. `tmp/` holds local design experiments such as `style-preview.html`; those files are not part of the Next.js site or its export.

## Preview locally

```sh
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open http://127.0.0.1:3000 for the profile or http://127.0.0.1:3000/blog/ for the journal. Keep the terminal running; saved edits appear automatically. Stop with Ctrl+C. The deployment workflow uses Node.js 20.

## Edit homepage text

Open `content/home.json`. All homepage copy is in this file:

- `name` and `location`: profile information.
- `about`: the introduction paragraph.
- `links`: navigation labels and destinations.
- `timeline`: experience entries in display order, newest first. Each has a `startDate`, `place`, `summary`, and `details`. The summary is clickable; details expand underneath. Use `\n\n` in details to separate paragraphs.
- `aboutHeading` and `timelineHeading`: section labels.
- `photo`: public URL for an image, such as `/profile.webp` for `public/profile.webp`.

Set `startDate` to a month in `YYYY-MM` format, such as `2026-05`. The homepage shows the full month and year above each role on a vertical timeline. Only start dates are displayed; entries remain in the order you write them, newest first.

Edit text inside double quotes and keep the commas and brackets intact. To include a double quote in text, write `\"`. The repository’s VS Code settings wrap JSON visually; there is no need to insert line breaks into long strings.

## Edit blog posts

Create or edit a file in `posts/` named `YYYY-MM-DD.md`. The filename supplies the displayed date and sort order. A new post appears on `/blog/` after rebuilding; no route or index file needs updating.

Write ordinary Markdown. YAML front matter is optional; use it if you want a post title:

```md
---
title: "Post title"
---

Your opening paragraph.
```

Posts without a title begin directly with their content. The parser also reads optional `tags`, but the site does not currently display them. Raw HTML is supported for repository-authored posts.

Put images in `public/images/` and use Markdown such as `![Description](/images/picnic.webp)`. The custom form `[!picnic | A caption]` renders `public/images/picnic.webp` with a caption; `[!picnic]` omits the caption. Include the extension for images other than WebP.

For optional sound, add an MP3 to `public/audio/` and place its basename in brackets in the post: `[tanemi]` refers to `public/audio/tanemi.mp3`. Recognized markers become scroll cues. A play/stop control is inserted after the first paragraph, and playback starts only after the reader enables it.

## Adjust appearance

- `app/page.tsx`: homepage structure and timeline date display.
- `app/globals.css`: colors, typography, and expandable experience styling. Homepage rules use `.home-page` and `.experience-*` selectors.
- `app/blog/page.tsx`: blog layout and its Tailwind classes.
- `app/layout.tsx`: site-wide metadata and font setup; `app/blog/layout.tsx` overrides the blog title and description.

The homepage uses Arial, including the larger turquoise section labels. The timeline uses muted green colors that match the profile links. Its layout and styling can change independently of the journal. Check both routes when modifying shared CSS or the root layout.

## Check and publish

```sh
npm run lint
npm run build
```

The build includes TypeScript checks and exports the complete site to `out/`. To inspect that export locally:

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory out
```

Open http://127.0.0.1:8080. Use this static server to preview production output; `npm run start` is not the serving workflow for this static-export configuration.

Local edits and builds do not publish anything. Pushing to `main` triggers `.github/workflows/deploy.yml`, which installs dependencies, builds the site, and deploys `out/` to GitHub Pages. The workflow runs the build but does not separately run `npm run lint`, so run both checks before pushing.
