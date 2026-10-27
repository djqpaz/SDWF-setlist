#!/usr/bin/env node
// Fetches the next upcoming show + all songs from Firestore and writes
// public/library.json in the prompter-set/1 format the Pi prompter reads.

const PROJECT = "sdwf-setlist";
const API_KEY = "AIzaSyB4ZCM-WGSgGTZra0tuQ6WbZyMUfbt6BNU";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function fetchCollection(name) {
  const docs = [];
  let pageToken = null;
  do {
    const url = `${BASE}/${name}?key=${API_KEY}&pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore fetch failed for ${name}: ${res.status} ${await res.text()}`);
    const data = await res.json();
    if (data.documents) docs.push(...data.documents);
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return docs;
}

function parseDoc(doc) {
  const id = doc.name.split("/").pop();
  const fields = doc.fields || {};
  const out = { id };
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined)       out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined)  out[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.nullValue !== undefined)    out[k] = null;
    else if (v.arrayValue) {
      out[k] = (v.arrayValue.values || []).map(x =>
        x.stringValue  ?? (x.integerValue !== undefined ? Number(x.integerValue) : null)
      );
    }
  }
  return out;
}

async function main() {
  const [showDocs, songDocs] = await Promise.all([
    fetchCollection("shows"),
    fetchCollection("songs"),
  ]);

  const shows = showDocs.map(parseDoc);
  const songs = songDocs.map(parseDoc);

  // Pick the next upcoming show; fall back to the most recent past show.
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...shows].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const show = sorted.find(s => (s.date || "") >= today) || sorted[sorted.length - 1];

  if (!show) {
    console.error("No shows found in Firestore.");
    process.exit(1);
  }

  console.log(`Exporting: "${show.name}" (${show.date || "no date"})`);

  const songMap = Object.fromEntries(songs.map(s => [String(s.id), s]));
  const ordered = (show.songIds || [])
    .map(id => songMap[String(id)])
    .filter(Boolean)
    .map(s => ({
      id: s.id,
      title: s.title || "",
      artist: s.artist || "",
      key: s.key || "",
      bpm: Number(s.bpm) || 0,
      capo: Number(s.capo) || 0,
      note: s.note || "",
      ...(s.chart ? { chart: s.chart } : {}),
    }));

  const payload = {
    format: "prompter-set/1",
    exportedAt: new Date().toISOString(),
    show: {
      name: show.name || "Untitled show",
      date: show.date || "",
      venue: show.venue || "",
    },
    songs: ordered,
  };

  const { writeFileSync, mkdirSync } = await import("fs");
  mkdirSync("public", { recursive: true });
  writeFileSync("public/library.json", JSON.stringify(payload, null, 2));
  console.log(`Wrote ${ordered.length} songs to public/library.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
