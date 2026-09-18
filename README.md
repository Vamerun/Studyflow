# StudyFlow

A focus timer and task tracker for students. Pick a task, run a Pomodoro-style timer, and fill in a square for every finished session. It runs entirely in the browser: no backend, no accounts, no build step.

**Live demo:** `https://Vamerun.github.io/studyflow/` (see [Deploy](#deploy))

## Features

- Focus, short break and long break timers with adjustable lengths
- Accurate in background tabs (the timer uses an end timestamp, not a tick counter)
- Task list with a per-task session estimate and progress squares
- Finished focus sessions are credited to the selected task automatically
- Daily stats, a 7-day chart and a study streak
- Everything saves to `localStorage`; export your data as JSON at any time
- Keyboard shortcut (`Space`), visible focus states, reduced-motion support, responsive layout

## Run locally

```bash
git clone https://github.com/Vamerun/studyflow.git
cd studyflow
npm start          # serves http://localhost:8000 (needs Python 3)
```

The app uses ES modules, so open it through a local server rather than by double-clicking `index.html`. Any static server works, for example `npx serve`.

## Test

The logic in `src/core.js` is pure and covered by unit tests using Node's built-in test runner (Node 18+):

```bash
npm test
```

## Project structure

```
index.html          page markup
src/core.js         pure logic: time formatting, mode rotation, tasks, stats, streaks
src/app.js          state, timer, DOM rendering, events
src/style.css       styles
tests/core.test.js  unit tests
.github/workflows   CI that runs the tests on every push
```

## Deploy

1. Push the repository to GitHub.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. After a minute the site is live at `https://Vamerun.github.io/studyflow/`.

## Roadmap

- [ ] Desktop notifications when a session ends
- [ ] Import data from a JSON export
- [ ] Per-task time reports
- [ ] Installable PWA with offline support
- [ ] Dark theme

## Contributing

Issues and pull requests are welcome. Run `npm test` before opening a PR.

## License

[MIT](LICENSE)
