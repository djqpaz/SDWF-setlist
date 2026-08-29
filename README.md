# Sick Day with Ferris — Set List Builder

The band's set list app: a shared, real-time tool for building, voting on, and
running show set lists, plus a song database with lyric/chord charts that
feeds a Raspberry Pi stage prompter.

Everyone in the band sees the same set list update live — no more group texts
about which version of the set list is current.

## Features

**Set list builder**
- Drag-and-drop reordering of songs into a set
- Multiple shows in flight at once, each with its own set list
- "Generate Set" — auto-build a set from presets (Random, Crowd Pleasers,
  High Energy, Mellow, Country Night, Rock Block, or a structured
  opener → build → peak → ballad → closer arc)
- Band members can save their own suggested set under their name; anyone can
  load a suggestion into the active set list
- Set timer, key display, and a warning when two songs in a row share a key
- Copy-to-clipboard and print export

**Song library**
- Sort by title, BPM, year, popularity, or emotional arc
- Filter by genre, search by title/artist
- "Add All" to bulk-add a filtered view to the current set

**Song Manager**
- Full song database lives in Firestore — add, edit, delete from the in-app
  admin panel (⚙ Songs)
- Per-song sound notes (key, cues, EQ, tempo changes)
- **Chart Editor** — write lyric/chord charts per song (`[Chord]` above the
  word it lands on, `[SECTION]` lines become banners), with a live stage
  preview and a preview-only transpose. A "Search chords online" link opens
  an Ultimate Guitar search as a starting point to copy from.

**Live crowd voting**
- Open a timed vote on the remaining set; the audience votes from their
  phones via a QR code
- Set list re-sorts automatically by vote count when the timer ends (or a
  band member closes it early); pause/resume mid-vote

**Stage Prompter export**
- "↓ Prompter file" exports the current set — order, key, BPM, notes, and
  any chart text — as a `prompter-<show>.json` file
- Designed to be copied to a USB stick and read by the Raspberry Pi kiosk in
  [`pi/`](./pi/SETUP-PI.md) — a dedicated lyric monitor with a GPIO
  footswitch for hands-free page turns. One direction only: the web app is
  the source of truth, the Pi is a display.

## Tech stack

- React 18 + Vite
- Firebase Firestore for real-time shared state (`songs` and `shows`
  collections — see [`src/firebase.js`](./src/firebase.js))
- No backend of its own; deployed as a static site to GitHub Pages

## Getting started

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

This builds the app and pushes `dist/` to the `gh-pages` branch, which
GitHub Pages serves at:

`https://YOUR_GITHUB_USERNAME.github.io/SDWF-setlist/`

## Project structure

```
src/
  App.jsx                 Top-level layout, show state, voting logic
  components/
    SetlistBuilder.jsx     Drag-and-drop set list
    SongLibrary.jsx        Sortable/filterable song browser
    SongAdmin.jsx          Song Manager (add/edit/delete songs)
    ChartEditor.jsx         Lyric/chord chart editor + stage preview
    GenerateModal.jsx       Preset-based set generation
    VotePanel.jsx / VotePage.jsx   Crowd voting UI + public vote page
    ShowSetlist.jsx          Live "show mode" set list (mark played, etc.)
    PrintModal.jsx           Copy/print export
    Toast.jsx                Toast + confirm dialog
  context/SongsContext.jsx  Streams the song library from Firestore
  lib/prompterExport.js     Builds the prompter-set/1 JSON file
  data/songs.js             Seed song library
  theme.js                  Central color palette
pi/                          Raspberry Pi stage prompter companion app
  SETUP-PI.md                 Full hardware + software setup guide
```

## Release notes

See [CHANGELOG.md](./CHANGELOG.md) for what's shipped and when.
