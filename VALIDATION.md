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


## Paragraph reader and Chapter 7

- All 17 tests pass, including complete chapter-text hashes, ordered paragraph cues, legacy progress/backups, Chapter 6-to-7 navigation and actual Chapter 7 MP3 duration/sleep truncation.
- Chapter 6 reading text now uses 220 conventional paragraphs rather than 462 sentence fragments. Original cue IDs and audio positions are retained; pronunciation spellings are restored to normal names in the reader.
- Chapter 7 is 25:08 (1508.06 seconds), with 235 checked audio clips and the existing Peter Yearsley narrator reference plus six fixed character voices. Local transcription checks covered every clip; the suspect extra-word take was regenerated and matches its script. This is automated audio QA, not a full human listening review.
- Chapter 7 has 229 book paragraphs and seven visible scene breaks. 210 paragraph starts use segment boundaries, 15 use local Whisper word alignment and four are interpolated. Synchronization remains approximate at paragraph level.
- Source checks retain every chapter character apart from formatting/scene markers and the Chapter 6 pronunciation-spelling cleanup. The attachment preamble and trailing editing note are excluded from Chapter 7.
- Browser: both chapters appear in the catalog. Tapping Chapter 7 paragraph 4 sought to 10.8 seconds and started native audio. Opening Read paused audio at the matching paragraph. Reload restored Continue reading at 26 seconds; reopening returned to paragraph 4.
- The reader was checked at a 390 × 844 viewport: prose wraps as multi-sentence book paragraphs, dialogue turns stay separate, and scene ornaments remain visible.
- Existing offline-reader and update lifecycle checks remain applicable: text is cached with the shell, MP3 downloads are explicit, and updates preserve progress/bookmarks/downloads. Physical iPhone behavior still requires device testing.

Publication authorization: the user explicitly approved public publication of any project code, MP3 files, text and timing data on 2026-10-28. The Chapter 7 audio-only release is already deployed; this reader release includes both chapters' full text in book paragraphs. Future pushes to main deploy automatically through GitHub Pages.
