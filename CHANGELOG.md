# Changelog

Notable changes to the set list app, newest first. Dates mark when a batch of
work shipped to the live site.

## 2026-10-30 — Christmas Show script entered

### 17 Cameron Bits added for The Christmas Show (2026)
All non-song moments from the Christmas show script are now in the app as
Cameron Bits, tagged to the Christmas Show, ready to drag into the setlist:

- **Opening Intro** (Emcee · Brett)
- **The Season Begins** (Narration · Spencer, Brett)
- **Summer of '69 Bit** (Emcee · Kenny, Spencer)
- **Kids These Days / UFO Exchange** (Emcee · Brett, Dave)
- **Set the Mood — Christmas Song Story** (Narration · Spencer)
- **Chestnuts Quip** (Emcee · Brett)
- **Matt Intro — Shake Up Christmas** (Emcee · John)
- **Feliz Navidad Transition** (Transition · TBD)
- **Intermission Announcement** (Emcee · Brett)
- **Act Two Re-Entrance** (Emcee · Brett)
- **Dads Narration** (Narration · Chris, John)
- **Band Introductions + The Long Way Home** (Emcee · Brett, Spencer)
- **Turning Toward the Manger** (Narration · Spencer, Brett)
- **A Drummer's Gift** (Narration · Matt)
- **The Reason for It All** (Narration · Brett, Spencer)
- **Silent Night Intro** (Emcee · Brett)
- **Send-Off** (Narration · Spencer, Kenny, Brett)

Each bit includes the full script text, LX cues, staging notes, and wardrobe
cues from the show script. Edit any bit in Song Manager → Cameron Bits.

## 2026-10-30 — Cameron Bits show association & button

### Cameron Bits — show tagging
- Each Cameron Bit now belongs to a specific show — the **Show** dropdown in the
  bit form defaults to the active show but can be changed to any show
- The Cameron Bits Manager only shows bits for the active show (switch shows to
  see that show's bits)
- The **+ Add Cameron Bits** picker in the setlist only offers bits tagged to the
  active show

### Add Cameron Bits button — next to Lock
- The **+ Add Cameron Bits** button (desktop) and **+ Bits** button (mobile) now
  sit right next to the **Lock / Unlock** button in the setlist header — only
  visible when the set is unlocked and the show has bits
- Previously the button appeared on the far left of the header controls

## 2026-10-30 — Multi-speaker Cameron Bits

### Cameron Bit speaker field — multi-select
- The **Speaker** field in Cameron Bits is now a chip picker — tap any combination
  of names to mark who's on mic for that bit (Brett, Spencer, Kenny, John, Chris,
  Matt, Dave, All)
- Previously a single-select dropdown; saved as comma-joined string ("Brett, Spencer")
  so all existing display code stays the same

## 2026-10-30 — Cameron Bits

### Cameron Bits — show script management
The setlist can now hold more than songs. Cameron Bits are script elements
(narrations, emcee intros, lighting cues, wardrobe changes, transitions) that
live inline in the set order alongside songs.

**Song Manager → Cameron Bits tab**
- Add, edit, and delete Cameron Bits in a new tab inside the Song Manager (⚙)
- Each bit has: **Title**, **Type** (Narration / Emcee / LX cue / Wardrobe /
  Transition), **Speaker** (Brett, Spencer, Kenny, John, Chris, Matt, Dave, All),
  optional **Duration**, and a **Script / notes** field for the full text or cues
- Filter chip bar lets you view all bits or filter by type

**Setlist Builder — bits inline with songs**
- A **+ Cameron Bit** button in the setlist header (only visible when you have
  bits and the set is unlocked) opens a picker to add any bit to the end of the
  set
- Bits appear as teal accent rows in the setlist, labelled with type and speaker
- Bits are draggable — drop them anywhere in the set order between songs
- Setlist now uses a `items` array in Firestore (song + cameron entries) while
  keeping a `songIds` field for backward compatibility with Prompter / Charts

**Web Prompter — Cameron Bit full-screen view**
- Cameron Bits appear as their own entries in the Prompter's navigation (sidebar
  shows them in italic teal, numbered separately from songs)
- Tapping into a bit shows its type badge, speaker, and full script text in a
  large, readable font — swipe or ← / → to navigate like any song section
- The "up next" strip tells you when a bit is coming after the current song

## 2026-10-30 — Band Charts & Prompter improvements, app renamed to Bueller

### App renamed
- The set list app is now called **Bueller** — browser tab, bookmarks, and link
  previews all show "Bueller | Sick Day with Ferris".

## 2026-10-30 — Band Charts & Prompter improvements

### Band Charts — Edit chart link
- **✎ Edit chart** link on every song card in Band Charts opens the main app
  with the chart editor for that song already open — no hunting through Song
  Manager. Hidden from print.

### Web Prompter — responsive layout
- **iPad landscape**: song list is a permanent side panel; tap any song to jump
  to it without leaving the chart view.
- **iPad portrait / iPhone**: song list collapses to a slide-over overlay
  (tap ☰, then tap a song to jump, or tap outside to dismiss).
- Orientation changes switch modes live — no reload needed.

## 2026-10-29 — Web Prompter rebuild, set list lock & band charts nav

### Web Prompter — section-by-section navigation (complete rebuild)
- **Collapsible song list** — tap ☰ in the header to slide open the full set
  list; tap any song to jump directly to it; tap outside or ✕ to collapse.
- **Matches the Pi stage prompter** — the web Prompter View now works the same
  way as the physical Pi prompter on stage: one chart section fills the screen
  at a time instead of scrolling through the whole chart.
- **← Prev / Next →** buttons and **swipe left/right** step through sections;
  at the end of a song's sections the next tap moves to the next song.
- **Keyboard navigation**: Arrow Right / Down / Space = next; Arrow Left / Up = prev.
- **Section progress dots** at the bottom show how far through the song you are;
  tap any dot to jump directly to that section.
- **Up-next strip** below the content shows the next section label, or the next
  song's title and key when you're on the last section.
- **Note bar** (amber) shows Patrick's per-song sound notes on every section.
- Long lines wrap correctly — no more text running off the right edge.

## 2026-10-29 — Set list lock & band charts nav

### Band Charts — floating navigation
- **← Prev / ↑ Top / Next →** floating pill bar at the bottom of the Band
  Charts page. Jumps between songs without scrolling back to the TOC.
  Previous is grayed out on the first song, Next on the last. Hidden from print.

### Set list lock

- **Lock set list** — a new **Lock / Unlock** button in the setlist header
  (both mobile and desktop) prevents any changes to the set order once you're
  happy with it. When locked:
  - Drag-to-reorder is disabled (handles go faint)
  - Remove buttons are hidden
  - Adding songs from the library shows a "Set is locked 🔒" toast
  - Build Set / Generate Set buttons are grayed out
  - 🔒 icon appears next to the song count as a reminder
  - Lock state is stored in Firestore so it survives refreshes and syncs
    to every device

## 2026-10-27 — Pi prompter rebuild, band charts fixes & charting tools

### Pi Stage Prompter (complete rebuild)
- **Section-by-section navigation** — each `[SECTION]` in a chart is its own
  full-screen page on the Pi. BACK/NEXT steps through sections; a faded
  preview at the bottom shows what's coming next.
- **ChordPro inline chords** — chords render above the word they fall on,
  matching the iPad prompter view in the web app.
- **Pulls all shows from Firestore** at boot and caches to localStorage for
  offline use. No more single-show JSON file — all four shows stay in sync
  automatically.
- **Long press SELECT → main menu from any screen** — previously only worked
  from inside a song. Now works from set list, shows, options, sync, everywhere.
- **Long press BACK from set list → shows screen** (long press BACK inside a
  song still jumps to the top of that song).
- Removed the keyboard `0` key shortcut — foot switch has no 0 key.

### Band Charts page
- **TOC links now work** — clicking a song in the set list at the top actually
  scrolls to that song (the anchor IDs were mismatched).
- **Chords on/off now works** — toggling chords hides chord rows; previously
  the button changed color but had no effect on the chart.
- **Print now looks clean** — charts print on white paper with readable text;
  previously all dark backgrounds printed as black boxes.

### Chart ↗ button — single-song view
- The **Chart ↗** button on each setlist song now opens just that one song's
  chart in a new tab instead of the full band charts page. The link is
  shareable — send it directly to a bandmate for one chart.

### ChordPro Converter tool
- New **Convert format ↗** button in the Chart Editor (next to "Search chords
  online"). Opens a conversion tool: paste a traditional chord chart (chords
  on a line above lyrics, as found on Ultimate Guitar) and get inline
  `[bracket]` ChordPro format ready to paste into the chart source.

## 2026-10-26 — Pi auto-sync via GitHub Action

- **Nightly Pi sync** — a GitHub Action now exports `library.json` from
  Firestore every night and commits it to the repo. The Pi can pull it on boot
  (or cron) without needing a USB stick swap to pick up new songs or charts.

## 2026-10-25 — Mobile overhaul, UI polish & data fixes

### Mobile & UI
- **Mobile overhaul** — redesigned action toolbar, SDWF band fonts applied
  throughout, color-coded action buttons (coral = destructive, teal = share,
  purple = build), and a **Chart ↗** button on every setlist song.
- **Meta bar** — show name now appears on its own line above the date, venue,
  and buttons so it doesn't get crowded.
- Renamed the **+** button to **+ New Show** so its purpose is obvious.

### Confirmations
- **Remove song** now requires a confirmation tap before removing a song from
  the set list.
- **Generate Set** warns before replacing an existing set, with an option to
  save the current set as a duplicate show first.

### Data fixes
- Song IDs standardized to numeric format across Firestore — fixes edge-case
  lookup mismatches that could cause songs to show as blank.
- Protected chart data during song migration — a `batch.set` was silently
  wiping chart text on every sync.

## 2026-10-24 — Power rankings, shareable pages & SDWF brand refresh

### Power Rankings
- Added a **power ranking** to every song in the library (1–51), sourced from
  the band's master ranking sheet, reflecting how well the band knows each song.
- Song Library now defaults to sorting by **Ranking** — most road-ready songs
  first, Christmas songs at the bottom.
- **Generate Set → Power Ranking** preset: pulls the top-ranked songs in strict
  order, no shuffle, so the generated set always reflects the band's best-known
  material.
- Performance **notes** from the band's song sheet (e.g. "KF solo", "MH start",
  "JH elec / KF acoustic") are now stored per song and surfaced on the stage
  prompter.
- Added 3 songs missing from the library: *Wasting My Time*, *Some Kind of
  Wonderful*, *The Power of Love*.

### Shareable Set List Page
- **Export** now opens a **Share** panel with a copyable public link
  (`?setlist=SHOW_ID`) instead of going straight to print.
- The shareable page is a clean, mobile-friendly read-only view of the set list
  — band name, show details, numbered song list — anyone with the link can open
  it on their phone.
- Share panel also has **Open Page ↗**, **Copy as Text**, and **Print**
  as secondary options.

### Voting improvements
- VotePanel now offers a **Custom** timer option — tap Custom, enter any
  duration from 1–60 minutes, and open the vote.
- Fixed the crowd voting page (`?vote=`) being unscrollable on mobile — the
  app's global `overflow: hidden` is now lifted for public-facing pages.
- "Sick Day with Ferris" on the voting page is larger and in brand coral so
  the audience immediately knows whose show they're at.
- Shared voting links now show **"Sick Day with Ferris — Vote for the Next
  Song"** in iMessage / link previews instead of "Set List Builder".

### Visual refresh
- Entire app re-themed to match **sickdaywithferris.com**: dark navy
  (`#1a1a2e`) background, `#ff6b6b` coral, `#4ecdc4` teal.
- All secondary text tiers bumped up in brightness — the greyed-out labels
  that were hard to read on the dark background are now clearly legible.
- Fixed print export: set list prints white-on-black with buttons hidden.

### Band Charts shareable link
- The band charts page now has its own shareable URL (`?charts=SHOW_ID`) —
  open it on any device without going through the main app.
- Fixed **Open Page ↗** button — was silently blocked by the popup blocker;
  now uses a real `<a>` link so it always opens.

## 2026-08-30 — Bulk Import Charts

- Song Manager (⚙ Songs) now has a **Bulk Import Charts** button: paste a
  whole multi-song chart document and it splits it into per-song charts by
  matching lines against the library's song titles (falling back to a
  song's notes, so a medley entry can catch the individual titles it's
  made of), then saves the matched ones in one batch. Anything before the
  first match is held aside to assign manually.
- Loaded chart text for all 17 songs in the Christmas set from the band's
  charts PDF.

## 2026-08-29 — Stage Prompter export & Chart Editor

- **Chart Editor** — Song Manager can now hold a lyric/chord chart per song.
  Chords in `[brackets]` render above the word they land on, `[SECTION]`
  lines become banners, and a live stage preview shows exactly what the
  prompter will display. Includes quick-insert chips for common section
  labels and a preview-only key transpose (never rewrites the saved chart).
- **"Search chords online"** link in the Chart Editor opens an Ultimate
  Guitar search for the song as a starting point to copy from.
- **"↓ Prompter file" export** — a new toolbar button next to Export writes
  a `prompter-<show>.json` with the set order, key, BPM, notes, and any
  chart text, for the Pi to read off a USB stick.
- Added the **Raspberry Pi stage prompter** as a companion app in
  [`pi/`](./pi/SETUP-PI.md) — a kiosk-mode lyric monitor with a 3-button
  GPIO footswitch (back / select / next) for hands-free page turns. It's a
  one-way, no-network handoff: the web app is the song database, the Pi is
  a display.

## 2026-07-05 — Visual refresh

- Switched the whole app to a lighter, higher-contrast color scheme for
  easier reading on stage and in bright rooms.

## 2026-06-19 — Christmas set & library filters

- Added a dedicated 17-song Christmas set (with performer notes) and a
  one-click **Christmas Set** button that loads the whole thing into the
  active show.
- Song Library: **genre filter chips** and an **Add All** button to bulk-add
  a filtered view straight into the set.
- The song library now auto-seeds any songs missing from Firestore instead
  of silently dropping them.
- Fix: the live show-mode set list now reorders by vote count while a vote
  is open, so it matches what will actually play next.

## 2026-05-28 — Live crowd voting

- Band members can open a **timed crowd vote** on the remaining set; the
  audience votes from their phones by scanning a QR code.
- Set list automatically re-sorts by vote count when the timer ends (or a
  band member closes the vote early); voting can be paused and resumed.
- Added a set timer, key display on each song, and a warning when two songs
  in a row share the same key.

## 2026-05-23 — Song Manager, real-time sync, mobile

- **Migrated shows to Firestore** — set lists now sync live across every
  band member's device instead of living in one browser's local storage.
- Added **Song Manager** (⚙ Songs): add, edit, and delete songs directly
  from an in-app admin panel, with per-song sound notes (key, cues, EQ,
  tempo changes).
- Replaced browser `alert`/`confirm` popups with in-app toast and confirm
  dialogs (and fixed the toast being invisible on mobile Chrome).
- Added a dedicated **mobile layout** with a bottom tab bar, and fixed
  viewport clipping on real phones.

## 2026-05-22 — Initial release

- Drag-and-drop set list builder with a 48-song library (sortable by BPM,
  genre, year, popularity, or emotional arc).
- **Generate Set** — auto-build a set from presets (Random Shuffle, Crowd
  Pleasers, High Energy, Mellow Vibes, Country Night, Rock Block, or a
  structured Show Arc).
- Multiple shows with saved set lists; band members can save their own
  suggested set and reload it later.
- Print / copy-to-clipboard export.
