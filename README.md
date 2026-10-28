# Afterlight — MVP 1

An iPhone-first audiobook PWA, published with GitHub Pages. No build dependencies, account, backend, paid API or subscription is required.

## Included

- Multiple-book library with a stable, editable JSON catalog.
- The Hollow Throne starts at Chapter 6. Chapters 1–5 were listened to elsewhere; they are not represented as unfinished files.
- Native HTML audio playback, Media Session metadata and play/pause/seek/skip handlers, and a playback audio session where Safari supports it.
- Persistent position for each chapter, chapter completion, smart 10-second rewind after a long pause, playback speeds, chapter navigation and optional auto-next.
- Bookmarks with notes, offline chapter downloads, device-local MP3 imports, and progress/metadata backup and restore.
- Sleep presets of 5, 10, 15, 30, 45 and 60 minutes of playback, plus end of chapter. A timer stops at the current chapter's end if that comes first.

## Install on iPhone

Open the published HTTPS URL in **Safari**. Tap **Share → Add to Home Screen**, enable **Open as Web App** if offered, then Add. Open from the icon, choose the book, tap Play, and lock the phone. Download the chapter first for offline use. Test lock-screen pause, resume and skip once on your iPhone; desktop tests cannot certify your device's iOS behavior.

## Background audio and sleep timers

The app keeps one native `<audio>` element alive; it does not depend on Web Audio running in the background. `navigator.audioSession.type = 'playback'` is set where available. Media Session connects playback to lock-screen/headset controls. Safari can restrict automatic transitions between audio files or resuming after a long background pause; return to the app and tap Play if that happens. An explicit tap is needed to begin playback. These constraints cannot be bypassed by a PWA.

Minute timers prepare a real shortened MP3 using complete MPEG Layer III frames. The audio reaches its own physical end, so stopping does not rely solely on JavaScript continuing to execute while the phone is locked. Preparing a timer may download the current file in full. It counts active playback time, not paused time. Changing speed or seeking recalculates the endpoint. Sleep mode resets when the app is reopened. The first implementation supports MP3 files, not AAC/M4B or protected Audible files.

Auto-next is attempted when no sleep timer is active. A timer always stops at the current chapter boundary, even if its selected duration was longer. MP3 files are never sent to a conversion service.

## Where data lives

Listening position, settings and bookmarks live in localStorage on the current device and web-app origin. Downloaded/imported MP3s live in IndexedDB. No cross-device sync. Safari and an installed Home Screen app may have separate storage; use export/import to transfer progress. iOS can evict web storage under pressure, and clearing website data deletes it. Keep a progress backup. A progress JSON backup does not include audio bytes.

The GitHub repository and GitHub Pages site are public. The included Chapter 6 MP3 is served publicly. Imported MP3s and listening progress stay on the importing device. GitHub Pages is suitable for this MVP; move large libraries to an audio CDN later because Pages has size and bandwidth limits.

## Add chapters or books for all devices

Copy the new MP3 and append an entry to `catalog.json`; keep existing IDs stable. Relative audio paths work on GitHub project Pages. Entries use duration in seconds and the real chapter number. For example:

```powershell
python tools/add_chapter.py --book hollow-throne --chapter 7 --title "Chapter title" --duration 1250.4 --file "C:\path\chapter-seven.mp3"
```

For a new book, also supply `--book-title "New book"` and optionally `--narrator "Narrator name"`. Add a cover path to the catalog if desired. Commit and push to `main` to publish. The GitHub Actions workflow tests the code and deploys static assets to Pages. No npm install is needed. Keep single audio files below GitHub's repository limits; do not commit model weights, WAV masters, credentials or generation intermediates.

The in-app **Add MP3** flow is a convenient device-local alternative; it can add a new book or another numbered chapter to an existing one. It does not publish those files to GitHub or sync them.

## Development and validation

```powershell
npm test
npm run build
python serve.py --port 8770
```

Open `http://127.0.0.1:8770/`. The development server supports audio byte ranges. A plain local-file URL will not provide service workers or normal catalog loading. Service workers require HTTPS in production (localhost is allowed during development).

The tests check persistence round trips, chapter numbering/navigation, catalog validation, speed-adjusted sleep cutoffs and actual MP3 frame truncation. Browser QA covers playback, seeking, pause/resume, saved position, bookmarks, timer preparation and downloads. Physical iPhone lock-screen and Home Screen behavior still needs device testing.

Every GitHub deployment runs `npm run build`, which derives the release/cache version from the actual app, catalog, cover and audio contents. There is no manual service-worker version bump. App updates do not clear progress or downloaded audio. The service worker caches the shell and cover art; audio downloads are explicit, not an automatic 24 MB install-time fetch.

## Platform references

- [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API)
- [Background timer throttling](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout#timeouts_in_inactive_tabs)
- [WebKit background web-app audio tracking](https://bugs.webkit.org/show_bug.cgi?id=198277)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)


## Automatic updates

Future pushes to `main` build and deploy a versioned release automatically. Once the app is hosted, the installed iPhone web app checks on launch, when brought to the foreground or back online, and periodically while open. These checks need connectivity; iOS does not guarantee execution while the app is closed. No reinstall is required.

New books and chapters are refreshed from the catalog without resetting progress. Updated application files download as a complete cached release. The release activates and reloads automatically only when playback is paused, the app is visible, and no form or import/timer operation is active. Position is saved before activation and before reload. Active playback is never deliberately stopped by an automatic update. Settings also provides Check now and, when applicable, Pause & apply update. Playback stays paused after an update; tap Play to resume.

Old application-shell caches are cleaned up after activation. IndexedDB audio and localStorage progress/bookmarks are separate and are retained. If a release cannot download fully, it does not activate; the current offline app remains available. The deployment workflow builds a generated `version.json` and `sw.js` in `_site/`; publish `_site/`, rather than the unbuilt source directory.
