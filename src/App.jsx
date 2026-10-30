import { useState, useEffect } from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { colors, fonts } from "./theme";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSongs } from "./context/SongsContext";
import SongLibrary from "./components/SongLibrary";
import SetlistBuilder, { calcTotalDuration } from "./components/SetlistBuilder";
import ShareModal from "./components/ShareModal";
import GenerateModal from "./components/GenerateModal";
import ShowSetlist from "./components/ShowSetlist";
import VotePanel from "./components/VotePanel";
import SongAdmin from "./components/SongAdmin";
import { Toast, ConfirmDialog } from "./components/Toast";

const BASE_URL = `${window.location.origin}${window.location.pathname}`;

const DEFAULT_SHOW = () => ({
  id: crypto.randomUUID(),
  name: "New Show",
  date: "",
  venue: "",
  songIds: [],
  votingEnabled: false,
  createdAt: new Date().toISOString(),
});

export default function App() {
  const { songs } = useSongs();
  const songMap = Object.fromEntries(songs.map(s => [s.id, s]));
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeShowId, setActiveShowId] = useLocalStorage("sickday-active-show", null);
  const [shareShow, setShareShow] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [libraryOpen, setLibraryOpen] = useLocalStorage("sickday-library-open", false);
  const [mobileTab, setMobileTab] = useState("setlist");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
    }, (err) => {
      console.error("Shows listener failed:", err);
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

  function duplicateShowWithSongs(songIds) {
    const s = {
      ...DEFAULT_SHOW(),
      name: `${activeShow.name} (alt)`,
      date: activeShow.date || "",
      venue: activeShow.venue || "",
      songIds,
    };
    setDoc(doc(db, "shows", s.id), s);
    setActiveShowId(s.id);
    if (isMobile) setMobileTab("setlist");
    showToast(`Duplicated as "${s.name}" ✓`);
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

  function addAllSongs(songIds) {
    if (activeShow.locked) { showToast("Set is locked 🔒"); return; }
    const existing = new Set(activeShow.songIds);
    const toAdd = songIds.filter(id => !existing.has(id));
    if (toAdd.length === 0) return;
    updateShow(activeShow.id, { songIds: [...activeShow.songIds, ...toAdd] });
    showToast(`Added ${toAdd.length} songs ✓`);
    if (isMobile) setMobileTab("setlist");
  }

  function addSong(songId) {
    if (activeShow.locked) { showToast("Set is locked 🔒"); return; }
    if (!activeShow.songIds.includes(songId)) {
      updateShow(activeShow.id, { songIds: [...activeShow.songIds, songId] });
    }
  }

  function toggleLocked() {
    updateShow(activeShow.id, { locked: !activeShow.locked });
  }

  function toggleVoting() {
    updateShow(activeShow.id, { votingEnabled: !activeShow.votingEnabled });
  }

  // ── Voting ─────────────────────────────────────────────────────────────
  const voting = activeShow?.voting || {};
  const playedSongIds = activeShow?.playedSongIds || [];
  const isShowMode = playedSongIds.length > 0 || voting.active;

  function openVoting(timerSecs) {
    updateShow(activeShow.id, {
      voting: {
        ...(activeShow.voting || {}),
        active: true,
        paused: false,
        endsAt: Date.now() + timerSecs * 1000,
        pausedRemaining: null,
        timerSeconds: timerSecs,
        songVotes: activeShow.voting?.songVotes || {},
      }
    });
  }

  function pauseVoting() {
    const remaining = Math.max(0, voting.endsAt - Date.now());
    updateShow(activeShow.id, {
      voting: { ...voting, paused: true, endsAt: null, pausedRemaining: remaining },
    });
  }

  function resumeVoting() {
    const remaining = voting.pausedRemaining ?? 0;
    updateShow(activeShow.id, {
      voting: { ...voting, paused: false, endsAt: Date.now() + remaining, pausedRemaining: null },
    });
  }

  function closeVoting() {
    const votes = activeShow.voting?.songVotes || {};
    const played = new Set(activeShow.playedSongIds || []);
    const unplayed = activeShow.songIds.filter(id => !played.has(id));
    unplayed.sort((a, b) => {
      const va = votes[String(a)] || votes[a] || 0;
      const vb = votes[String(b)] || votes[b] || 0;
      if (vb !== va) return vb - va;
      return activeShow.songIds.indexOf(a) - activeShow.songIds.indexOf(b);
    });
    const newSongIds = [...(activeShow.playedSongIds || []), ...unplayed];
    updateShow(activeShow.id, {
      songIds: newSongIds,
      voting: { ...activeShow.voting, active: false, paused: false, endsAt: null, pausedRemaining: null },
    });
    showToast("Vote closed — setlist reordered ✓");
  }

  function markPlayed(songId) {
    const newPlayed = [...(activeShow.playedSongIds || []), songId];
    updateShow(activeShow.id, { playedSongIds: newPlayed });
  }

  function undoPlayed(songId) {
    const newPlayed = (activeShow.playedSongIds || []).filter(id => id !== songId);
    updateShow(activeShow.id, { playedSongIds: newPlayed });
  }

  // Auto-close voting when timer expires
  useEffect(() => {
    if (!voting.active || !voting.endsAt || voting.paused) return;
    const remaining = voting.endsAt - Date.now();
    if (remaining <= 0) { closeVoting(); return; }
    const t = setTimeout(closeVoting, remaining);
    return () => clearTimeout(t);
  }, [voting.active, voting.endsAt, voting.paused]);

  function fmtDuration(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  const totalDuration = calcTotalDuration(activeShow?.songIds || [], songMap);

  if (loading) return (
    <div style={{
      height: "100dvh", background: colors.bgPage, display: "flex",
      alignItems: "center", justifyContent: "center",
      color: colors.teal, fontFamily: "'Georgia', serif", fontSize: 14, letterSpacing: "0.1em",
    }}>
      Loading…
    </div>
  );

  if (!activeShow) return null;

  // ── Shared meta bar ────────────────────────────────────────────────────
  const hasSet = activeShow.songIds.length > 0;

  const metaBar = (
    <div style={{
      borderBottom: `1px solid ${colors.borderLight}`, background: colors.bgPanel, flexShrink: 0,
    }}>
      {/* Row 1: show name · date · venue + pencil — same on mobile and desktop */}
      <div style={{ padding: "8px 16px 4px", display: "flex", alignItems: "center", gap: 0, minWidth: 0 }}>
        <span style={{ fontSize: isMobile ? 17 : 18, color: colors.textPrimary, fontWeight: "bold", fontFamily: fonts.heading, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeShow.name}
        </span>
        {(activeShow.date || activeShow.venue) && (
          <span style={{ fontSize: 13, color: colors.textMuted, whiteSpace: "nowrap", flexShrink: 0 }}>
            {activeShow.date ? ` · ${activeShow.date.slice(5).replace("-", "/")}` : ""}
            {activeShow.venue ? ` · ${activeShow.venue}` : ""}
          </span>
        )}
        <button onClick={() => setShowDetailsModal(true)} style={{
          background: "none", border: "none", color: colors.textDim, cursor: "pointer",
          fontSize: 13, padding: "0 0 0 6px", flexShrink: 0, lineHeight: 1,
        }}>✎</button>
      </div>

      {/* Row 2: action buttons — desktop only */}
      {!isMobile && (
        <div style={{ padding: "4px 16px 8px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: colors.textMuted, marginRight: 4 }}>{activeShow.songIds.length} songs{totalDuration > 0 ? ` · ${fmtDuration(totalDuration)}` : ""}</span>
          <a
            href={hasSet ? `${BASE_URL}?charts=${activeShow.id}` : undefined}
            target="_blank" rel="noopener noreferrer"
            onClick={e => !hasSet && e.preventDefault()}
            style={{
              padding: "4px 12px", fontSize: 12, fontFamily: "inherit",
              background: "transparent", border: `1px solid ${colors.coral}`, color: colors.coral,
              borderRadius: 3, cursor: hasSet ? "pointer" : "default", opacity: hasSet ? 1 : 0.4,
              textDecoration: "none", display: "inline-block",
            }}
          >Band Charts</a>
          <a
            href={hasSet ? `${BASE_URL}?prompter=${activeShow.id}` : undefined}
            target="_blank" rel="noopener noreferrer"
            onClick={e => !hasSet && e.preventDefault()}
            style={{
              padding: "4px 12px", fontSize: 12, fontFamily: "inherit",
              background: "transparent", border: `1px solid ${colors.teal}`, color: colors.teal,
              borderRadius: 3, cursor: hasSet ? "pointer" : "default", opacity: hasSet ? 1 : 0.4,
              textDecoration: "none", display: "inline-block",
            }}
          >Prompter View</a>
          <button onClick={() => setShareShow(activeShow)} style={{
            padding: "4px 12px", fontSize: 12, fontFamily: "inherit",
            background: "transparent", border: `1px solid ${colors.purple}`, color: colors.purple,
            borderRadius: 3, cursor: "pointer",
          }}>Share Set</button>
          <button onClick={() => !activeShow.locked && setShowGenerate(true)} style={{
            padding: "4px 12px", fontSize: 12, fontFamily: "inherit",
            background: "transparent", border: `1px solid ${activeShow.locked ? colors.borderMed : colors.gold}`,
            color: activeShow.locked ? colors.textDim : colors.gold,
            borderRadius: 3, cursor: activeShow.locked ? "default" : "pointer",
            opacity: activeShow.locked ? 0.4 : 1,
          }}>Build Set</button>
        </div>
      )}
    </div>
  );

  // ── Mobile layout ──────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", height: "100dvh",
        background: colors.bgPage, color: colors.textPrimary,
        fontFamily: fonts.body, overflow: "hidden",
      }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center",
          height: 48, flexShrink: 0,
          borderBottom: `1px solid ${colors.borderMed}`,
          background: colors.bgHeader, overflow: "hidden",
        }}>
          <div style={{ fontSize: 12, color: colors.coral, fontWeight: "bold", letterSpacing: "0.1em", padding: "0 10px", flexShrink: 0 }}>
            SDWF
          </div>
          {/* Scrollable show tabs */}
          <div style={{
            display: "flex", gap: 2, flex: 1, minWidth: 0,
            overflowX: "auto", WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none", msOverflowStyle: "none",
            alignItems: "center",
          }}>
            {shows.map(show => (
              <button key={show.id} onClick={() => setActiveShowId(show.id)} style={{
                padding: "4px 10px", borderRadius: "3px 3px 0 0", fontSize: 11,
                border: "1px solid", flexShrink: 0,
                borderColor: activeShowId === show.id ? `${colors.borderMed} ${colors.borderMed} ${colors.bgHeader} ${colors.borderMed}` : colors.borderMed,
                background: activeShowId === show.id ? colors.bgHeader : "transparent",
                color: activeShowId === show.id ? colors.textPrimary : colors.textFaint,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis",
              }}>{show.name}</button>
            ))}
            <button onClick={addShow} style={{
              padding: "4px 10px", background: "transparent", flexShrink: 0,
              border: `1px solid ${colors.borderMed}`,
              color: colors.textDim, cursor: "pointer", fontSize: 11, borderRadius: "3px 3px 0 0",
              fontFamily: "inherit", whiteSpace: "nowrap",
            }}>+ New Show</button>
          </div>
          <button onClick={() => setShowAdmin(true)} style={{
            background: "transparent", border: `1px solid ${colors.borderTeal}`, color: colors.teal,
            borderRadius: 3, padding: "4px 8px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            flexShrink: 0, margin: "0 8px",
          }}>⚙</button>
        </div>

        {metaBar}

        {/* Tab content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {mobileTab === "library" && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <button onClick={() => !activeShow.locked && setShowGenerate(true)} style={{
                margin: "10px 12px 4px", padding: "10px",
                background: "transparent", border: `1px solid ${activeShow.locked ? colors.borderMed : colors.borderTeal}`,
                color: activeShow.locked ? colors.textDim : colors.teal,
                borderRadius: 4, cursor: activeShow.locked ? "default" : "pointer", fontSize: 13, fontFamily: "inherit",
                fontWeight: "bold", letterSpacing: "0.05em", opacity: activeShow.locked ? 0.4 : 1,
              }}>✦ Generate Set</button>
              <div style={{ padding: "4px 16px 6px", fontSize: 9, color: colors.textDim, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Song Library — {activeShow.songIds.length} in set
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <SongLibrary setlistSongIds={activeShow.songIds} onAdd={addSong} onAddAll={addAllSongs} />
              </div>
            </div>
          )}

          {mobileTab === "setlist" && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{
                padding: "10px 16px 6px", fontSize: 9, color: colors.textDim,
                letterSpacing: "0.2em", textTransform: "uppercase", flexShrink: 0,
                borderBottom: `1px solid ${colors.borderLight}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  Set List — {activeShow.songIds.length} songs{totalDuration > 0 ? ` · ${fmtDuration(totalDuration)}` : ""}
                  {activeShow.locked && <span style={{ color: colors.gold, fontSize: 10 }}>🔒</span>}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={toggleLocked} style={{
                    background: "none", border: `1px solid ${activeShow.locked ? colors.gold : colors.borderMed}`,
                    color: activeShow.locked ? colors.gold : colors.textDim,
                    borderRadius: 3, padding: "2px 7px", fontSize: 9, cursor: "pointer", fontFamily: "inherit",
                  }}>{activeShow.locked ? "Unlock" : "Lock"}</button>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 9, color: colors.textMuted }}>
                    <input type="checkbox" checked={!!activeShow.votingEnabled} onChange={toggleVoting} style={{ cursor: "pointer" }} />
                    Crowd voting
                  </label>
                </div>
              </div>
              {activeShow.votingEnabled && (
                <VotePanel show={activeShow} onOpen={openVoting} onClose={closeVoting} onPause={pauseVoting} onResume={resumeVoting} />
              )}
              <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
                {isShowMode
                  ? <ShowSetlist songIds={activeShow.songIds} playedSongIds={playedSongIds} voting={voting} songMap={songMap} onMarkPlayed={markPlayed} onUndoPlayed={undoPlayed} />
                  : <SetlistBuilder songIds={activeShow.songIds} onChange={setSongIds} showId={activeShow.id} baseUrl={BASE_URL} locked={!!activeShow.locked} />
                }
              </div>
              {!isShowMode && (
                <div style={{
                  display: "flex", gap: 6, padding: "8px 10px",
                  borderTop: `1px solid ${colors.borderLight}`, background: colors.bgPanel, flexShrink: 0,
                }}>
                  <a
                    href={activeShow.songIds.length > 0 ? `${BASE_URL}?charts=${activeShow.id}` : undefined}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => activeShow.songIds.length === 0 && e.preventDefault()}
                    style={{
                      flex: 1, padding: "9px 4px", fontSize: 13, fontFamily: "inherit", textAlign: "center",
                      background: "transparent", border: `1px solid ${colors.coral}`, color: colors.coral,
                      borderRadius: 4, cursor: activeShow.songIds.length === 0 ? "default" : "pointer",
                      opacity: activeShow.songIds.length === 0 ? 0.4 : 1,
                      textDecoration: "none", display: "block", lineHeight: 1.3,
                    }}
                  >Band<br/>Charts</a>
                  <a
                    href={activeShow.songIds.length > 0 ? `${BASE_URL}?prompter=${activeShow.id}` : undefined}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => activeShow.songIds.length === 0 && e.preventDefault()}
                    style={{
                      flex: 1, padding: "9px 4px", fontSize: 13, fontFamily: "inherit", textAlign: "center",
                      background: "transparent", border: `1px solid ${colors.teal}`, color: colors.teal,
                      borderRadius: 4, cursor: activeShow.songIds.length === 0 ? "default" : "pointer",
                      opacity: activeShow.songIds.length === 0 ? 0.4 : 1,
                      textDecoration: "none", display: "block", lineHeight: 1.3,
                    }}
                  >Prompter<br/>View</a>
                  <button onClick={() => setShareShow(activeShow)} style={{
                    flex: 1, padding: "9px 4px", fontSize: 13, fontFamily: "inherit",
                    background: "transparent", border: `1px solid ${colors.purple}`, color: colors.purple,
                    borderRadius: 4, cursor: "pointer", lineHeight: 1.3,
                  }}>Share<br/>Set</button>
                  <button onClick={() => !activeShow.locked && setShowGenerate(true)} style={{
                    flex: 1, padding: "9px 4px", fontSize: 13, fontFamily: "inherit",
                    background: "transparent", border: `1px solid ${activeShow.locked ? colors.borderMed : colors.gold}`,
                    color: activeShow.locked ? colors.textDim : colors.gold,
                    borderRadius: 4, cursor: activeShow.locked ? "default" : "pointer", lineHeight: 1.3,
                    opacity: activeShow.locked ? 0.4 : 1,
                  }}>Build<br/>Set</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div style={{
          display: "flex", borderTop: `1px solid ${colors.borderMed}`,
          background: colors.bgHeader, flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}>
          {[
            { id: "library", label: "Library" },
            { id: "setlist", label: `Set List${activeShow.songIds.length > 0 ? ` (${activeShow.songIds.length})` : ""}` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)} style={{
              flex: 1, padding: "12px 4px", border: "none",
              background: mobileTab === tab.id ? colors.bgInput : "transparent",
              color: mobileTab === tab.id ? colors.coral : colors.textDim,
              fontFamily: "inherit", fontSize: 11, cursor: "pointer",
              borderTop: mobileTab === tab.id ? `2px solid ${colors.coral}` : "2px solid transparent",
            }}>{tab.label}</button>
          ))}
        </div>

        <ShareModal show={shareShow} onClose={() => setShareShow(null)} onToast={showToast} />
        {showGenerate && (
          <GenerateModal
            currentSongIds={activeShow.songIds}
            onGenerate={(ids) => { setSongIds(ids); setMobileTab("setlist"); }}
            onDuplicate={duplicateShowWithSongs}
            onClose={() => setShowGenerate(false)}
          />
        )}
        {showAdmin && <SongAdmin onClose={() => setShowAdmin(false)} onToast={showToast} />}
        {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
        {confirmDialog && (
          <ConfirmDialog
            message={confirmDialog.message}
            onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
            onCancel={() => setConfirmDialog(null)}
          />
        )}

        {/* Show details modal */}
        {showDetailsModal && (
          <div
            onClick={() => setShowDetailsModal(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
              display: "flex", alignItems: "flex-end", zIndex: 200,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", background: colors.bgPanel,
                borderRadius: "12px 12px 0 0", padding: "20px 16px 32px",
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              <div style={{ fontSize: 12, color: colors.textDim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
                Show Details
              </div>
              <input
                autoFocus
                value={activeShow.name}
                onChange={e => updateShow(activeShow.id, { name: e.target.value })}
                placeholder="Show name"
                style={{
                  background: colors.bgInput, border: `1px solid ${colors.borderMed}`, color: colors.textPrimary,
                  padding: "10px 12px", borderRadius: 6, fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%",
                }}
              />
              <input
                value={activeShow.date || ""}
                onChange={e => updateShow(activeShow.id, { date: e.target.value })}
                placeholder="Date"
                type="date"
                style={{
                  background: colors.bgInput, border: `1px solid ${colors.borderMed}`, color: colors.textMuted,
                  padding: "10px 12px", borderRadius: 6, fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%",
                }}
              />
              <input
                value={activeShow.venue || ""}
                onChange={e => updateShow(activeShow.id, { venue: e.target.value })}
                placeholder="Venue"
                style={{
                  background: colors.bgInput, border: `1px solid ${colors.borderMed}`, color: colors.textMuted,
                  padding: "10px 12px", borderRadius: 6, fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowDetailsModal(false)} style={{
                  flex: 1, padding: "12px", fontSize: 14, fontFamily: "inherit",
                  background: colors.bgInput, border: `1px solid ${colors.borderMed}`, color: colors.textPrimary,
                  borderRadius: 6, cursor: "pointer",
                }}>Done</button>
                <button onClick={() => { setShowDetailsModal(false); deleteShow(activeShow.id); }} style={{
                  padding: "12px 16px", fontSize: 14, fontFamily: "inherit",
                  background: "transparent", border: `1px solid ${colors.borderRed}`, color: colors.danger,
                  borderRadius: 6, cursor: "pointer",
                }}>Delete Show</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: colors.bgPage, color: colors.textPrimary,
      fontFamily: fonts.body, overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 16px", height: 52,
        borderBottom: `1px solid ${colors.borderMed}`, flexShrink: 0,
        background: colors.bgHeader,
      }}>
        <div style={{ fontSize: 12, color: colors.coral, fontWeight: "bold", letterSpacing: "0.1em", marginRight: 4 }}>
          SDWF
        </div>
        <div style={{ display: "flex", gap: 2, flex: 1, overflow: "auto", minWidth: 0 }}>
          {shows.map(show => (
            <button key={show.id} onClick={() => setActiveShowId(show.id)} style={{
              padding: "5px 12px", borderRadius: "3px 3px 0 0", fontSize: 12,
              border: "1px solid",
              borderColor: activeShowId === show.id ? `${colors.borderMed} ${colors.borderMed} ${colors.bgHeader} ${colors.borderMed}` : colors.borderMed,
              background: activeShowId === show.id ? colors.bgHeader : "transparent",
              color: activeShowId === show.id ? colors.textPrimary : colors.textFaint,
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}>{show.name}</button>
          ))}
          <button onClick={addShow} style={{
            padding: "5px 10px", background: "transparent",
            border: `1px solid ${colors.borderMed}`,
            color: colors.textDim, cursor: "pointer", fontSize: 11, borderRadius: "3px 3px 0 0", lineHeight: 1,
            fontFamily: "inherit",
          }}>+ New Show</button>
        </div>

        <button onClick={() => setShowAdmin(true)} style={{
          padding: "4px 10px", fontSize: 13, fontFamily: "inherit",
          background: "transparent", border: `1px solid ${colors.borderTeal}`, color: colors.teal,
          borderRadius: 3, cursor: "pointer",
        }}>⚙ Songs</button>
      </div>

      {metaBar}

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Library toggle tab */}
        <button onClick={() => setLibraryOpen(o => !o)} style={{
          width: 24, background: libraryOpen ? colors.bgPanel : colors.bgPage,
          border: "none", borderRight: `1px solid ${colors.borderLight}`,
          color: colors.textDim, cursor: "pointer", fontSize: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          writingMode: "vertical-rl",
        }} title={libraryOpen ? "Collapse library" : "Expand library"}>
          {libraryOpen ? "‹ Library" : "Library ›"}
        </button>

        {/* Library panel */}
        {libraryOpen && (
          <div style={{
            width: 280, minWidth: 280,
            borderRight: `1px solid ${colors.borderLight}`,
            display: "flex", flexDirection: "column",
            overflow: "hidden", background: colors.bgPanel,
          }}>
            <div style={{
              padding: "10px 16px 6px", fontSize: 10, color: colors.textDim,
              letterSpacing: "0.2em", textTransform: "uppercase", flexShrink: 0,
              borderBottom: `1px solid ${colors.borderLight}`,
            }}>
              Song Library — {activeShow.songIds.length} in set
            </div>
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <SongLibrary setlistSongIds={activeShow.songIds} onAdd={addSong} onAddAll={addAllSongs} />
            </div>
          </div>
        )}

        {/* Setlist area */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{
            padding: "10px 16px 8px", fontSize: 10, color: colors.textDim,
            letterSpacing: "0.2em", textTransform: "uppercase",
            borderBottom: `1px solid ${colors.borderLight}`, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              Set List — {activeShow.songIds.length} songs
              {totalDuration > 0 ? ` · ${fmtDuration(totalDuration)}` : ""}
              {!isShowMode && !activeShow.locked && " · drag to reorder"}
              {activeShow.locked && <span style={{ color: colors.gold }}>🔒 locked</span>}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={toggleLocked} style={{
                background: "none", border: `1px solid ${activeShow.locked ? colors.gold : colors.borderMed}`,
                color: activeShow.locked ? colors.gold : colors.textDim,
                borderRadius: 3, padding: "2px 8px", fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                textTransform: "none",
              }}>{activeShow.locked ? "Unlock" : "Lock"}</button>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 10, color: colors.textMuted, textTransform: "none" }}>
                <input type="checkbox" checked={!!activeShow.votingEnabled} onChange={toggleVoting} style={{ cursor: "pointer", accentColor: colors.teal }} />
                Crowd voting
              </label>
            </div>
          </div>

          {activeShow.votingEnabled && (
            <VotePanel show={activeShow} onOpen={openVoting} onClose={closeVoting} onPause={pauseVoting} onResume={resumeVoting} />
          )}

          <div style={{ flex: 1, overflowY: "auto" }}>
            {isShowMode
              ? <ShowSetlist songIds={activeShow.songIds} playedSongIds={playedSongIds} voting={voting} songMap={songMap} onMarkPlayed={markPlayed} onUndoPlayed={undoPlayed} />
              : <SetlistBuilder songIds={activeShow.songIds} onChange={setSongIds} showId={activeShow.id} baseUrl={BASE_URL} locked={!!activeShow.locked} />
            }
          </div>
        </div>
      </div>

      <ShareModal show={shareShow} onClose={() => setShareShow(null)} onToast={showToast} />
      {showGenerate && (
        <GenerateModal currentSongIds={activeShow.songIds} onGenerate={setSongIds} onDuplicate={duplicateShowWithSongs} onClose={() => setShowGenerate(false)} />
      )}
      {showAdmin && <SongAdmin onClose={() => setShowAdmin(false)} onToast={showToast} />}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      {/* Show details modal */}
      {showDetailsModal && (
        <div
          onClick={() => setShowDetailsModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "flex-end", zIndex: 200,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", background: colors.bgPanel,
              borderRadius: "12px 12px 0 0", padding: "20px 16px 32px",
              display: "flex", flexDirection: "column", gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: colors.textDim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
              Show Details
            </div>
            <input
              autoFocus
              value={activeShow.name}
              onChange={e => updateShow(activeShow.id, { name: e.target.value })}
              placeholder="Show name"
              style={{
                background: colors.bgInput, border: `1px solid ${colors.borderMed}`, color: colors.textPrimary,
                padding: "10px 12px", borderRadius: 6, fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%",
              }}
            />
            <input
              value={activeShow.date || ""}
              onChange={e => updateShow(activeShow.id, { date: e.target.value })}
              placeholder="Date"
              type="date"
              style={{
                background: colors.bgInput, border: `1px solid ${colors.borderMed}`, color: colors.textMuted,
                padding: "10px 12px", borderRadius: 6, fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%",
              }}
            />
            <input
              value={activeShow.venue || ""}
              onChange={e => updateShow(activeShow.id, { venue: e.target.value })}
              placeholder="Venue"
              style={{
                background: colors.bgInput, border: `1px solid ${colors.borderMed}`, color: colors.textMuted,
                padding: "10px 12px", borderRadius: 6, fontSize: 15, fontFamily: "inherit", outline: "none", width: "100%",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setShowDetailsModal(false)} style={{
                flex: 1, padding: "12px", fontSize: 14, fontFamily: "inherit",
                background: colors.bgInput, border: `1px solid ${colors.borderMed}`, color: colors.textPrimary,
                borderRadius: 6, cursor: "pointer",
              }}>Done</button>
              <button onClick={() => { setShowDetailsModal(false); deleteShow(activeShow.id); }} style={{
                padding: "12px 16px", fontSize: 14, fontFamily: "inherit",
                background: "transparent", border: `1px solid ${colors.borderRed}`, color: colors.danger,
                borderRadius: 6, cursor: "pointer",
              }}>Delete Show</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
