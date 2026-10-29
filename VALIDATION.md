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
- Chapter 7 is 25:08 (1508.06 seconds), with 235 checked audio clips and the existing Julian Vale narrator reference plus six fixed character voices. Local transcription checks covered every clip; the suspect extra-word take was regenerated and matches its script. This is automated audio QA, not a full human listening review.
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

## Simplified UI release — 2026-10-28

- Consolidated the stylesheet into shared foundations and library/player/reader/sheet components. Replaced fixed bottom navigation with contextual navigation; browsing retains the mini-player. Current book is excluded from the additional-books grid unless searching.
- Main transport: 88px Play, 60px skips; compact 80px Play on short phones. Three secondary controls, readable captions and rounded bottom sheets. Download, bookmarks and maintenance moved to More. Chapter history and Mark finished retained.
- Reader uses semantic prose with a single current-paragraph keyboard focus target. Taps and keyboard selection save the reading position without playback. Listen seeks to that position and opens the paused player. No prominent reader Play button or playback bar. Aa includes text sizes and follow preference.
- 36 automated tests pass, including four new checks for paused paragraph selection, paused Listen navigation, keyboard selection boundaries and remote chapter actions independent of DOM transport buttons. Existing progress, finished-history, audio loading, timer and update tests pass. Production build succeeds with automatic release hashing.
- Final browser QA used a separate localhost origin with the native audio element confirmed muted. Checked 390×844 and 375×667: transport, Speed/Sleep/Bookmark fit without overlap. Checked 844×390 landscape and Extra large reader text: no horizontal overflow. A custom 27-minute timer was set during muted native playback; playback remained running. Chapter navigation stayed paused and retained the timer. Reader paragraphs and Listen stayed paused at the selected cue. More, chapters, Settings and Aa sheets opened correctly.
- No user listening progress or public-origin storage was used for testing. Physical iPhone safe-area behavior, system text scaling/200% text zoom, VoiceOver and lock-screen operation remain real-device checks; no new iOS background playback guarantee is implied by this visual change.

## Home, notifications and narrator aliases — 2026-10-28

- Removed visible home-screen Library heading, hid the Add book control while retaining import support, and increased the mobile masthead to 100px with a 33px brand wordmark.
- Moved transient player notifications to 16px above the bottom safe area. Isolated 375×667 browser check: Sleep button bottom 519.5px, timer notification top 602.2px, so they do not overlap. Browsing notifications still clear the mini-player.
- Reader marker defaults off. Aa → Debugging enables it without changing tracking. Browser confirmed no border by default, visible border after opt-in, and persisted opt-in after reload; Listen and book opening stayed paused. Added a regression for the new setting's default, strict restoration and retained reading progress.
- Catalog and production manifests now use the fictional synthetic profile Julian Vale. Saved 14 reusable narrator/ensemble profile aliases in assets/voice-profiles.json. Both existing MP3 metadata blocks were inspected silently with FFmpeg: title, generic AI ensemble artist, synthetic-voice comment; no source narrator credit. MP3 bytes and timing cues were left unchanged.
- Browser QA used an isolated localhost origin with the native audio element confirmed muted; public listening progress was not used.

All 37 automated tests pass and the production build succeeds. All 14 local reference files exist, both production scripts compile, and the aliased narrator audio matches the original cached reference hash.

## Settings voice review — 2026-10-28

- Settings now contains a Voice review submenu with eight hosted samples: three new candidates and the existing voice for each of Han and Leia. Accessible native radio groups supply five 48px star targets per voice; ratings can be cleared and are saved separately from audiobook progress.
- Copy results includes every stable voice ID, its description, score or Not rated, and the casting-round identifier. Clipboard write is requested synchronously from the tap handler for Safari; denied/unavailable clipboard access exposes selected text for manual copying. Clipboard success/failure and the fallback UI are tested with fake clipboard objects, without reading or replacing the user's system clipboard.
- All 42 automated tests pass and the production build succeeds. Tests cover the published samples, strict ratings restoration and round trips, export text, clipboard timing and fallback, plus existing chapter/reader/progress/timer/update behavior. Remote media tests verify active review controls do not advance the audiobook.
- Isolated 390×844 browser QA: all eight entries and 40 star choices render without horizontal overflow. Han A 4/5 and Leia B 5/5 survived reload. Both the chapter and review audio elements were confirmed muted before playback. Playing Han A and switching to Han B used one preview element; Chapter 6 stayed paused at the synthetic 119.1-second position with its original source. Closing the submenu paused the preview and retained the chapter place. No runtime errors were logged.
- All original chapter audio and text files remain unchanged. Only the eight generated audition MP3s are included, with no downloaded film reference clips. Device-only ratings and synthetic QA records are not published. Physical iPhone clipboard prompts and hardware lock-screen behavior remain real-device checks.

## Cleaned-reference casting round 2 — 2026-10-28

- Retired the eight first-round audition/baseline MP3 copies from the published review list and replaced them with four fresh files: two samples each for Han and Leia. Production chapters, text cues and selected production voice profiles are unchanged.
- Reference speech was separated with Demucs HTDemucs and lightly denoised before conditioning. Each new sample is one continuous generation. Method A uses cleaned reference audio plus transcript; Method B uses its speaker embedding only. Seed and reference are held fixed across the two methods per character.
- All four MP3s fully decode, have no clipped PCM samples, match the requested words in local Whisper checks, and sit within 0.5 LU of the target −20 LUFS. Four-second speaker-window cosine minima range from 0.9703 to 0.9859. This is a heuristic screen using the synthesis model's encoder, not a perceptual guarantee or independent likeness evaluation.
- New round-specific IDs prevent old ratings attaching to new recordings. Review persistence/export tests now cover the four-item catalog and explicitly reject first-round IDs. The round is shown in the review submenu and copied results.

All 42 tests pass and the production build succeeds. On the isolated muted browser origin, the app loaded four new entries, showed Round 2, and ignored all previous-round scores. A new Han A rating saved successfully and its MP3 played through the separate preview element. The existing chapter source remained selected; no public-origin listening data was used.

## Chapter 8 — 2026-10-29

- Added Below the Clouds as `hollow-throne-08`: one 1,362.95-second MP3, assembled from 300 synthesis clips, and 289 synchronized book paragraphs. A normalized source hash verifies that all manuscript words remain in the reader. All 178 quoted utterances were assigned to speakers.
- Retained Julian Vale's original reference and narrator configuration. Leia uses the user-selected Candidate 01 WAV and transcript with full-reference conditioning. Lando, C-3PO, Commander Venn and both recording voices use fixed genuine VoiceDesign references, with seeds, directions and hashes retained in local production records. New reusable profile aliases are saved in the app registry.
- Every clip passed signal and automated transcription screens. Focused review repaired two incomplete passages, an extra word and ambiguous narration tags. Context-generated repairs retain only the requested tag, excluding the surrounding generation context. ASR checks cannot establish subjective voice quality. Final MP3 fully decodes; measured loudness is -20.47 LUFS with -1.91 dBTP true peak.
- All 56 tests pass and the versioned production build succeeds. New tests cover complete Chapter 8 reading text and timing, MP3 duration/sleep slicing, and moving from completed Chapter 7 without losing older progress.
- Isolated 390 x 844 browser QA confirmed Chapter 8 in the chapter picker, paused opening at the correct MP3, native decoding/playback, 289 reader paragraphs and no horizontal overflow or console errors. The audio element was verified muted before playback and remained muted. Testing used only port 8792; public and normal preview progress were not touched. The temporary viewport was reset and the test tab closed.
- Chapters 6 and 7 audio/text, application playback logic and storage keys remain unchanged. Physical iPhone playback behavior is inherited from the existing app and was not tested on hardware in this run.
