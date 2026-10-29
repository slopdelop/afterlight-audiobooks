# Afterlight — MVP 2

An iPhone-first audiobook PWA, published with GitHub Pages.

**Live app:** https://slopdelop.github.io/afterlight-audiobooks/

**Source:** https://github.com/slopdelop/afterlight-audiobooks No build dependencies, account, backend, paid API or subscription is required.

## Included

- Multiple-book library with a stable, editable JSON catalog.
- The Hollow Throne starts at Chapter 6. Chapters 1–5 were listened to elsewhere; they are not represented as unfinished files.
- Native HTML audio playback, Media Session metadata and play/pause/seek/skip handlers, and a playback audio session where Safari supports it.
- Persistent position for each chapter, chapter completion, smart 10-second rewind after a long pause, playback speeds, chapter navigation and optional auto-next.
- Bookmarks with notes, offline chapter downloads, device-local MP3 imports, and progress/metadata backup and restore.
- Sleep presets plus custom whole minutes (1–1,440), or end of chapter. Minute timers carry remaining listening time across chapters and pause when playback pauses.

## Install on iPhone

Open the published HTTPS URL in **Safari**. Tap **Share → Add to Home Screen**, enable **Open as Web App** if offered, then Add. Open from the icon, choose the book, tap Play, and lock the phone. Download the chapter first for offline use. Test lock-screen pause, resume and skip once on your iPhone; desktop tests cannot certify your device's iOS behavior.

## Background audio and sleep timers

The app keeps one native `<audio>` element alive; it does not depend on Web Audio running in the background. `navigator.audioSession.type = 'playback'` is set where available. Media Session connects playback to lock-screen/headset controls. Safari can restrict automatic transitions between audio files or resuming after a long background pause; return to the app and tap Play if that happens. An explicit tap is needed to begin playback. These constraints cannot be bypassed by a PWA.

Minute timers track actual media progress at the current playback speed, so changing speed, seeking, buffering and pausing do not consume extra listening minutes. Setting, changing or cancelling a timer leaves the current audio source intact and does not pause it. A minute timer carries its remaining time into following chapters, even if ordinary auto-next is disabled. End of chapter is a separate explicit stop option. Timers reset when the app is reopened.

The countdown checks native timeupdate/playback events and a periodic deadline check. If iOS completely suspends web-app JavaScript, a stop may be delayed until execution resumes; this mode cannot promise an operating-system-enforced stop while suspended. This replaces the old shortened-file method, which interrupted playback and stopped at the chapter boundary. Lock-screen resume uses the already-loaded native media element and makes its play request synchronously; optional AudioSession configuration errors do not suppress Play. Physical iPhone lock/resume and timer accuracy still require device testing. WebKit has a reported Home Screen pause/resume issue: https://bugs.webkit.org/show_bug.cgi?id=243258.

Opening a library book or Continue card only opens it. Start playback explicitly with Play. MP3 files are never sent to a conversion service.

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


## Read / Listen (MVP 2)

Chapters 6 and 7 include synchronized reading text in conventional book paragraphs (220 and 229 paragraphs). Open **Read** from the player: audio pauses and the current paragraph is brought into view. Scroll normally to read; the paragraph near the upper part of the screen becomes your saved reading place. Tap a paragraph to select and save it, or use Up/Down while the current paragraph is focused. **Listen** opens the player at that place, still paused; press Play to start. There is no playback bar in reading mode. **Aa** offers named text sizes and a follow-text option for playback started through external media controls.

Reading and audio share the existing per-chapter progress, which is retained across reloads and progress backups. Returning from the library in reading mode offers Continue reading. Updates do not interrupt an active reading view; an explicitly requested update restores that view afterward. Paragraph text is cached with the application, so reading works offline even without a downloaded MP3. Offline listening still requires a downloaded audio file.

The reader uses normal Star Wars spellings, retains quotation marks and dialogue turns, and groups related narrative sentences into paragraphs. Scene breaks remain visible. Pronunciation hints are confined to the spoken production script. Cues combine exact synthesis-segment boundaries with local Whisper word alignment inside longer narration segments. Seven unmatched boundaries were interpolated; synchronization is paragraph-level and approximate, not word-by-word highlighting.

To add synchronized text to a later chapter, place a JSON file under `text/<book-id>/chapter-XX.json` and set that chapter's `transcript` catalog property to the relative path, or pass `--transcript path/to/chapter-XX.json` to `tools/add_chapter.py`. The build automatically includes text files in its release hash and offline cache. Audio-only chapters still work and simply have no Read button. A text file has this shape:

```json
{
  "version": 1,
  "chapterId": "hollow-throne-07",
  "duration": 1200,
  "paragraphs": [
    {"id":"p0001","text":"The first paragraph.","start":0,"end":5},
    {"id":"p0002","text":"The next paragraph.","start":5,"end":1200}
  ]
}
```

Use real audio timings, strictly increasing starts, unique paragraph IDs, and the same chapter ID as the catalog. End times must follow starts and stay within the chapter's duration. Use the chapter-generation script/timeline as the alignment source.

## Simplified interface (October 2026)

The library shows the current book once above other books, with a mini-player only while browsing. The listening screen has Rewind 15 / Play–Pause / Forward 30, larger Speed / Sleep / Bookmark controls, and no fixed bottom navigation. **More (···)** contains downloads, saved bookmarks, chapter history, book details and Settings. Tap the chapter name for the chapter list, Previous/Next and Mark finished. Settings groups progress backups and installation help into expandable sections. Storage keys, chapter IDs, media source, audio files and text cues are unchanged.

## Library and voice profile refinements

The home screen uses a larger Afterlight masthead with no visible Library heading. The Add book entry is hidden; its import handler and form remain for future use. Books and chapters are currently added through the Codex production workflow.

Transient playback/timer messages appear at the bottom, below the player controls. Reading position is tracked without a visual marker by default. **Aa → Debugging → Show current paragraph marker** enables a device-local debugging marker; the preference survives reloads and progress backup/restore.

Julian Vale is the fictional working name of the selected synthetic narrator. The reusable ensemble aliases, generation directions and local reference locations are recorded in `assets/voice-profiles.json`; these are AI profile labels, not credits for human performers. The catalog uses the stable narrator ID `julian_vale`. Both chapter production manifests and their narrator reference paths use this alias. Existing MP3 tags credit generic AI ensemble narration, with no source narrator name; no audio was regenerated or re-encoded for this change.

## Voice review on iPhone

The default **Supporting cast** round provides two direct VoiceDesign candidates for each of the other eleven speaking roles in Chapters 6 and 7: Palpatine, Mas Amedda, Wuher, Duros patron, second patron, the Darren-like recorded officer, security droid, Imperial admiral, Janus Greejatus, intelligence officer and Sim Aloo. This includes roles that already had preset-based voices. Detailed acoustic descriptions target recognizable screen characters where a speaking performance is established; original interpretations are explicitly identified. Minor roles have shorter book excerpts. Use **Jump to character**, expand prompt/settings details, rate and choose favourites independently. Open with `?audition=cast`. Earlier rounds remain in the **Audition round** selector.

`assets/character-voice-policy.json` records VoiceDesign as the preferred future character-creation workflow. Julian Vale and the approved Han 07 / Leia 01 recordings remain fixed. New candidate WAVs, model revision, descriptions, source segment IDs, seeds, resolved settings and retry histories are retained locally under `outputs/supporting-cast/`. Existing chapter audio, text, credits and historical cast manifests are unchanged. Candidate selection and full-reference consistency validation precede further chapter generation.

The **VoiceDesign 2** round contains 24 direct `Qwen3-TTS-12Hz-1.7B-VoiceDesign` auditions: four user-supplied descriptions per character, independently sampled three times each. The descriptions emphasize vocal acoustics and timing; the C descriptions explicitly reference original-trilogy portrayals. Audio contains only Chapter 6 character dialogue: no narrator, reference recordings, conversion, cloning or training. Each is one continuous generation. Exact descriptions, seeds, model revision and effective settings are expandable. Generation uses the pinned model's defaults (talker and subtalker temperature 0.9, top-p 1.0, top-k 50, repetition penalty 1.05; token ceiling 8192), with no sampling overrides. Open with `?audition=design`; rate and choose a favourite independently for each character, then copy results. Candidate numbers do not reveal prompt families.

The six earlier direct samples remain under **VoiceDesign 1**, with their original IDs and audio. Favourites are stored per round, including migration of earlier VoiceDesign choices. Local WAV takes, descriptions, pinned model revision, seeds, resolved defaults, transcript checks and every retry are retained under `outputs/voice-design-round2/`. No candidate is automatically installed in the chapter cast.

The **Original casting** round offers three neutral candidates per character, about 40–45 seconds each: the unchanged Julian Vale narrator, then two Qwen CustomVoice presets with supported original-character directions (Han: Ryan/Aiden; Leia: Vivian/Serena). Base does not support delivery instructions, so extra narrator interpretations were omitted. No VoiceDesign, actor references or training were used for this round. Expand each candidate's details to see the method, and expand the character's script to read the excerpts. The narration audio between turns and the opening are reused across candidates. **Choose favourite** saves Han and Leia independently without changing production casting; **Copy results** includes those choices. Open this round directly with `?audition=original`.

**Previous auditions** retains the earlier eight samples and their star ratings. Rating changes merge with other rounds rather than discarding their scores. Favourites use the separate `afterlight-casting-favourites-v1` key.

Open **Settings → Voice review** to play the Han/Leia casting samples and tap one to five stars for each voice. The Han comparison contains two versions each from Seed-VC, fine-tuned GPT-SoVITS, and trained RVC. All read the same Chapter 6 dialogue. Seed-VC and RVC convert an existing synthetic performance; GPT-SoVITS generates speech from text. The two Leia samples from Round 2 remain available. These are synthetic auditions, and no selection changes the chapter audio automatically. **Clear rating** returns a voice to Not rated. At the end, **Copy results** copies a readable list with stable voice IDs, descriptions and scores for pasting into Codex. If clipboard access is unavailable, the app exposes selected text for manual copying.

Ratings save immediately on the current device under the separate `afterlight-voice-ratings-v1` key and survive application updates; they do not automatically sync or change production casting. Ratings are separate from listening-progress backups; copy your review results to keep them elsewhere. Samples are hosted with Afterlight on GitHub Pages, so your computer does not need to be running. Sample playback requires a connection; chapter downloads and offline reading work as before.

The review uses one dedicated sample audio element. Playing a sample pauses chapter playback; switching samples, leaving the review or closing Settings stops the previous sample. The chapter's source and saved position are retained. Media Session commands target the active sample while reviewing and return to the audiobook afterward.

Add future samples under `audio/voice-review/` and append their stable ID, role, name, description, relative source path and duration to `assets/voice-auditions.json`. The voice list and module are versioned with the app; sample MP3s are fetched on demand.
