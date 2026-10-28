# Audio and progress testing

Keep audio QA silent. Prefer deterministic fake-media tests; browser QA must use a muted test copy on an isolated localhost origin. Verify the media element is muted before any possible playback. Do not change the listener's progress by testing on the public app origin or their normal local preview origin.

Public project publication is authorized for code, MP3 files, chapter text and timing data. Keep listening progress and backups local; use synthetic progress records for tests.
