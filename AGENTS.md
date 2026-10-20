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

For Java changes, run `mvn test`; the checked-in tests cover authentication, game persistence and room recovery, score storage, WebSocket handling, news collection, and stock quote parsing. For static-site changes, run `node .github/scripts/check-inline-scripts.mjs` and `node .github/scripts/check-links.mjs`. For UI, API, and game changes, also launch the affected page or service and check the changed behavior manually. Include the command or manual checks performed in your change description.

## Commit & Pull Request Guidelines

Recent commits use concise imperative subjects, for example `Fix calendar date contrast in dark mode` and `Persist uploaded files in the database`. Use the same style and keep each commit focused. Pull requests should describe the user-visible or API change, list validation performed, link related issues when applicable, and include screenshots for visual changes. Never commit credentials, generated build output, local databases, or uploaded files; configure secrets through environment variables.
