# MVP1 validation

Completed locally on 2026-10-27:

- Unit tests: catalog validation, actual Chapter 6 numbering, persistence round trips, smart resume, timer cutoffs at multiple speeds, and physically shortened MP3 frame parsing.
- Browser: native play/pause and seek, 30-second skip, reload restores saved position, bookmark add/list/delete, download to IndexedDB, reload plays downloaded Blob audio.
- Sleep: choosing five minutes produced a native audio resource ending 300 seconds beyond the current position. End-of-chapter mode stopped at the imported sample's natural end and retained its position.
- Imports: a real MP3 added as a separate device-local book, loaded, and played. Removing its audio retained metadata. Progress-backup import restored the main library and removed test metadata.
- Offline: stopped the HTTP server entirely, reloaded the PWA from the service-worker cache, and successfully played downloaded Chapter 6 from IndexedDB.
- Responsive layout checked at a 390 × 844 iPhone-sized viewport. Sleep, speed, bookmarks and download controls are visible with the transport controls.

Not verified: physical iPhone Home Screen installation, hardware lock-screen buttons, calls/headphone interruptions, storage eviction, or auto-next behavior while iOS suspends the app. These require real-device testing. The app uses native media and Media Session support, rather than claiming a desktop browser can emulate iOS.

GitHub publication remains pending explicit approval for public publication of Chapter 6. Automatic approval review blocked the attempted repository-creation/upload command before it ran. No repository was created and no files were uploaded by that command.


## Automatic-update validation

- Added six update/build lifecycle tests; all ten project tests pass. Tests cover delayed activation during playback/forms, save-before-reload, first-install reload-loop prevention, offline checks, automatic release hashes for code/catalog changes, and failed-install cache isolation.
- Browser upgrade: release `cf8033e87fd4801e` downloaded release `2b8509bac920f4e8` while native audio kept playing. Settings showed the pending update instead of interrupting playback.
- After pausing and closing Settings, the app applied and reloaded automatically. The player returned at 45.6 seconds, the test bookmark survived, and the downloaded chapter remained available. Test bookmark and test listening position were then removed/reset through the normal UI.
- Settings displayed the newly running release ID and a successful Check now result. No reinstall or storage clearing was used for this release-to-release update.
- Initial migration of the unpublished legacy preview required closing and reopening its old tab once; the tested versioned-release flow handles subsequent releases automatically.
- GitHub deployment remains unperformed because explicit approval for public Chapter 6 publication is still pending.
