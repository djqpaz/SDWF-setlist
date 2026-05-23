import { useState, useMemo } from "react";
import { VIBE_COLORS } from "../data/songs";
import { useSongs } from "../context/SongsContext";

const SORT_MODES = [
  { id: "title",      label: "A–Z"        },
  { id: "bpm",        label: "BPM"        },
  { id: "genre",      label: "Genre"      },
  { id: "year",       label: "Year"       },
  { id: "popularity", label: "Popular"    },
  { id: "vibe",       label: "Arc"        },
];

const VIBE_ORDER = ["soulful","love","groove","nostalgia","tension","fun","joy","pride","swagger","uplift","singalong","anthemic","epic"];

function sortSongs(songs, mode, bpmDesc) {
  const s = [...songs];
  switch (mode) {
    case "title":      return s.sort((a,b) => a.title.localeCompare(b.title));
    case "bpm":        return s.sort((a,b) => bpmDesc ? b.bpm - a.bpm : a.bpm - b.bpm);
    case "genre":      return s.sort((a,b) => a.genre.localeCompare(b.genre) || a.title.localeCompare(b.title));
    case "year":       return s.sort((a,b) => a.year - b.year);
    case "popularity": return s.sort((a,b) => b.popularity - a.popularity);
    case "vibe":       return s.sort((a,b) => VIBE_ORDER.indexOf(a.vibe) - VIBE_ORDER.indexOf(b.vibe));
    default:           return s;
  }
}

export default function SongLibrary({ setlistSongIds, onAdd }) {
  const { songs } = useSongs();
  const [sortMode, setSortMode] = useState("title");
  const [bpmDesc, setBpmDesc] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const pool = q
      ? songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
      : songs;
    return sortSongs(pool, sortMode, bpmDesc);
  }, [songs, sortMode, bpmDesc, search]);

  const inSet = new Set(setlistSongIds);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Search */}
      <div style={{ padding:"12px 16px 8px" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search songs or artists…"
          style={{
            width:"100%", boxSizing:"border-box",
            background:"#18182c", border:"1px solid #282840",
            color:"#e0dcd0", padding:"8px 12px", borderRadius:4,
            fontSize:13, fontFamily:"inherit", outline:"none",
          }}
        />
      </div>

      {/* Sort bar */}
      <div style={{ display:"flex", gap:4, padding:"0 16px 10px", flexWrap:"wrap" }}>
        {SORT_MODES.map(m => {
          const isBpm = m.id === "bpm";
          const active = sortMode === m.id;
          const label = isBpm && active ? (bpmDesc ? "BPM ↓" : "BPM ↑") : m.label;
          return (
            <button key={m.id} onClick={() => {
              if (isBpm && active) {
                setBpmDesc(d => !d);
              } else {
                setSortMode(m.id);
                if (isBpm) setBpmDesc(false);
              }
            }} style={{
              padding:"4px 10px", borderRadius:3, fontSize:11, cursor:"pointer",
              fontFamily:"inherit", letterSpacing:"0.08em",
              border: active ? "1px solid #f07272" : "1px solid #282840",
              background: active ? "#2a1020" : "transparent",
              color: active ? "#f07272" : "#888",
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Song list */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 8px 16px" }}>
        {filtered.map(song => {
          const added = inSet.has(song.id);
          return (
            <div
              key={song.id}
              style={{
                display:"flex", alignItems:"center", gap:8,
                padding:"8px 8px", borderRadius:4, marginBottom:2,
                background: added ? "#1a2828" : "transparent",
                opacity: added ? 0.5 : 1,
                cursor: added ? "default" : "pointer",
                transition:"background 0.1s",
              }}
              onClick={() => !added && onAdd(song.id)}
              onMouseEnter={e => { if(!added) e.currentTarget.style.background="#18182c"; }}
              onMouseLeave={e => { if(!added) e.currentTarget.style.background="transparent"; }}
            >
              <div style={{
                width:8, height:8, borderRadius:"50%", flexShrink:0,
                background: VIBE_COLORS[song.vibe] || "#444",
              }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, color:"#ddd", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {song.title}
                </div>
                <div style={{ fontSize:10, color:"#999", marginTop:1 }}>
                  {song.artist} · {song.genre} · {song.bpm} BPM
                </div>
              </div>
              {added
                ? <span style={{ fontSize:10, color:"#5ecdc4" }}>✓</span>
                : <button style={{
                    background:"none", border:"1px solid #282840", color:"#888",
                    borderRadius:3, padding:"2px 8px", cursor:"pointer",
                    fontSize:13, flexShrink:0, fontFamily:"inherit",
                  }}>+</button>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}
