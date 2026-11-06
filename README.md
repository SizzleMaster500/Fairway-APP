# ⛳ Fairway — Your Golf Journal

**Every round tells a story.** A free, mobile-first golf scorecard and journal: courses, rounds, handicap estimate, golf bag and shot tracking. No account, no ads, no subscription.

## Features

| Area | What it does |
| --- | --- |
| **Scorecards** | Score 9 or 18 holes (front, back or full), quick or detailed mode. Unfinished rounds autosave. The first tap on `+` starts at par. |
| **Courses** | One course with many tee configurations (tee colour × front/back/full), each with Course Rating, Slope, distances and Stroke Index. |
| **History** | Review, edit and delete saved rounds. |
| **Player** | Personal and WHS-style handicap estimates, official HCP reference, golf bag with carry distances, performance stats. |
| **Awards** | Birdies, eagles, aces and career milestones. |
| **Offline** | A service worker caches the app so it opens without signal. |
| **Backup** | Export / import everything as JSON (uses the iPhone share sheet when available). |

## Install on iPhone

Open the GitHub Pages URL in **Safari → Share → Add to Home Screen**.
Data lives in the browser storage of *that* install, so a Safari tab and the home-screen app do **not** share data, and deleting the app deletes the data. **Export a backup regularly.**

## Project layout

```text
index.html            markup for all screens
styles.css            styles (colour variables at the top)
sw.js                 service worker (offline support) – bump CACHE every release
manifest.webmanifest  home-screen app settings
js/                   classic scripts, loaded in this order:
  utils.js              unit conversion, validation, formatting, tiny DOM helpers
  storage.js            localStorage, repair of bad data, backup export/import
  handicap.js           handicap maths (pure functions, unit tested)
  player.js             Player tab, golf bag, shot tracking, handicap screens
  courses.js            course editor, tee configurations, legacy migration
  rounds.js             playing, scoring, editing rounds
  app.js                screen rendering, tab navigation, start-up
tests/                unit tests for the handicap maths
check.mjs             sanity checks (files, script order, no duplicate functions)
```

Rule of thumb: a function lives in exactly one file. `check.mjs` fails if two files define the same function.

## Develop

```bash
python -m http.server 8000     # then open http://localhost:8000
npm test                       # unit tests + sanity checks (Node 20+)
npm run format                 # Prettier
```

### Releasing

1. Change the version in `index.html` (header, edit screen, footer) **and** `CACHE` in `sw.js`. `npm test` checks they match.
2. Push to `main`. Phones pick up the new files on the next launch after the one that downloads them.

## Handicap estimates: limitations

Fairway shows a **personal estimate** and a **WHS-style estimate** (rounds you mark eligible). **Neither is an official Handicap Index.**

- 9-hole rounds double the nine-hole differential (not the WHS expected-score method).
- 18-hole net double bogey needs full Stroke Index data and your entered official HCP.
- PCC, exceptional-score reductions and caps are not applied.
- Results can go below zero (plus handicaps).

## Privacy

No accounts, no cloud, no tracking. Everything stays in the browser's local storage (`fairway-data-v2`). If stored data ever becomes unreadable, a copy is kept under `fairway-data-v2-corrupt-<time>` instead of being overwritten.

## Roadmap

- [ ] Better 9-hole WHS handling and historical handicap
- [ ] More performance stats (fairways hit, GIR)
- [ ] Optional cloud backup / sync

## Release history

| Version | Milestone |
| --- | --- |
| **v0.11.0** | Cleanup: one function per file, removed dead code, offline support, bug fixes, tests. |
| **v0.10.x** | Unified courses with tee configurations, round editing. |
| **v0.9.x** | Player section, handicap estimates, golf bag, shot tracking, Stroke Index. |
| **v0.1–v0.8** | Scorecard prototype and design iterations. |
