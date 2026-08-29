// Builds the "prompter set" file the stage prompter reads off a USB stick.
// Framework-free, no dependencies.

export const PROMPTER_FORMAT = "prompter-set/1";

/**
 * @param {object} show   a show doc: { name, date, venue, songIds }
 * @param {object[]} songs  the full song library (from useSongs())
 */
export function buildPrompterSet(show, songs) {
  const songMap = Object.fromEntries(songs.map(s => [String(s.id), s]));

  const ordered = (show.songIds || [])
    .map(id => songMap[String(id)])
    .filter(Boolean)
    .map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist || "",
      key: s.key || "",
      bpm: Number(s.bpm) || 0,
      capo: Number(s.capo) || 0,
      note: s.note || "",
      // Optional. Only present if you add a `chart` field to the song
      // (ChordPro-style: chords in [brackets], [SECTION] lines on their own).
      // When absent, the prompter keeps whatever chart it already has locally.
      ...(s.chart ? { chart: s.chart } : {}),
    }));

  return {
    format: PROMPTER_FORMAT,
    exportedAt: new Date().toISOString(),
    show: {
      name: show.name || "Untitled show",
      date: show.date || "",
      venue: show.venue || "",
    },
    songs: ordered,
  };
}

/** Triggers a browser download of the set file. */
export function downloadPrompterSet(show, songs) {
  const payload = buildPrompterSet(show, songs);
  const safeName = (show.name || "set")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `prompter-${safeName || "set"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);

  return payload.songs.length;
}
