# Anwar Shama Portfolio

A bilingual, responsive React portfolio built as a static website for free hosting on GitHub Pages. It includes projects and case studies, skills, experience, blog articles, services, testimonials, FAQs, theme switching, and a mailto contact form.

## Run locally

1. Install Node.js 22.5 or later.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL shown in the terminal.
4. Run `npm test` and `npm run build` to validate and build the site.
5. Run `npm run preview` to preview the production build locally.

## Publish with GitHub Pages

1. Push this project to a GitHub repository.
2. In the repository, open **Settings → Pages** and set the source to **GitHub Actions**.
3. Push to the repository. The workflow at `.github/workflows/deploy-pages.yml` tests and builds the site, then publishes it.
4. GitHub Pages shows the public URL in the repository’s Pages settings. Project URLs use hash-based routing, so refreshes and nested pages work on GitHub Pages.

## Update portfolio content

This static version has no server-backed admin panel. Edit `public/content.json` to change text, projects, experience, blog posts, services, testimonials, and FAQs. Add or replace uploaded files in `public/uploads/` and use their `/uploads/<filename>` paths in the JSON. Commit and push the changes to publish them.

The existing local SQLite content can be exported with `npm run export:static`. The export copies referenced media from `server/data/uploads/` into `public/uploads/`. If an upload referenced by the database is missing, its reference is omitted and the script reports the missing files; the local database itself is not changed.

The Home and About pages can display a portrait, work focus, and downloadable PDF résumé. Projects support case-study sections, screenshots with captions, categories, demo/source links, and walkthrough URLs. The Projects page filters by category and technology; the Blog page supports search, categories, featured posts, and related articles. The Services page displays services and FAQs. English and Arabic content are stored together in `public/content.json`.

The GitHub Pages workflow automatically uses the repository subpath for project sites. An `owner.github.io` repository is built for the domain root. If you connect a custom domain to a regular project repository, add the Actions variable `VITE_BASE_PATH` with the value `/` under **Settings → Secrets and variables → Actions → Variables**.
