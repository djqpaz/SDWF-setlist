# Pi Prompter Changelog

## 2026-10-27

### Fixed — section headers parsed as chords
`[CHORUS]`, `[BRIDGE]` etc. were being mistaken for chord tokens because
the isChord regex allowed any letters after a valid root (C + HORUS = "chord").
Tightened to only accept real chord suffixes (maj, min, m, sus, add, aug,
dim, numbers, slash bass). Section headers now always render as their own
green banner page.

### Fixed — long press SELECT loops back to Storage | Sync
When long-pressing SELECT to return to the main menu, `menuSel` stayed
on whatever item was last active. Any accidental short press after landing
would re-enter that screen. Now resets `menuSel = 0` (Set List) on every
long-press return to menu.

### Fixed — long press SELECT only worked from live view
Removed the `if (S.screen !== "live") return` guard from `handleLongPress`.
Long press SELECT (Enter held 700ms) now returns to main menu from **any**
screen — live, setlist, shows, options, sync, or foot switch config.

### Fixed — long press BACK from setlist
Long press BACK (ArrowLeft held 700ms) from the setlist screen now navigates
back to the shows list. Long press BACK inside a song still jumps to the
top of that song (section 0).

### Removed — 0-key main menu shortcut
`handleShortPress` had `if (k==="0") { S.screen="menu" }` — removed.
The foot switch has no 0 key and it was confusing alongside the long press
SELECT approach.

---

## 2026-10-26 — Full Rebuild

Complete rewrite of `prompter.html`. Previous version used a single-song
browser-localStorage library loaded from a static JSON file. New version:

### Section-by-section navigation
Each `[SECTION NAME]` header in the chart is its own page. NEXT/BACK on the
foot switch steps through sections within a song, then advances to the next
song when the last section is reached. A faded NEXT preview at the bottom of
each page shows the upcoming section label.

### ChordPro inline chord rendering
Chords stored as `[G]word [C]other` in Firestore charts render as amber
chord boxes floating above the lyric word, matching the iPad prompter view
on the website.

### Pulls all shows from Firestore
Boot sequence fetches all shows and songs from the Firestore REST API, then
caches to localStorage for offline use. No more single-show static JSON.
Storage | Sync screen shows last sync time and a SYNC NOW button to force
a re-pull.

### Removed Song Editor from menu
Menu is now: Set List · Live View · Song Options · Storage | Sync · Foot Switch.
Song editing happens in the web app, not on the Pi.

### Color / layout
- Amber `oklch(0.78 0.15 75)` — song header, meta strip, chord boxes, selection
- Green `oklch(0.72 0.16 150)` — section banners, sync success, note strip
- JetBrains Mono throughout
- Portrait 1080×1920 layout; `.lines` flex with `min-height:0`, NEXT preview
  capped at 160px so content never gets squeezed off screen
