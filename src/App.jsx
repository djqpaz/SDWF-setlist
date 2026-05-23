import { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { BAND_MEMBERS } from "./data/songs";
import SongLibrary from "./components/SongLibrary";
import SetlistBuilder from "./components/SetlistBuilder";
import PrintModal from "./components/PrintModal";
import GenerateModal from "./components/GenerateModal";

const DEFAULT_SHOW = () => ({
  id: crypto.randomUUID(),
  name: "New Show",
  date: "",
  venue: "",
  songIds: [],
  suggestions: [], // [{member, songIds, savedAt}]
  createdAt: new Date().toISOString(),
});

export default function App() {
  const [shows, setShows] = useLocalStorage("sickday-shows", [DEFAULT_SHOW()]);
  const [activeShowId, setActiveShowId] = useLocalStorage("sickday-active-show", shows[0]?.id);
  const [viewMode, setViewMode] = useState("builder"); // "builder" | "suggestions"
  const [memberName, setMemberName] = useLocalStorage("sickday-member", "");
  const [printShow, setPrintShow] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingName, setEditingName] = useState(false);

  const activeShow = shows.find(s => s.id === activeShowId) || shows[0];

  function updateShow(id, updates) {
    setShows(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  function addShow() {
    const s = DEFAULT_SHOW();
    setShows(prev => [...prev, s]);
    setActiveShowId(s.id);
  }

  function deleteShow(id) {
    if (shows.length === 1) return;
    if (!confirm("Delete this show?")) return;
    const remaining = shows.filter(s => s.id !== id);
    setShows(remaining);
    if (activeShowId === id) setActiveShowId(remaining[0].id);
  }

  function setSongIds(ids) {
    updateShow(activeShow.id, { songIds: ids });
  }

  function addSong(songId) {
    if (!activeShow.songIds.includes(songId)) {
      updateShow(activeShow.id, { songIds: [...activeShow.songIds, songId] });
    }
  }

  function saveSuggestion() {
    if (!memberName) return alert("Pick your name first (top right).");
    if (activeShow.songIds.length === 0) return alert("Add some songs first!");
    const existing = activeShow.suggestions || [];
    const filtered = existing.filter(s => s.member !== memberName);
    updateShow(activeShow.id, {
      suggestions: [...filtered, {
        member: memberName,
        songIds: [...activeShow.songIds],
        savedAt: new Date().toISOString(),
      }]
    });
    alert(`Set saved as ${memberName}'s suggestion!`);
  }

  function loadSuggestion(suggestion) {
    if (!confirm(`Load ${suggestion.member}'s suggested set? This will replace the current set list.`)) return;
    updateShow(activeShow.id, { songIds: [...suggestion.songIds] });
    setViewMode("builder");
  }

  if (!activeShow) return null;

  return (
    <div style={{
      display:"flex", flexDirection:"column", height:"100vh",
      background:"#0d0d1c", color:"#e0dcd0",
      fontFamily:"'Georgia', serif", overflow:"hidden",
    }}>
      {/* Top bar */}
      <div style={{
        display:"flex", alignItems:"center", gap:12,
        padding:"0 16px", height:52,
        borderBottom:"1px solid #1e1e36", flexShrink:0,
        background:"#09091a",
      }}>
        <div style={{ fontSize:12, color:"#f07272", fontWeight:"bold", letterSpacing:"0.1em", marginRight:4 }}>
          SDWF
        </div>

        {/* Show tabs */}
        <div style={{ display:"flex", gap:2, flex:1, overflow:"auto", minWidth:0 }}>
          {shows.map(show => (
            <button
              key={show.id}
              onClick={() => setActiveShowId(show.id)}
              style={{
                padding:"5px 12px", borderRadius:"3px 3px 0 0", fontSize:12,
                border: "1px solid",
                borderBottom: activeShowId === show.id ? "1px solid #09091a" : "1px solid #1e1e36",
                borderColor: activeShowId === show.id ? "#282840 #282840 #09091a #282840" : "#1e1e36",
                background: activeShowId === show.id ? "#09091a" : "transparent",
                color: activeShowId === show.id ? "#e0dcd0" : "#555",
                cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
              }}
            >
              {show.name}
            </button>
          ))}
          <button onClick={addShow} style={{
            padding:"5px 10px", background:"transparent",
            border:"1px solid #1e1e36", borderBottom:"1px solid #1e1e36",
            color:"#777", cursor:"pointer", fontSize:16, borderRadius:"3px 3px 0 0",
            lineHeight:1,
          }} title="New show">+</button>
        </div>

        {/* Member selector */}
        <select
          value={memberName}
          onChange={e => setMemberName(e.target.value)}
          style={{
            background:"#18182c", border:"1px solid #282840", color: memberName ? "#f07272" : "#555",
            padding:"4px 8px", borderRadius:3, fontSize:12, fontFamily:"inherit",
            cursor:"pointer", outline:"none",
          }}
        >
          <option value="">Who are you?</option>
          {BAND_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Show meta bar */}
      <div style={{
        display:"flex", alignItems:"center", gap:12, padding:"8px 16px",
        borderBottom:"1px solid #1a1a30", background:"#0c0c1a", flexShrink:0,
        flexWrap:"wrap",
      }}>
        {editingName ? (
          <input
            autoFocus
            value={activeShow.name}
            onChange={e => updateShow(activeShow.id, { name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => e.key === "Enter" && setEditingName(false)}
            style={{
              background:"#18182c", border:"1px solid #f07272", color:"#e0dcd0",
              padding:"4px 8px", borderRadius:3, fontSize:14, fontFamily:"inherit",
              outline:"none", width:200,
            }}
          />
        ) : (
          <div
            onClick={() => setEditingName(true)}
            style={{ fontSize:14, color:"#e0dcd0", cursor:"text", padding:"4px 0" }}
            title="Click to rename"
          >
            {activeShow.name} <span style={{ color:"#666", fontSize:11 }}>✎</span>
          </div>
        )}

        <input
          value={activeShow.date || ""}
          onChange={e => updateShow(activeShow.id, { date: e.target.value })}
          placeholder="Date"
          type="date"
          style={{
            background:"#18182c", border:"1px solid #1e1e36", color:"#888",
            padding:"4px 8px", borderRadius:3, fontSize:12, fontFamily:"inherit",
            outline:"none",
          }}
        />

        <input
          value={activeShow.venue || ""}
          onChange={e => updateShow(activeShow.id, { venue: e.target.value })}
          placeholder="Venue"
          style={{
            background:"#18182c", border:"1px solid #1e1e36", color:"#888",
            padding:"4px 8px", borderRadius:3, fontSize:12, fontFamily:"inherit",
            outline:"none", width:150,
          }}
        />

        <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:11, color:"#888" }}>
            {activeShow.songIds.length} songs
          </span>

          {/* View mode */}
          <button onClick={() => setViewMode(v => v === "builder" ? "suggestions" : "builder")} style={{
            padding:"4px 10px", fontSize:11, fontFamily:"inherit",
            background: viewMode === "suggestions" ? "#18182c" : "transparent",
            border:"1px solid #282840", color: viewMode === "suggestions" ? "#f07272" : "#666",
            borderRadius:3, cursor:"pointer",
          }}>
            Suggestions {activeShow.suggestions?.length > 0 && `(${activeShow.suggestions.length})`}
          </button>

          <button onClick={saveSuggestion} style={{
            padding:"4px 10px", fontSize:11, fontFamily:"inherit",
            background:"transparent", border:"1px solid #1e3a48", color:"#5ecdc4",
            borderRadius:3, cursor:"pointer",
          }}>
            Save as My Set
          </button>

          <button onClick={() => setShowGenerate(true)} style={{
            padding:"4px 10px", fontSize:11, fontFamily:"inherit",
            background:"transparent", border:"1px solid #2a4040", color:"#5ecdc4",
            borderRadius:3, cursor:"pointer",
          }}>
            Generate Set
          </button>

          <button onClick={() => setPrintShow(activeShow)} style={{
            padding:"4px 10px", fontSize:11, fontFamily:"inherit",
            background:"#f07272", border:"none", color:"#0d0d1c",
            borderRadius:3, cursor:"pointer", fontWeight:"bold",
          }}>
            Export
          </button>

          <button onClick={() => deleteShow(activeShow.id)} style={{
            padding:"4px 8px", fontSize:11,
            background:"transparent", border:"1px solid #3a2020", color:"#906060",
            borderRadius:3, cursor:"pointer", fontFamily:"inherit",
          }} title="Delete show">
            Delete Show
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {/* Library sidebar */}
        <div style={{
          width: sidebarOpen ? 280 : 0,
          minWidth: sidebarOpen ? 280 : 0,
          borderRight:"1px solid #1a1a30",
          display:"flex", flexDirection:"column",
          overflow:"hidden", transition:"width 0.2s, min-width 0.2s",
          background:"#0c0c1a",
        }}>
          <div style={{
            padding:"10px 16px 6px", fontSize:10, color:"#777",
            letterSpacing:"0.2em", textTransform:"uppercase", flexShrink:0,
            borderBottom:"1px solid #1a1a30",
          }}>
            Song Library — {activeShow.songIds.length} in set
          </div>
          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <SongLibrary setlistSongIds={activeShow.songIds} onAdd={addSong} />
          </div>
        </div>

        {/* Toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            width:20, background:"#0c0c12", border:"none",
            borderRight:"1px solid #1a1a30", color:"#666",
            cursor:"pointer", fontSize:12, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}
          title={sidebarOpen ? "Hide library" : "Show library"}
        >
          {sidebarOpen ? "‹" : "›"}
        </button>

        {/* Set list / suggestions panel */}
        <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
          {viewMode === "builder" ? (
            <>
              <div style={{
                padding:"10px 16px 6px", fontSize:10, color:"#777",
                letterSpacing:"0.2em", textTransform:"uppercase",
                borderBottom:"1px solid #1a1a30", flexShrink:0,
              }}>
                Set List — drag to reorder
              </div>
              <div style={{ flex:1 }}>
                <SetlistBuilder songIds={activeShow.songIds} onChange={setSongIds} />
              </div>
            </>
          ) : (
            <SuggestionsPanel
              suggestions={activeShow.suggestions || []}
              onLoad={loadSuggestion}
            />
          )}
        </div>
      </div>

      <PrintModal show={printShow} onClose={() => setPrintShow(null)} />
      {showGenerate && (
        <GenerateModal
          currentSongIds={activeShow.songIds}
          onGenerate={setSongIds}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </div>
  );
}

function SuggestionsPanel({ suggestions, onLoad }) {
  if (suggestions.length === 0) {
    return (
      <div style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        color:"#777", fontSize:13, fontStyle:"italic",
      }}>
        No suggestions yet — band members can save their own set via "Save as My Set"
      </div>
    );
  }

  return (
    <div style={{ padding:16 }}>
      <div style={{ fontSize:10, color:"#777", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:16 }}>
        Band Suggestions
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {suggestions.map((s, i) => (
          <div key={i} style={{
            background:"#141428", border:"1px solid #1e1e36",
            borderRadius:4, padding:14,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:14, color:"#f07272" }}>{s.member}</div>
                <div style={{ fontSize:10, color:"#888", marginTop:2 }}>
                  {s.songIds.length} songs · saved {new Date(s.savedAt).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => onLoad(s)} style={{
                padding:"5px 12px", background:"transparent",
                border:"1px solid #2a4040", color:"#5ecdc4",
                borderRadius:3, cursor:"pointer", fontSize:11, fontFamily:"inherit",
              }}>
                Load This Set
              </button>
            </div>
            <SuggestionSongListInner songIds={s.songIds} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionSongListInner({ songIds }) {
  // Re-import data
  const allSongs = [
    { id:1, title:"Harder to Breathe" }, { id:2, title:"The Middle" }, { id:3, title:"Summer of '69" },
    { id:4, title:"Hard to Handle" }, { id:5, title:"Play That Funky Music" }, { id:6, title:"God Blessed Texas" },
    { id:7, title:"Sweet Caroline" }, { id:8, title:"Tennessee Whiskey" }, { id:9, title:"Any Way You Want It" },
    { id:10, title:"I Like It, I Love It" }, { id:11, title:"Great Day to Be Alive" }, { id:12, title:"Pour Some Sugar on Me" },
    { id:13, title:"Sweet Emotion" }, { id:14, title:"Beverly Hills" }, { id:15, title:"Wanted Dead or Alive" },
    { id:16, title:"Meet in the Middle" }, { id:17, title:"Sold" }, { id:18, title:"Say It Ain't So" },
    { id:19, title:"Shine" }, { id:20, title:"Higher" }, { id:21, title:"Fishin' in the Dark" },
    { id:22, title:"Wagon Wheel" }, { id:23, title:"Friends in Low Places" }, { id:24, title:"Sweet Home Alabama" },
    { id:25, title:"To Be With You" }, { id:26, title:"The Ocean" }, { id:27, title:"Santeria" },
    { id:28, title:"Good" }, { id:29, title:"Fancy Like" }, { id:30, title:"Drift Away" },
    { id:31, title:"Alive" }, { id:32, title:"Chicken Fried" }, { id:33, title:"Get Along" },
    { id:34, title:"Lump" }, { id:35, title:"Are You Gonna Go My Way" }, { id:36, title:"Blue on Black" },
    { id:37, title:"All Summer Long" }, { id:38, title:"When I Come Around" }, { id:39, title:"Interstate Love Song" },
    { id:40, title:"Feel Like Makin' Love" }, { id:41, title:"Learn to Fly" }, { id:42, title:"Livin' on a Prayer" },
    { id:43, title:"More Than a Feeling" }, { id:44, title:"Blister in the Sun" }, { id:45, title:"Life is a Highway" },
    { id:46, title:"The Joker" }, { id:47, title:"Lightning Crashes" }, { id:48, title:"Another Brick in the Wall" },
  ];
  const map = Object.fromEntries(allSongs.map(s => [s.id, s]));
  const preview = songIds.slice(0, 8);
  const rest = songIds.length - 8;

  return (
    <div>
      {preview.map((id, i) => (
        <div key={id} style={{ fontSize:12, color:"#666", display:"flex", gap:8, marginBottom:2 }}>
          <span style={{ color:"#666", minWidth:20, textAlign:"right" }}>{i+1}.</span>
          <span>{map[id]?.title || "Unknown"}</span>
        </div>
      ))}
      {rest > 0 && (
        <div style={{ fontSize:11, color:"#888", marginTop:4, fontStyle:"italic" }}>
          + {rest} more songs…
        </div>
      )}
    </div>
  );
}
