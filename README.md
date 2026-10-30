# Fairway v0.9.8 — Stability Release

Fairway is a free, offline-first golf journal. This release reorganizes the existing v0.9.7 code **without changing its features or data format**.

## Deploy

Upload the **contents** of this folder to the root of your GitHub Pages repository. Keep `index.html`, `styles.css`, `manifest.webmanifest`, the icon files, and the `js/` folder in their original relative locations. Do not upload only `index.html`.

## Files

- `index.html`: existing page markup and UI
- `styles.css`: original appearance
- `js/app.js`: navigation, course editing, rounds, history and initialization
- `js/storage.js`: loading, saving, import/export and round validation
- `js/handicap.js`: existing **unofficial** handicap estimate and display
- `js/player.js`: golf bag, detailed tracking and performance display

Scripts intentionally use classic browser globals to preserve existing inline handlers and avoid a risky simultaneous rewrite. A future release can move to ES modules with explicit imports.

## Data safety

Fairway continues to use the **same** `localStorage` key, `fairway-data-v2`. No data migration or clearing is performed. Export a JSON backup before deployment. Local browser data is tied to the same site origin; moving domains does not automatically move it.

## Small stability fix

The 9-hole Stroke Index editor now accepts published values from 1 to 18 (previous v0.9.7 code still restricted it to 1 to 9).

## Handicap limitation

The 9-hole handicap estimate remains an approximation, not the official WHS expected-score method. No cloud accounts or server are included.

## Testing

Run `node --check js/*.js` individually or run `python3 -m http.server 8000` and open `http://localhost:8000` to test. The release includes `tests/smoke.py` for Playwright browser checks.

### Verification note

JavaScript syntax and static regression checks were run successfully. Browser automation was unavailable in the build environment (navigation blocked), so a full mobile/browser interaction test has **not** been completed for this release. Test on your deployed site before considering it final.
