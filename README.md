# Personal website

Next.js exports this site to GitHub Pages. The homepage is at `/`, the blog at `/blog/`, and the personal journal at `/personal/`.

## Write blog posts with Typst

```sh
npm ci
npm run write
```

Open http://127.0.0.1:4310. This editor runs locally and saves into this repository. GitHub Pages hosts the published articles, not the editor. Change the editor port with `EDITOR_PORT=4311 npm run write`.

1. Click **New post** and enter a title, URL, and date.
2. Write native Typst in the source pane. The persistent compiler renders the entire document as SVG, including text, math, images, tables, and diagrams. Compile time is shown above the preview.
3. Paste or drop images into the source pane, or click **Add image**. Images save beside the document and the editor inserts `#image(...)`. Add useful alternative text. New posts save as drafts before the first image upload.
4. Click **Save post** or press Cmd/Ctrl+S. Source saves to `index.typ` and metadata to `post.json`. Unsaved source is also backed up in browser storage where available. Conflicting disk edits are rejected.
5. Choose **Ready to publish**, save, commit the post folder, and push to `main`.

Saving does not push to GitHub. Drafts are excluded from production along with their media; they appear in the local site preview. Invalid Typst can be saved as a draft but cannot be marked ready. Preview errors keep the last valid document visible.

Preview updates after a 50 ms typing pause. The same compiler stays alive between edits so Typst can reuse previous work. The frame updates in place, preserving scroll position. Resizing the pane recompiles at the new width. Production builds generate narrow, medium, and wide layouts for responsive reading, using the same compiler and default styles.

The URL becomes the folder name. Edit it and save to rename the post and move its images together. Existing URLs cannot be overwritten. Changing a published URL replaces its old address. Posts appear at `/blog/<url>/`; `/blog/` shows the newest post.

## Typst syntax

```typst
= Introduction

This is *bold* and this is _italic_.

Inline math: $x^2 + y^2 = z^2$.

$ sum_(i=1)^n i = (n(n+1))/2 $

- First point
- Second point

#link("https://typst.app/docs/")[Typst documentation]

#table(columns: 2, [A], [B], [1], [2])

#image("./photo.png", width: 100%, alt: "Photo description")
```

Write Typst directly; there is no Markdown parser in the blog. Headings start with `=`, bold uses `*text*`, italic uses `_text_`, and display math has spaces inside `$ ... $`. Use set/show rules and Typst functions as usual. Post-local images, included `.typ` files, and data files resolve inside the post folder. PNG, JPG, WebP, and GIF uploads up to 10 MB are supported; local SVG images may also be referenced directly in Typst.

The compiler runtime comes from the npm dependency; a separate Typst CLI installation is not required. The preview and published output embed glyphs and images, so readers need neither fonts nor a compiler installed. The web SVG output includes a text selection layer.

Native Typst uses actual font files, not browser CSS. It defaults to embedded Libertinus Serif for reproducible preview and deployment. To use Warnock Pro, place licensed desktop font files in `content/blog/fonts/`; see that folder's README. The homepage uses Helvetica Neue/Helvetica/Arial for body text and system monospace fonts for labels and metadata. Blog interface fonts are defined in `public/typography.css`.

## Content layout

```text
content/
  about/
    page.json                 Homepage text, links, and experience
    resume.pdf
  blog/
    assets/impression-sunrise.jpeg
    fonts/                    Optional licensed Typst fonts
    posts/
      post-title/
        index.typ             Native Typst source
        post.json             Title, date, description, draft status
        image-*.png           Pasted images
  personal/
    assets/                   Journal cover and profile
    posts/
      YYYY-MM-DD/
        index.md              Journal Markdown, unchanged
        photo.webp
        track.mp3
archive/blog/                 Former blog posts and original media
app/                          Site components and styles
scripts/editor/               Browser editor and preview interface
scripts/editor.mjs            Local editor server
scripts/typst.mjs             Persistent Typst compiler and publication layouts
scripts/content.mjs           Content preparation
```

The former blog posts remain archived and are excluded from builds and the editor. They retain their original Markdown source. Restoring one requires converting its source to Typst and adding `post.json`; the original folder name can be reused to restore its old URL.

Previous Markdown browser backups are left intact. The new editor recovers an unsaved old draft as text and asks you to check its Typst syntax. New backups use a separate storage key.

## Edit files directly

Browser editing is optional:

```sh
npm run new:post -- blog "Post title"
npm run new:post -- personal "A weekend away"
```

The blog command creates `index.typ` and `post.json`:

```json
{
  "title": "Post title",
  "date": "2026-10-11",
  "preview": "Optional search description",
  "draft": true
}
```

Set `draft` to `false` when ready. Dates determine ordering, newest first. Keep the document and all its files together in its post folder.

The personal journal continues to use Markdown with YAML front matter in `index.md`. Personal titles can be empty; existing posts can infer the date from the folder name. Use `![Description](./photo.webp)` for images. Repository-authored HTML remains supported. For scroll audio, put `track-name.mp3` beside the file and insert `[track-name]` in the text. Audio is opt-in.

## Preview, check, and publish

```sh
npm run dev -- --hostname 127.0.0.1
```

Open http://localhost:3000 for the homepage, `/blog/` for the blog, or `/personal/` for the journal. Run the editor in another terminal. Saving content refreshes the site preview; adding a post restarts the preview server. Content errors keep the last valid prepared content.

Stop the site preview before building:

```sh
npm run test:content
npm run test:editor
npm run test:ponyo
npm run lint
npm run build
```

The build generates `out/`. Pushing to `main` deploys through GitHub Pages. The site has no database or production server.

`.generated/`, `public/_content/`, `.next/`, and `out/` are generated and ignored. Do not edit them. Commit posts and their images together under `content/`.

## Homepage

Edit `content/about/page.json` for the introduction, contact links, experience, research, education, talks, projects, and skills. Experience and research entries use `org`, `title`, `location`, `dates`, and `summary`. Use `**text**` in the introduction and summaries for bold emphasis. Replace `content/about/resume.pdf` to update the résumé. Homepage styles are in `app/(about)/home.css`.

The blog uses `NEXT_PUBLIC_ADOBE_FONTS_KIT_URL` for its Adobe Fonts stylesheet. Set it in `.env.local` and the build environment. Blog browser font stacks are shared in `public/typography.css`. Native Typst font configuration is described above.

## ASCII koi homepage

The dark homepage uses `app/(about)/KoiPond.tsx`, an original canvas renderer inspired by [ascii-sharks](https://github.com/stackedlol/ascii-sharks). Rounded koi bodies, barbels, patterned scales, and flowing fins are sampled into a grid of colored ASCII characters. Each fish steers toward changing destinations across the viewport, gives nearby koi room and makes occasional trips beyond the viewport before swimming back, and bends its body through turns. Run `npm run test:koi` to check roaming and containment at desktop and mobile sizes. Click open water for ripples. The scene respects reduced-motion preferences and pauses while the tab is hidden. At most four fish of varied sizes swim on each page; the writing pages use smaller fish. Each fish accelerates and slows independently, with smaller fish moving faster and gaining speed on downward passes. Ivory/vermilion, gold, blue-silver, and cream/charcoal palettes distinguish the four koi. Bodies follow the route their heads traveled, creating curved turns.

Type `ponyo` outside a text field, or use the small fish control at the bottom left, to toggle the hidden ASCII Ponyo visitor. Escape dismisses her. The former Ponyo design, components, and art are preserved in `archive/ponyo-design/`.

The water simulation in `app/(about)/pond-water.ts` adds schooling minnows, circulating currents, click and cursor avoidance, turn glints, and a diffusing wake field. Tails disturb the water, leaving small teal lights that spread and fade. The implementation follows the behavior of the reference repository’s [world](https://github.com/stackedlol/ascii-sharks/blob/main/src/world.ts) and [renderer](https://github.com/stackedlol/ascii-sharks/blob/main/src/renderer.ts), adapted to koi and the page’s text masks. Tiny schooling dashes are separate from the four large koi. `npm run test:koi` covers both simulations and wake decay.
