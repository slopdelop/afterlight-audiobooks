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

## Progress and finished-chapter fixes

- Reproduced the old metadata/seek race in a silent fake-media test: a saved 600-second position was overwritten with zero before the deferred seek completed. The regression passes after the fix.
- Audio restoration now waits for confirmed media position and data. Failed/rejected/delayed seeks preserve progress and can retry; superseded source loads are cancelled.
- Completed chapters restore at their end instead of zero. Continue offers the next unread chapter. A finished timestamp survives replay and progress backup/restore; legacy completion flags migrate into that history.
- Chapter-list Mark finished repairs missing completion records explicitly. Initial/end-position restoration does not trigger automatic playback.
- Isolated localhost browser test used a muted audio element throughout. A 600-second position survived reload and a service-worker release change. Marking Chapter 6 finished survived reload, and the library offered Chapter 7. No live user-origin progress was used for these tests.
- All 23 tests pass. Physical iPhone seek/update timing still needs device confirmation; this fixes the reproduced failure without claiming to know the exact sequence on the user's phone.

## Playback controls and continuous sleep timers

- All 32 automated tests pass. Added regression coverage for opening without autoplay, unchanged audio source while configuring timers, remaining time across chapters even with ordinary auto-next disabled, pause/buffer/seek/speed behavior, delayed callbacks, invalid custom values and synchronous native Play despite an AudioSession exception.
- Replaced shortened-file sleep playback with an event-driven listening-time countdown and periodic deadline check. Timer controls no longer pause, download/rebuild or replace the active source. This supersedes the original native-shortened-MP3 sleep validation above. A stop can be delayed if the platform fully suspends JavaScript; this implementation does not claim an OS-enforced background cutoff.
- Isolated, muted localhost browser check: clicking the library book opened it paused at 0:00. Explicit Play started the muted element. Entering 25 custom minutes left the same chapter MP3 playing. Seeking to the chapter end advanced to Chapter 7 with roughly 24:48 still on the timer. Pause held the timer; Play resumed from the same source/position.
- Custom minutes accept whole values from 1 to 1,440; End of this chapter remains a separate choice. Settings now describes timer-aware chapter continuation.
- Native play is requested directly from the control path; optional AudioSession errors cannot block it. The loaded source stays intact on pause and timer changes. Physical iPhone lock-screen pause/resume remains unverified; WebKit report 243258 documents a Home Screen PWA resume problem.
- Browser tests never changed the public app's stored listening position and were muted throughout.
