# MVP1 validation

Completed locally on 2026-10-27:

- Unit tests: catalog validation, actual Chapter 6 numbering, persistence round trips, smart resume, timer cutoffs at multiple speeds, and physically shortened MP3 frame parsing.
- Browser: native play/pause and seek, 30-second skip, reload restores saved position, bookmark add/list/delete, download to IndexedDB, reload plays downloaded Blob audio.
- Sleep: choosing five minutes produced a native audio resource ending 300 seconds beyond the current position. End-of-chapter mode stopped at the imported sample's natural end and retained its position.
- Imports: a real MP3 added as a separate device-local book, loaded, and played. Removing its audio retained metadata. Progress-backup import restored the main library and removed test metadata.
- Offline: stopped the HTTP server entirely, reloaded the PWA from the service-worker cache, and successfully played downloaded Chapter 6 from IndexedDB.
- Responsive layout checked at a 390 × 844 iPhone-sized viewport. Sleep, speed, bookmarks and download controls are visible with the transport controls.

Not verified: physical iPhone Home Screen installation, hardware lock-screen buttons, calls/headphone interruptions, storage eviction, or auto-next behavior while iOS suspends the app. These require real-device testing. The app uses native media and Media Session support, rather than claiming a desktop browser can emulate iOS.

Public publication of the app and Chapter 6 MP3 was explicitly approved. The repository is https://github.com/slopdelop/afterlight-audiobooks and the app is https://slopdelop.github.io/afterlight-audiobooks/.


## Automatic-update validation

- Added six update/build lifecycle tests; all ten project tests pass. Tests cover delayed activation during playback/forms, save-before-reload, first-install reload-loop prevention, offline checks, automatic release hashes for code/catalog changes, and failed-install cache isolation.
- Browser upgrade: release `cf8033e87fd4801e` downloaded release `2b8509bac920f4e8` while native audio kept playing. Settings showed the pending update instead of interrupting playback.
- After pausing and closing Settings, the app applied and reloaded automatically. The player returned at 45.6 seconds, the test bookmark survived, and the downloaded chapter remained available. Test bookmark and test listening position were then removed/reset through the normal UI.
- Settings displayed the newly running release ID and a successful Check now result. No reinstall or storage clearing was used for this release-to-release update.
- Initial migration of the unpublished legacy preview required closing and reopening its old tab once; the tested versioned-release flow handles subsequent releases automatically.
- GitHub Pages deployment passed its automated tests. The published app, catalog and install manifest return HTTP 200; the Chapter 6 MP3 serves HTTP 206 byte-range responses for streaming and seeking.

- Live-site startup QA found and fixed a navigation race: initial metadata loading no longer overrides a user who has already opened the player.


## Paragraph reader (MVP 2)

- Source mapping checked every non-whitespace chapter character (apart from Markdown heading markers). Reader text preserves all 462 original paragraphs, including quoted dialogue and narrator tags in the same paragraph.
- 51 multi-paragraph audio segments aligned using offline Whisper word timestamps. 213 paragraph starts use synthesis segment boundaries, 242 use matched word timestamps, and 7 are interpolated.
- Added paragraph boundary, malformed transcript, complete chapter text and legacy backup/reading progress tests; all 14 tests pass.
- Browser: audio at 30 seconds opened paragraph 7, including its dialogue tag. Tapping paragraph 101 sought to 291.92 seconds and began playback.
- Manual scrolling updated the reading place. Leaving for the library and reopening the app restored the location shown in Continue reading; Listen resumed from the same paragraph.
- Stopped the local server and removed the MP3 download: the app reopened offline with all 462 paragraphs at the saved reading place.
- Reader mode defers automatic updates; an explicit update preserves the reading location and font-size preference.
