# ⛳ Fairway — Your Golf Journal

**Every round tells a story.**

Fairway is a free, mobile-first golf scorecard and personal golf journal. Record rounds, build a golf bag, follow your progress and celebrate achievements — without creating an account or paying a subscription.

> **Current release: v0.9.5 (beta)** · A personal project, built for the love of golf.

## Features

| Area | What Fairway does today |
| --- | --- |
| **Scorecards** | Enter strokes hole by hole on 9- or 18-hole courses; resume an in-progress round. |
| **Courses** | Save and edit course names, tee colours, hole pars, optional distances, Course Rating, Slope Rating and Stroke Index. |
| **History** | Review saved rounds and scorecards; edit or delete rounds. |
| **Player** | View personal and eligible-round handicap estimates, enter an official handicap reference, and manage your golf bag. |
| **My Golf Bag** | Save club names and carry distances; display distances in metres or yards. |
| **Performance** | Optionally record putting and shot details during a round and review available tracked statistics. |
| **Achievements** | Track milestones such as birdies, eagles and holes-in-one. |
| **Data & backup** | Save data locally in your browser; export or import a JSON backup. |

The interface is designed primarily for phones but can also be used in a desktop browser.

## Try Fairway

### Use the hosted app

Open the project's GitHub Pages URL in your browser. If your browser supports installing websites, you can add Fairway to your home screen or install it as a web app.

- **iPhone:** Open in Safari, then use **Share → Add to Home Screen**.
- **Android:** Open in Chrome and use **Install app** or **Add to Home screen**, if offered.
- **Desktop:** Open the URL in a modern browser; an install option may be available.

Installation support and offline page loading vary by browser. **v0.9.5 does not include a service worker**, so do not rely on the site being available when completely offline, even though previously loaded pages can save data locally.

### Run locally

This release is a static website. From the folder containing `index.html`, run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

### Publish using GitHub Pages

1. Upload `index.html`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png` and `apple-touch-icon.png` to the repository root.
2. In the repository, go to **Settings → Pages**.
3. Configure deployment from the `main` branch and root directory, or use your existing Pages deployment workflow.
4. Open the published HTTPS URL.

A custom domain is optional; it is **not** required to use Fairway as a web app.

## Handicap estimates: important limitations

Fairway shows a **personal handicap estimate** from rated, non-test rounds and a separate **WHS-style estimate** from rounds marked as eligible. You can also enter your actual Swiss Golf Handicap Index manually as a reference.

**Neither calculated figure is an official Handicap Index.** Fairway does not submit scores to Swiss Golf or determine whether a round qualifies for official handicap purposes. Marking a round “eligible” in Fairway is only an internal filter — it does not register an EDS/general-play score.

Current calculation limitations include:

- **Nine-hole results:** Fairway uses an approximation based on doubling the played-nine differential, **not** the WHS expected-score method.
- **18-hole adjusted scores:** Net double bogey adjustment is available only when the necessary Stroke Index data and a manually entered official handicap reference are present.
- **Historical handicaps:** The entered official handicap reference is not automatically reconstructed for each past round.
- **Further WHS rules:** PCC, exceptional-score reductions, soft/hard caps and other official procedures are not fully implemented.

Use your golf association's official system as the source of truth for your official Handicap Index.

## Privacy, storage and backups

**There are currently no Fairway accounts or cloud synchronization.** Round history, courses, club information and settings are saved in the browser's local storage on the device you use.

This means:

- Data does **not** automatically follow you to another phone, computer or browser.
- Clearing site data, deleting the browser profile or losing the device can erase your Fairway records.
- Export a JSON backup regularly, especially **before updating** the app or changing devices.
- Importing a backup replaces the local data in the current browser; check that you have the right file first.

The app currently uses the local storage key `fairway-data-v2` to preserve compatibility with recent versions.

## Project files

```text
index.html              # Application UI, styles and JavaScript
manifest.webmanifest    # Web app name, icons and display settings
icon-192.png            # Web app icon
icon-512.png            # Web app icon
apple-touch-icon.png    # Apple home-screen icon
README.md               # Project documentation
```

## Roadmap

The following items are **planned**, not yet released:

- [ ] Improve WHS calculations, especially nine-hole expected scores and historical handicap handling.
- [ ] Expand and polish Player performance statistics and visualizations.
- [ ] Add reliable offline app loading and synchronization safeguards.
- [ ] Offer **optional** user accounts and cloud backups while preserving account-free local use.
- [ ] Synchronize rounds, courses and clubs across devices for signed-in users.
- [ ] Test installation and layout thoroughly across iPhone, Android and desktop.
- [ ] Optionally add a custom domain.

## Release history

| Version | Milestone |
| --- | --- |
| **v0.9.5** | Stroke Index entry and handicap calculation refinements. |
| **v0.9.4** | Golf bag distance visualization and optional shot/performance tracking. |
| **v0.9.3** | Player section, dual handicap estimates and golf bag management. |
| **v0.9.2** | Earlier scorecard, course, history, handicap and backup foundation. |
| **v0.6–v0.9** | Expanded course management, editing, awards, navigation and presentation. |
| **v0.1–v0.5** | Initial scorecard prototype and design iterations. |

## Philosophy

Fairway began as a way to track golf rounds with friends and family without subscriptions or unnecessary complexity. The goal is to keep the core experience **free, accessible and enjoyable**, whether you play occasionally or every weekend.

---

**Fairway** · Built for the love of golf. 🌲⛳
