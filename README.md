# Personal website

Edit writing and images in `content/`. Page code lives in `app/`. The existing URLs and designs are unchanged.

```text
content/
  about/
    page.json                 About text, links, and experience
    profile.webp              About photo
    resume.pdf                Résumé
  blog/
    assets/                   Painting banner and profile photo
    posts/
      tradeweb/
        index.md              Post text and metadata
        image1.webp           Images for this post, right beside the text
        ...
      ai-for-youth/
      solving-letterboxed/
  personal/
    assets/                   Journal cover and profile
    posts/
      2026-03-14/
        index.md
        picnic.webp
        ...
      2026-06-16/
        index.md
        tanemi.mp3            Audio stays with its post too

app/
  (about)/                    About page and its styles; URL remains /
  blog/                       Professional blog layout and reader; /blog/
  personal/                   Personal journal, styles, and audio; /personal/
  layout.tsx                  Shared HTML shell and metadata
  globals.css                 Shared styles only
scripts/                      Post creation, media preparation, and preview watcher
lib/                          Small content readers for the pages
.vscode/                      Writing settings and tasks
```

## Write a new post in VS Code

1. Open the Command Palette (`Cmd+Shift+P` on Mac).
2. Select **Tasks: Run Task**, then **New post**.
3. Choose `blog` or `personal`, then enter a title.
4. Open the generated `index.md` (the task opens it automatically if the `code` command is installed).
5. Write, add images beside the file, and save.

The terminal equivalent is:

```sh
npm run new:post -- blog "My internship reflections"
npm run new:post -- personal "A weekend away"
```

Each command creates one folder with an `index.md`. It never overwrites an existing post. Professional folder names become URLs, so keep them stable after publishing. Personal posts are grouped by date and title and appear in the journal feed.

A new file starts with:

```md
---
title: "My internship reflections"
date: "2026-09-16"
draft: true
---

Write here.
```

Dates determine ordering, newest first. Personal post titles can be empty. An optional `preview` field is supported for professional post metadata. Existing personal posts can still infer their date from the folder name.

## Add images without leaving the post folder

Drop your photo beside `index.md`, then reference just its filename:

```md
![Lunch with the team](./lunch.webp)
*Lunch on our last day.*
```

JPG, PNG, WebP, GIF, SVG, and AVIF are supported. File names with spaces work using angle brackets: `![Lunch](<./team lunch.jpg>)`. A subfolder such as `images/` inside the post also works. Keep each post self-contained; do not use paths into another post's folder.

VS Code's built-in Markdown image paste/drop feature is configured to copy images beside the current post. You can also drag a file into the Explorer folder and type the relative link yourself. Open **Markdown: Open Preview to the Side** to see the text and local images together. See [VS Code's Markdown guide](https://code.visualstudio.com/docs/languages/markdown) for editor shortcuts.

You do not need to touch `public/`, copy an image twice, or type a website-wide image URL. The site prepares those URLs automatically. PDFs, video, and audio files can also be kept in the same post folder. Use ordinary Markdown links for downloads. Repository-authored HTML remains supported in personal posts.

For the personal journal's existing scroll audio, put `track-name.mp3` beside `index.md` and insert `[track-name]` in the text. A play/stop control appears after the first paragraph. Audio is opt-in.

## Preview and publish

Run **Tasks: Run Task → Preview website**, or:

```sh
npm ci                     # First setup only
npm run dev -- --hostname 127.0.0.1
```

Open:

- http://localhost:3000/ — About
- http://localhost:3000/blog/ — professional blog
- http://localhost:3000/personal/ — personal journal, not linked from the homepage

Saving Markdown, adding a post folder, or adding an image refreshes the running preview. If an image path is wrong, the terminal identifies the file and missing image; fix it and save again. The preview keeps the last valid content while an edit has an error.

`draft: true` posts are visible locally but excluded from the production build, including their media. Set `draft: false` (or remove the field) when ready. Saving is not publishing.

Stop the preview with `Ctrl+C` before running **Check website** or these commands:

```sh
npm run test:content
npm run lint
npm run build
```

The build creates the static site in `out/`. Pushing to `main` publishes it through GitHub Pages. After checking, restart the preview with `npm run dev`.

## Edit the About page and section images

Edit `content/about/page.json` for the About paragraph, navigation, and experience timeline. Each timeline entry has `startDate` (`YYYY-MM`), `place`, `summary`, and `details`. Separate paragraphs in `details` with `\n\n`. Inline links use `[TEDx talk](https://example.com)` and open in a new tab.

Replace `content/about/profile.webp` or `resume.pdf` to update those files. Professional blog artwork is in `content/blog/assets/`; journal cover and profile art are in `content/personal/assets/`.

## How the files become a site

`npm run dev` watches `content/`. `npm run build` prepares it once. Both render Markdown, validate dates and local image paths, and copy media into generated output. Next.js reads the prepared posts and exports the same routes as before. There is no CMS, database, or runtime dependency on the old website repo.

`.generated/`, `public/_content/`, `.next/`, and `out/` are generated, ignored by Git, and hidden in VS Code. Do not edit them. New posts and their images should be committed together under `content/`.
