# Repository Guidelines

## Project Structure & Module Organization

The GitHub Pages site is served from the repository root: keep page HTML files there. Shared styles and theme behavior live in `assets/`. The production API is the Spring Boot application in `backend-java/src/main/java/com/codestudio/board/`; its configuration is in `src/main/resources/`. Standalone desktop tools live in `tools/desktop/` (Python, packaged as Windows executables with PyInstaller). See the README in each directory for module-specific details.

## Build, Test, and Development Commands

- `cd backend-java; mvn spring-boot:run` starts the Java API at `http://127.0.0.1:8080` (requires JDK 17+ and Maven).
- `cd backend-java; mvn test` runs the Java Maven tests; the same suite runs in GitHub Actions for pushes to `main` and pull requests.
- `cd tools/desktop; .\build.ps1` packages each desktop tool into a Windows executable with PyInstaller.
- Open root `index.html` with VS Code Live Server to develop the static pages.

## Coding Style & Naming Conventions

Keep static pages at the root and reuse shared assets where practical. Follow existing conventions in the file you are editing: Java uses `UpperCamelCase` classes and four-space indentation; Python uses `snake_case` filenames/functions and four-space indentation. No formatter or linter is configured, so keep changes consistent with nearby code and avoid unrelated formatting churn.

## Testing Guidelines

For Java changes, run `mvn test`; the checked-in tests cover authentication, game persistence and room recovery, score storage, WebSocket handling, news collection, and stock quote parsing. For static-site changes, run `node .github/scripts/check-inline-scripts.mjs`, `node .github/scripts/check-links.mjs`, `node .github/scripts/check-assets.mjs`, and `node .github/scripts/check-seo.mjs`. For UI, API, and game changes, also launch the affected page or service and check the changed behavior manually; `node .github/scripts/smoke-site.mjs` runs a headless Chrome smoke test when Chrome is installed (Node 22+ for the global `WebSocket`). Include the command or manual checks performed in your change description. Schedule recurrence helpers are covered by `node --test tests/schedule.test.mjs`.

## Static Page Maintenance

Adding or renaming a root page touches several shared lists. Work through this checklist so the checks stay green:

1. Add the page to `.github/scripts/pages.txt` (alphabetical position does not matter, but keep one file per line).
2. Add a `<meta name="description">`, canonical URL, Open Graph, and Twitter card tags after the `theme-color` meta; copy the block from an existing page and update the text and URL.
3. Register the page in the sidebar in `assets/common.js` (`NAV`), or in the relevant submenu.
4. Add a search entry in `search.html` (`staticIndex`) when the page should be discoverable.
5. Add the page to `sw.js` `CORE` only if it is lightweight and useful offline; large pages such as `game.html` are cached on first visit instead.
6. Add authenticated or private pages (`login.html`, `mypage.html`, `admin.html`, `offline.html`) to `robots.txt` disallow and mark them `noindex`; public pages belong in `sitemap.xml`.
7. Bump the shared asset version with `node .github/scripts/bump-assets.mjs` whenever `assets/*.css` or `assets/*.js` changes. The script updates every page and the `sw.js` cache name, and adjusts the "next version" prose in `manual-connect.html`. Use `--dry-run` first to review.
8. Run the four static checks above (and `node .github/scripts/smoke-site.mjs` when the layout or scripts changed) before committing.

## Commit & Pull Request Guidelines

Recent commits use concise imperative subjects, for example `Fix calendar date contrast in dark mode` and `Persist uploaded files in the database`. Use the same style and keep each commit focused. Pull requests should describe the user-visible or API change, list validation performed, link related issues when applicable, and include screenshots for visual changes. Never commit credentials, generated build output, local databases, or uploaded files; configure secrets through environment variables.
