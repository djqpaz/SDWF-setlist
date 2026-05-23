import { useState, useEffect } from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { BAND_MEMBERS } from "./data/songs";
import { useSongs } from "./context/SongsContext";
import SongLibrary from "./components/SongLibrary";
import SetlistBuilder from "./components/SetlistBuilder";
import PrintModal from "./components/PrintModal";
import GenerateModal from "./components/GenerateModal";
import SongAdmin from "./components/SongAdmin";
import { Toast, ConfirmDialog } from "./components/Toast";

const DEFAULT_SHOW = () => ({
  id: crypto.randomUUID(),
  name: "New Show",
  date: "",
  venue: "",
  songIds: [],
  suggestions: [],
  createdAt: new Date().toISOString(),
});

export default function App() {
  const { songs } = useSongs();
  const songMap = Object.fromEntries(songs.map(s => [s.id, s]));
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeShowId, setActiveShowId] = useLocalStorage("sickday-active-show", null);
  const [viewMode, setViewMode] = useState("builder");
  const [memberName, setMemberName] = useLocalStorage("sickday-member", "");
  const [printShow, setPrintShow] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [mobileTab, setMobileTab] = useState("library");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "shows"), async (snapshot) => {
      if (snapshot.empty) {
        const s = DEFAULT_SHOW();
        await setDoc(doc(db, "shows", s.id), s);
        return;
      }
      const data = snapshot.docs
        .map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setShows(data);
      setLoading(false);
      setActiveShowId(prev => {
        if (prev && data.find(s => s.id === prev)) return prev;
        return data[0]?.id ?? null;
      });
    });
    return unsub;
  }, []);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  function showConfirm(message, onConfirm) {
    setConfirmDialog({ message, onConfirm });
  }

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const activeShow = shows.find(s => s.id === activeShowId) || shows[0];

  function updateShow(id, updates) {
    updateDoc(doc(db, "shows", id), updates);
  }

  function addShow() {
    const s = DEFAULT_SHOW();
    setDoc(doc(db, "shows", s.id), s);
    setActiveShowId(s.id);
    if (isMobile) setMobileTab("setlist");
  }

  function deleteShow(id) {
    if (shows.length === 1) return;
    showConfirm("Delete this show?", () => {
      const remaining = shows.filter(s => s.id !== id);
      if (activeShowId === id) setActiveShowId(remaining[0]?.id ?? null);
      deleteDoc(doc(db, "shows", id));
    });
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
    if (!memberName) return showToast("Pick your name first", "error");
    if (activeShow.songIds.length === 0) return showToast("Add some songs first!", "error");
    const existing = activeShow.suggestions || [];
    const filtered = existing.filter(s => s.member !== memberName);
    updateShow(activeShow.id, {
      suggestions: [...filtered, {
        member: memberName,
        songIds: [...activeShow.songIds],
        savedAt: new Date().toISOString(),
      }]
    });
    showToast(`Saved as ${memberName}'s suggestion ✓`);
  }

  function loadSuggestion(suggestion) {
    showConfirm(`Load ${suggestion.member}'s set? This will replace the current set list.`, () => {
      updateShow(activeShow.id, { songIds: [...suggestion.songIds] });
      setViewMode("builder");
      if (isMobile) setMobileTab("setlist");
      showToast(`Loaded ${suggestion.member}'s set ✓`);
    });
  }

  if (loading) return (
    <div style={{
      height:"100dvh", background:"#0d0d1c", display:"flex",
      alignItems:"center", justifyContent:"center",
      color:"#5ecdc4", fontFamily:"'Georgia', serif", fontSize:14, letterSpacing:"0.1em",
    }}>
      Loading…
    </div>
  );

  if (!activeShow) return null;

  // ── Shared sub-components ──────────────────────────────────────────────

  const metaBar = (
    <div style={{
      display:"flex", alignItems:"center", gap:8, padding:"8px 16px",
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
            outline:"none", flex:1, minWidth:120,
          }}
        />
      ) : (
        <div
          onClick={() => setEditingName(true)}
          style={{ fontSize:14, color:"#e0dcd0", cursor:"text", padding:"4px 0", flex:1, minWidth:0,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}
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
          outline:"none", width:130,
        }}
      />

      {!isMobile && (
        <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:11, color:"#888" }}>{activeShow.songIds.length} songs</span>

          <button onClick={() => setShowGenerate(true)} style={{
            padding:"4px 10px", fontSize:11, fontFamily:"inherit",
            background:"transparent", border:"1px solid #2a4040", color:"#5ecdc4",
            borderRadius:3, cursor:"pointer",
          }}>Generate Set</button>

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
          }}>Save as My Set</button>

          <button onClick={() => setPrintShow(activeShow)} style={{
            padding:"4px 10px", fontSize:11, fontFamily:"inherit",
            background:"#f07272", border:"none", color:"#0d0d1c",
            borderRadius:3, cursor:"pointer", fontWeight:"bold",
          }}>Export</button>

          <button onClick={() => deleteShow(activeShow.id)} style={{
            padding:"4px 8px", fontSize:11,
            background:"transparent", border:"1px solid #3a2020", color:"#906060",
            borderRadius:3, cursor:"pointer", fontFamily:"inherit",
          }}>Delete Show</button>
        </div>
      )}
    </div>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────

  if (isMobile) {
    const suggestionCount = activeShow.suggestions?.length || 0;

    return (
      <div style={{
        display:"flex", flexDirection:"column", height:"100dvh",
        background:"#0d0d1c", color:"#e0dcd0",
        fontFamily:"'Georgia', serif", overflow:"hidden",
      }}>
        {/* Top bar */}
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          padding:"0 12px", height:48,
          borderBottom:"1px solid #1e1e36", flexShrink:0,
          background:"#09091a",
        }}>
          <div style={{ fontSize:12, color:"#f07272", fontWeight:"bold", letterSpacing:"0.1em" }}>
            SDWF
          </div>

          {/* Show tabs */}
          <div style={{ display:"flex", gap:2, flex:1, overflow:"auto", minWidth:0 }}>
            {shows.map(show => (
              <button key={show.id} onClick={() => setActiveShowId(show.id)} style={{
                padding:"4px 10px", borderRadius:"3px 3px 0 0", fontSize:11,
                border:"1px solid",
                borderBottom: activeShowId === show.id ? "1px solid #09091a" : "1px solid #1e1e36",
                borderColor: activeShowId === show.id ? "#282840 #282840 #09091a #282840" : "#1e1e36",
                background: activeShowId === show.id ? "#09091a" : "transparent",
                color: activeShowId === show.id ? "#e0dcd0" : "#555",
                cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
              }}>{show.name}</button>
            ))}
            <button onClick={addShow} style={{
              padding:"4px 8px", background:"transparent",
              border:"1px solid #1e1e36", borderBottom:"1px solid #1e1e36",
              color:"#777", cursor:"pointer", fontSize:16, borderRadius:"3px 3px 0 0", lineHeight:1,
            }}>+</button>
          </div>

          <select
            value={memberName}
            onChange={e => setMemberName(e.target.value)}
            style={{
              background:"#18182c", border:"1px solid #282840",
              color: memberName ? "#f07272" : "#555",
              padding:"4px 6px", borderRadius:3, fontSize:11, fontFamily:"inherit",
              cursor:"pointer", outline:"none", maxWidth:100,
            }}
          >
            <option value="">Who?</option>
            {BAND_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <button onClick={() => setShowAdmin(true)} style={{
            background:"transparent", border:"1px solid #2a4040", color:"#5ecdc4",
            borderRadius:3, padding:"4px 8px", fontSize:13, cursor:"pointer", fontFamily:"inherit",
          }}>⚙</button>
        </div>

        {/* Meta bar */}
        {metaBar}

        {/* Tab content */}
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

          {/* LIBRARY TAB */}
          {mobileTab === "library" && (
            <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              {/* Generate Set button */}
              <button onClick={() => setShowGenerate(true)} style={{
                margin:"10px 12px 4px", padding:"10px",
                background:"transparent", border:"1px solid #2a4040", color:"#5ecdc4",
                borderRadius:4, cursor:"pointer", fontSize:13, fontFamily:"inherit",
                fontWeight:"bold", letterSpacing:"0.05em",
              }}>
                ✦ Generate Set
              </button>
              <div style={{
                padding:"4px 16px 6px", fontSize:9, color:"#666",
                letterSpacing:"0.2em", textTransform:"uppercase",
              }}>
                Song Library — {activeShow.songIds.length} in set
              </div>
              <div style={{ flex:1, overflow:"hidden" }}>
                <SongLibrary setlistSongIds={activeShow.songIds} onAdd={addSong} />
              </div>
            </div>
          )}

          {/* SET LIST TAB */}
          {mobileTab === "setlist" && (
            <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              <div style={{
                padding:"10px 16px 6px", fontSize:9, color:"#666",
                letterSpacing:"0.2em", textTransform:"uppercase", flexShrink:0,
                borderBottom:"1px solid #1a1a30",
                display:"flex", justifyContent:"space-between", alignItems:"center",
              }}>
                <span>Set List — {activeShow.songIds.length} songs</span>
                <span style={{ color:"#555", fontSize:9 }}>drag to reorder</span>
              </div>
              <div style={{ flex:1, overflowY:"auto" }}>
                <SetlistBuilder songIds={activeShow.songIds} onChange={setSongIds} />
              </div>
              {/* Action footer */}
              <div style={{
                display:"flex", gap:8, padding:"10px 12px",
                borderTop:"1px solid #1a1a30", background:"#0c0c1a", flexShrink:0,
              }}>
                <button onClick={saveSuggestion} style={{
                  flex:1, padding:"10px", fontSize:12, fontFamily:"inherit",
                  background:"transparent", border:"1px solid #1e3a48", color:"#5ecdc4",
                  borderRadius:4, cursor:"pointer",
                }}>Save as My Set</button>
                <button onClick={() => setPrintShow(activeShow)} style={{
                  flex:1, padding:"10px", fontSize:12, fontFamily:"inherit",
                  background:"#f07272", border:"none", color:"#0d0d1c",
                  borderRadius:4, cursor:"pointer", fontWeight:"bold",
                }}>Export</button>
              </div>
            </div>
          )}

          {/* SUGGESTIONS TAB */}
          {mobileTab === "suggestions" && (
            <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
              <SuggestionsPanel
                suggestions={activeShow.suggestions || []}
                onLoad={loadSuggestion}
              />
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div style={{
          display:"flex", borderTop:"1px solid #1e1e36",
          background:"#09091a", flexShrink:0,
          paddingBottom:"env(safe-area-inset-bottom, 0px)",
        }}>
          {[
            { id:"library", label:"Library" },
            { id:"setlist", label:`Set List${activeShow.songIds.length > 0 ? ` (${activeShow.songIds.length})` : ""}` },
            { id:"suggestions", label:`Suggestions${suggestionCount > 0 ? ` (${suggestionCount})` : ""}` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)} style={{
              flex:1, padding:"12px 4px", border:"none",
              background: mobileTab === tab.id ? "#18182c" : "transparent",
              color: mobileTab === tab.id ? "#f07272" : "#666",
              fontFamily:"inherit", fontSize:11, cursor:"pointer",
              borderTop: mobileTab === tab.id ? "2px solid #f07272" : "2px solid transparent",
            }}>{tab.label}</button>
          ))}
        </div>

        <PrintModal show={printShow} onClose={() => setPrintShow(null)} onToast={showToast} />
        {showGenerate && (
          <GenerateModal
            currentSongIds={activeShow.songIds}
            onGenerate={(ids) => { setSongIds(ids); setMobileTab("setlist"); }}
            onClose={() => setShowGenerate(false)}
          />
        )}
        {showAdmin && <SongAdmin onClose={() => setShowAdmin(false)} />}
        {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
        {confirmDialog && (
          <ConfirmDialog
            message={confirmDialog.message}
            onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
            onCancel={() => setConfirmDialog(null)}
          />
        )}
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────

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

        <div style={{ display:"flex", gap:2, flex:1, overflow:"auto", minWidth:0 }}>
          {shows.map(show => (
            <button key={show.id} onClick={() => setActiveShowId(show.id)} style={{
              padding:"5px 12px", borderRadius:"3px 3px 0 0", fontSize:12,
              border:"1px solid",
              borderBottom: activeShowId === show.id ? "1px solid #09091a" : "1px solid #1e1e36",
              borderColor: activeShowId === show.id ? "#282840 #282840 #09091a #282840" : "#1e1e36",
              background: activeShowId === show.id ? "#09091a" : "transparent",
              color: activeShowId === show.id ? "#e0dcd0" : "#555",
              cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
            }}>{show.name}</button>
          ))}
          <button onClick={addShow} style={{
            padding:"5px 10px", background:"transparent",
            border:"1px solid #1e1e36", borderBottom:"1px solid #1e1e36",
            color:"#777", cursor:"pointer", fontSize:16, borderRadius:"3px 3px 0 0", lineHeight:1,
          }}>+</button>
        </div>

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

        <button onClick={() => setShowAdmin(true)} style={{
          padding:"4px 10px", fontSize:13, fontFamily:"inherit",
          background:"transparent", border:"1px solid #2a4040", color:"#5ecdc4",
          borderRadius:3, cursor:"pointer",
        }}>⚙ Songs</button>
      </div>

      {metaBar}

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

        <button onClick={() => setSidebarOpen(o => !o)} style={{
          width:20, background:"#0c0c1a", border:"none",
          borderRight:"1px solid #1a1a30", color:"#666",
          cursor:"pointer", fontSize:12, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {sidebarOpen ? "‹" : "›"}
        </button>

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
            <SuggestionsPanel suggestions={activeShow.suggestions || []} onLoad={loadSuggestion} />
          )}
        </div>
      </div>

      <PrintModal show={printShow} onClose={() => setPrintShow(null)} onToast={showToast} />
      {showGenerate && (
        <GenerateModal
          currentSongIds={activeShow.songIds}
          onGenerate={setSongIds}
          onClose={() => setShowGenerate(false)}
        />
      )}
      {showAdmin && <SongAdmin onClose={() => setShowAdmin(false)} />}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
          onCancel={() => setConfirmDialog(null)}
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
        color:"#777", fontSize:13, fontStyle:"italic", padding:24, textAlign:"center",
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
              }}>Load This Set</button>
            </div>
            <SuggestionSongListInner songIds={s.songIds} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionSongListInner({ songIds }) {
  const { songs } = useSongs();
  const songMap = Object.fromEntries(songs.map(s => [s.id, s]));
  const preview = songIds.slice(0, 8);
  const rest = songIds.length - 8;
  return (
    <div>
      {preview.map((id, i) => (
        <div key={id} style={{ fontSize:12, color:"#888", display:"flex", gap:8, marginBottom:2 }}>
          <span style={{ color:"#666", minWidth:20, textAlign:"right" }}>{i+1}.</span>
          <span>{songMap[id]?.title || "Unknown"}</span>
        </div>
      ))}
      {rest > 0 && (
        <div style={{ fontSize:11, color:"#666", marginTop:4, fontStyle:"italic" }}>
          + {rest} more songs…
        </div>
      )}
    </div>
  );
}
