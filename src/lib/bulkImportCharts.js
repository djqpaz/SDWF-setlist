// Splits one big block of pasted chart text (e.g. a whole "set charts" doc
// copied from Google Docs) into per-song chart blocks by matching lines
// against the song library's titles.
//
// A line becomes a new block boundary when it equals a song's title, or
// when it appears as a whole phrase inside that song's notes (useful for a
// medley entry whose notes list the individual song titles it's made of).
// Everything between one matched title line and the next is that song's
// chart text. Anything before the first match is returned separately as
// `unmatched`, for manual assignment in the UI rather than silently
// attaching it to the wrong song.

function words(str) {
  return String(str || "")
    .replace(/[​‌‍﻿]/g, "")
    .replace(/['’‘"“”]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

// True when `needle` appears as a contiguous run of whole words inside
// `haystack` — a word-boundary check, not a raw character substring, so a
// short chord line like "G C" can't coincidentally match inside "...ning
// crashes...".
function containsWordSequence(haystack, needle) {
  if (!needle.length || needle.length > haystack.length) return false;
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

function trimBlock(lines) {
  return lines.join("\n").replace(/^\n+|\n+$/g, "");
}

export function parseBulkCharts(text, songs) {
  const candidates = songs.map(song => ({
    song,
    titleWords: words(song.title),
    // Notes only (not the title) — a song's title very often repeats
    // verbatim inside its own lyrics (the hook line), so folding the title
    // into this corpus would make every chorus look like a new boundary.
    noteWords: words(song.note || ""),
  }));

  function matchLine(line) {
    const lineWords = words(line);
    if (lineWords.length < 2) return null;

    const exact = candidates.find(c => c.titleWords.join(" ") === lineWords.join(" "));
    if (exact) return exact.song;

    // Only fall back to the (looser) notes search for phrases long enough
    // that a coincidental match is implausible.
    if (lineWords.length >= 3) {
      const inNotes = candidates.find(c => containsWordSequence(c.noteWords, lineWords));
      if (inNotes) return inNotes.song;
    }
    return null;
  }

  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  const leading = [];

  for (const raw of lines) {
    const song = matchLine(raw);
    const current = blocks[blocks.length - 1];
    // A title line for the song whose block is already open is almost
    // always a repeated hook lyric ("Rudolph the Red-Nosed Reindeer... ")
    // rather than a genuine new song — keep accumulating instead of
    // splitting again.
    if (song && song.id !== current?.song.id) {
      blocks.push({ song, lines: [] });
      continue;
    }
    (blocks.length ? blocks[blocks.length - 1].lines : leading).push(raw);
  }

  const matched = blocks
    .map(b => ({ songId: b.song.id, title: b.song.title, chart: trimBlock(b.lines) }))
    .filter(b => b.chart.trim());

  return { matched, unmatched: trimBlock(leading) };
}
