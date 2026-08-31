# Changelog

Notable changes to the set list app, newest first. Dates mark when a batch of
work shipped to the live site.

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
