# Repository Guidelines

## Project Structure & Module Organization

The GitHub Pages site is served from the repository root: keep page HTML files there. Shared styles and theme behavior live in `assets/`. The production API is the Spring Boot application in `backend-java/src/main/java/com/codestudio/board/`; its configuration is in `src/main/resources/`. `backend-python/` contains an alternative Flask API for learning, and `games/python/` contains standalone pygame exercises. See the README in each backend or the games directory for module-specific details.

## Build, Test, and Development Commands

- `cd backend-java; mvn spring-boot:run` starts the Java API at `http://127.0.0.1:8080` (requires JDK 17+ and Maven).
- `cd backend-java; mvn test` runs the Java Maven test phase. The repository currently has no checked-in test sources.
- `cd backend-python; pip install -r requirements.txt; python app.py` starts the optional Flask API at port 5000.
- `cd games/python; pip install -r requirements.txt; python tictactoe_pygame.py` installs game dependencies and launches an example; other `*_pygame.py` files run individual games.
- Open root `index.html` with VS Code Live Server to develop the static pages.

## Coding Style & Naming Conventions

Keep static pages at the root and reuse shared assets where practical. Follow existing conventions in the file you are editing: Java uses `UpperCamelCase` classes and four-space indentation; Python uses `snake_case` filenames/functions and four-space indentation. Game scripts use descriptive `*_pygame.py` names. No formatter or linter is configured, so keep changes consistent with nearby code and avoid unrelated formatting churn.

## Testing Guidelines

There is no established automated test suite or coverage requirement. For Java changes, run `mvn test`; for UI, API, and game changes, launch the affected page or service and check the changed behavior manually. Include the command or manual checks performed in your change description.

## Commit & Pull Request Guidelines

Recent commits use concise imperative subjects, for example `Fix calendar date contrast in dark mode` and `Persist uploaded files in the database`. Use the same style and keep each commit focused. Pull requests should describe the user-visible or API change, list validation performed, link related issues when applicable, and include screenshots for visual changes. Never commit credentials, generated build output, local databases, or uploaded files; configure secrets through environment variables.
