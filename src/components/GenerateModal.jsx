import { useState } from "react";
import { useSongs } from "../context/SongsContext";

const PRESETS = [
  {
    id: "random",
    label: "Random Shuffle",
    desc: "Grab any songs from the library at random",
    icon: "🎲",
  },
  {
    id: "crowd",
    label: "Crowd Pleasers",
    desc: "Highest-popularity songs with a little shuffle",
    icon: "🤘",
  },
  {
    id: "energy",
    label: "High Energy",
    desc: "Fast BPM + anthemic/swagger/uplift vibes",
    icon: "⚡",
  },
  {
    id: "mellow",
    label: "Mellow Vibes",
    desc: "Slower songs — soulful, love, groove",
    icon: "🌙",
  },
  {
    id: "country",
    label: "Country Night",
    desc: "Lean heavy on the country catalog",
    icon: "🤠",
  },
  {
    id: "rock",
    label: "Rock Block",
    desc: "Classic rock, hard rock, blues rock, grunge",
    icon: "🎸",
  },
  {
    id: "arc",
    label: "Show Arc",
    desc: "Structured opener → build → peak → ballad → closer",
    icon: "📈",
  },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function weightedSample(pool, n) {
  // sample without replacement, weighted by popularity
  const sorted = [...pool].sort(() => Math.random() - 0.5);
  sorted.sort((a, b) => (b.popularity + Math.random() * 20) - (a.popularity + Math.random() * 20));
  return sorted.slice(0, n).map(s => s.id);
}

function generate(songs, presetId, count, exclude) {
  const pool = songs.filter(s => !exclude.has(s.id));

  if (presetId === "random") {
    return shuffle(pool).slice(0, count).map(s => s.id);
  }

  if (presetId === "crowd") {
    return weightedSample(pool, count);
  }

  if (presetId === "energy") {
    const vibes = new Set(["anthemic", "swagger", "uplift", "joy", "fun"]);
    const energetic = pool.filter(s => s.bpm >= 100 || vibes.has(s.vibe));
    const rest = pool.filter(s => !energetic.includes(s));
    const picks = shuffle(energetic).slice(0, count);
    if (picks.length < count) picks.push(...shuffle(rest).slice(0, count - picks.length));
    return picks.map(s => s.id);
  }

  if (presetId === "mellow") {
    const vibes = new Set(["soulful", "love", "groove", "nostalgia", "epic"]);
    const mellow = pool.filter(s => s.bpm <= 100 || vibes.has(s.vibe));
    const rest = pool.filter(s => !mellow.includes(s));
    const picks = shuffle(mellow).slice(0, count);
    if (picks.length < count) picks.push(...shuffle(rest).slice(0, count - picks.length));
    return picks.map(s => s.id);
  }

  if (presetId === "country") {
    const country = pool.filter(s => s.genre.toLowerCase().includes("country"));
    const rest = pool.filter(s => !country.includes(s));
    const countryCount = Math.min(country.length, Math.ceil(count * 0.7));
    const picks = [
      ...shuffle(country).slice(0, countryCount),
      ...shuffle(rest).slice(0, count - countryCount),
    ];
    return shuffle(picks).map(s => s.id);
  }

  if (presetId === "rock") {
    const rockGenres = ["classic rock", "hard rock", "blues rock", "southern rock", "grunge", "punk rock"];
    const rock = pool.filter(s => rockGenres.some(g => s.genre.toLowerCase().includes(g)));
    const rest = pool.filter(s => !rock.includes(s));
    const rockCount = Math.min(rock.length, Math.ceil(count * 0.75));
    const picks = [
      ...shuffle(rock).slice(0, rockCount),
      ...shuffle(rest).slice(0, count - rockCount),
    ];
    return shuffle(picks).map(s => s.id);
  }

  if (presetId === "arc") {
    // Opener: high energy, fast (bpm > 110)
    const openers = pool.filter(s => s.bpm > 110 && ["uplift", "anthemic", "swagger"].includes(s.vibe));
    // Mid builders: mid-tempo, fun/groove
    const builders = pool.filter(s => s.bpm >= 90 && s.bpm <= 130 && ["groove", "fun", "joy", "nostalgia"].includes(s.vibe));
    // Peak: crowd favorites, high popularity, anthemic
    const peaks = pool.filter(s => s.popularity >= 85 && ["anthemic", "uplift", "singalong"].includes(s.vibe));
    // Ballads: slow, soulful/love/epic
    const ballads = pool.filter(s => s.bpm < 90 && ["soulful", "love", "epic"].includes(s.vibe));
    // Closers: singalong / high pop
    const closers = pool.filter(s => s.popularity >= 85 && ["singalong", "anthemic", "pride"].includes(s.vibe));

    const segments = [
      { pool: openers, fallback: pool.filter(s => s.bpm > 120), slots: Math.max(1, Math.round(count * 0.15)) },
      { pool: builders, fallback: pool, slots: Math.max(1, Math.round(count * 0.30)) },
      { pool: peaks,    fallback: pool.filter(s => s.popularity >= 80), slots: Math.max(1, Math.round(count * 0.20)) },
      { pool: ballads,  fallback: pool.filter(s => s.bpm < 90), slots: Math.max(1, Math.round(count * 0.15)) },
      { pool: closers,  fallback: pool.filter(s => s.popularity >= 80), slots: 0 },
    ];

    const used = new Set();
    const result = [];

    for (const seg of segments) {
      const available = (seg.pool.length >= 2 ? seg.pool : seg.fallback).filter(s => !used.has(s.id));
      const picks = shuffle(available).slice(0, seg.slots);
      picks.forEach(s => { used.add(s.id); result.push(s); });
    }

    // Fill remaining slots from closers or general pool
    const needed = count - result.length;
    if (needed > 0) {
      const remaining = shuffle(pool.filter(s => !used.has(s.id))).slice(0, needed);
      result.push(...remaining);
    }

    // Ensure final song is a singalong/anthemic if possible
    const finalIdx = result.findIndex(s => ["singalong", "anthemic"].includes(s.vibe) && result.indexOf(s) !== result.length - 1);
    if (finalIdx !== -1 && result.length > 1) {
      const [final] = result.splice(finalIdx, 1);
      result.push(final);
    }

    return result.map(s => s.id);
  }

  return shuffle(pool).slice(0, count).map(s => s.id);
}

export default function GenerateModal({ currentSongIds, onGenerate, onClose }) {
  const { songs } = useSongs();
  const [preset, setPreset] = useState("arc");
  const [count, setCount] = useState(12);
  const [replaceMode, setReplaceMode] = useState("replace");
  const [preview, setPreview] = useState(null);

  const songMap = Object.fromEntries(songs.map(s => [s.id, s]));

  function handleGenerate() {
    const exclude = replaceMode === "add" ? new Set(currentSongIds) : new Set();
    const ids = generate(songs, preset, count, exclude);
    const newIds = replaceMode === "replace" ? ids : [...currentSongIds, ...ids];
    onGenerate(newIds);
    onClose();
  }

  function handlePreview() {
    const exclude = replaceMode === "add" ? new Set(currentSongIds) : new Set();
    const ids = generate(songs, preset, count, exclude);
    setPreview(ids);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, fontFamily: "'Georgia', serif",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#0d0d1c", border: "1px solid #282840",
        borderRadius: 6, width: 560, maxWidth: "95vw", maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid #1a1a22",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 14, color: "#e0dcd0", fontWeight: "bold" }}>Generate Set List</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Pick a strategy and let it rip</div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          {/* Presets */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => { setPreset(p.id); setPreview(null); }} style={{
                background: preset === p.id ? "#1e1028" : "#0c0c1a",
                border: `1px solid ${preset === p.id ? "#f07272" : "#1e1e36"}`,
                borderRadius: 4, padding: "10px 12px", textAlign: "left",
                cursor: "pointer", color: "#e0dcd0", fontFamily: "inherit",
              }}>
                <div style={{ fontSize: 13 }}>{p.icon} {p.label}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>{p.desc}</div>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 8 }}>
              Songs:
              <input
                type="number" min={4} max={30} value={count}
                onChange={e => { setCount(Number(e.target.value)); setPreview(null); }}
                style={{
                  background: "#18182c", border: "1px solid #282840", color: "#e0dcd0",
                  padding: "4px 8px", borderRadius: 3, width: 56, fontSize: 12,
                  fontFamily: "inherit", outline: "none",
                }}
              />
            </label>

            <div style={{ display: "flex", gap: 0 }}>
              {["replace", "add"].map(mode => (
                <button key={mode} onClick={() => { setReplaceMode(mode); setPreview(null); }} style={{
                  padding: "4px 10px", fontSize: 11, fontFamily: "inherit",
                  background: replaceMode === mode ? "#18182c" : "transparent",
                  border: "1px solid #282840",
                  borderRadius: mode === "replace" ? "3px 0 0 3px" : "0 3px 3px 0",
                  marginLeft: mode === "add" ? -1 : 0,
                  color: replaceMode === mode ? "#f07272" : "#888",
                  cursor: "pointer",
                }}>
                  {mode === "replace" ? "Replace set" : "Add to set"}
                </button>
              ))}
            </div>

            <button onClick={handlePreview} style={{
              padding: "4px 12px", fontSize: 11, fontFamily: "inherit",
              background: "transparent", border: "1px solid #1e3a48", color: "#5ecdc4",
              borderRadius: 3, cursor: "pointer", marginLeft: "auto",
            }}>
              Preview
            </button>
          </div>

          {/* Preview */}
          {preview && (
            <div style={{
              background: "#0c0c1a", border: "1px solid #1e1e36",
              borderRadius: 4, padding: 12, marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, color: "#777", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
                Preview — {preview.length} songs
              </div>
              {preview.map((id, i) => {
                const s = songMap[id];
                return s ? (
                  <div key={id} style={{ display: "flex", gap: 10, marginBottom: 5, alignItems: "baseline" }}>
                    <span style={{ color: "#666", fontSize: 11, minWidth: 22, textAlign: "right" }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: "#c8c4b8" }}>{s.title}</span>
                    <span style={{ fontSize: 11, color: "#888" }}>{s.artist}</span>
                    <span style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>{s.bpm} bpm · {s.vibe}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 18px", borderTop: "1px solid #1a1a22",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button onClick={onClose} style={{
            padding: "6px 14px", background: "transparent",
            border: "1px solid #282840", color: "#666",
            borderRadius: 3, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
          }}>
            Cancel
          </button>
          <button onClick={handleGenerate} style={{
            padding: "6px 16px", background: "#f07272",
            border: "none", color: "#0d0d1c",
            borderRadius: 3, cursor: "pointer", fontSize: 12,
            fontFamily: "inherit", fontWeight: "bold",
          }}>
            Generate Set
          </button>
        </div>
      </div>
    </div>
  );
}
