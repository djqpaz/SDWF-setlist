import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, collection, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// Chord regex for distinguishing chord tokens from section labels
const CH = /^[A-G][#b]?(maj|min|m|dim|aug|sus|add|M)?\d*(sus\d|add\d|[#b]\d+)*(\/[A-G][#b]?)?$/;

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function parseLine(l) {
  const segs = []; let re = /\[([^\]]*)\]/g, last = 0, m, cur = { c: "", t: "" };
  while ((m = re.exec(l))) { cur.t += l.slice(last, m.index); if (cur.t || cur.c) segs.push(cur); cur = { c: m[1], t: "" }; last = re.lastIndex; }
  cur.t += l.slice(last); segs.push(cur); return segs;
}

function renderChart(chart, note, showChords = true) {
  const lines = chart.split("\n").slice(1);
  if (note && lines[0] === note) lines.shift();
  return lines.map((raw, ri) => {
    const l = raw.replace(/\s+$/, "");
    if (!l.trim()) return <div key={ri} style={{ height: "0.5em" }} />;
    const sm = l.match(/^\[([^\]]+)\]\s*(?:\((.*)\))?\s*$/);
    if (sm && !CH.test(sm[1])) {
      return (
        <div key={ri} style={{ display: "flex", gap: 10, alignItems: "baseline", margin: "14px 0 4px", flexWrap: "wrap" }}>
          <b style={{ background: "#1e3a38", color: "#4ecdc4", borderLeft: "3px solid #4ecdc4", padding: "1px 10px", fontSize: 12, letterSpacing: "0.08em" }}>{sm[1]}</b>
          {sm[2] && <span style={{ color: "#8888aa", fontStyle: "normal", fontSize: 13 }}>{sm[2]}</span>}
        </div>
      );
    }
    const segs = parseLine(l);
    const chordOnly = segs.every(s => !s.t.trim());
    // When chords hidden, skip pure-chord lines entirely
    if (chordOnly && !showChords) return null;
    return (
      <div key={ri} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", minHeight: showChords ? "1.5em" : undefined }}>
        {segs.map((s, i) => (
          <span key={i} style={{ display: "inline-flex", flexDirection: "column" }}>
            {showChords && (
              <span style={{ color: "#ff6b6b", fontWeight: "bold", height: "1.4em", whiteSpace: "pre", paddingRight: "0.4em" }}>
                {s.c || " "}
              </span>
            )}
            <span style={{ whiteSpace: "pre" }}>{s.t || (s.c ? " " : "")}</span>
          </span>
        ))}
      </div>
    );
  });
}

function SongCard({ song, index, showChords, editUrl }) {
  return (
    <article style={{
      background: "#1e1e34", border: "1px solid #2a2a4a", borderRadius: 8,
      marginBottom: 20, overflow: "hidden", pageBreakAfter: "always",
    }}>
      {/* Song header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #2a2a4a", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#9b8ec4", lineHeight: 1, minWidth: 38, fontVariantNumeric: "tabular-nums" }}>
          {String(index + 1).padStart(2, "0")}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, lineHeight: 1.2, color: "#f7f7f7" }}>{song.title}</div>
          <div style={{ color: "#8888aa", fontSize: 14, marginTop: 2 }}>{song.artist}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            {song.key && <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "#132626", border: "1px solid #2a6e6b", color: "#4ecdc4" }}>Key {song.key}</span>}
            <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "#22223a", border: "1px solid #2a2a4a", color: "#b8b8cc" }}>{song.bpm} BPM</span>
            {song.capo > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 9px", borderRadius: 99, background: "#22223a", border: "1px solid #2a2a4a", color: "#b8b8cc" }}>Capo {song.capo}</span>}
            {editUrl && (
              <button
                className="no-print"
                onClick={() => {
                  if (window.confirm("Excuse me… are you Abe Froman, the Sausage King of Chicago?\n\nThis is the chart editor — band use only.\n\nIf you're not Kenny or Dave, hit Cancel.")) {
                    window.location.href = editUrl + "&returnTo=" + encodeURIComponent(window.location.href);
                  }
                }}
                style={{ fontSize: 11, color: "#8888aa", border: "1px solid #2a2a4a", borderRadius: 4, padding: "2px 8px", background: "none", cursor: "pointer", marginLeft: "auto", fontFamily: "inherit" }}
              >✎ Edit chart</button>
            )}
          </div>
        </div>
      </div>

      {/* Note */}
      {song.note && (
        <div style={{ padding: "8px 18px", background: "#2a220e", borderBottom: "1px solid #6b5020", fontSize: 13, color: "#f4c542" }}>
          {song.note}
        </div>
      )}

      {/* Chart */}
      <div style={{
        padding: "6px 18px 16px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 14, lineHeight: 1.6, color: "#f7f7f7",
      }}>
        {song.chart
          ? renderChart(song.chart, song.note, showChords)
          : <em style={{ color: "#666688" }}>No chart yet</em>
        }
      </div>
    </article>
  );
}

const APP_URL = `${window.location.origin}${window.location.pathname}`;

export default function ChartsPage({ showId, songId }) {
  const [show, setShow] = useState(null);
  const [songs, setSongs] = useState({});
  const [bits, setBits] = useState({});
  const [loading, setLoading] = useState(true);
  const [showChords, setShowChords] = useState(true);
  const [currentSongIdx, setCurrentSongIdx] = useState(0);
  const [editingBit, setEditingBit] = useState(null); // bit id
  const [editBitFields, setEditBitFields] = useState({});
  const [savingBit, setSavingBit] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.getElementById("root").style.overflow = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.getElementById("root").style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "shows", showId), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setShow(data);
        document.title = `Charts — ${data.name} | Sick Day with Ferris`;
      }
      setLoading(false);
    });
    return () => { unsub(); document.title = "Bueller | Sick Day with Ferris"; };
  }, [showId]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "songs"), snap => {
      const map = {};
      snap.forEach(d => { map[d.id] = d.data(); map[String(d.data().id)] = d.data(); });
      setSongs(map);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cameronBits"), snap => {
      const map = {};
      snap.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
      setBits(map);
    });
    return unsub;
  }, []);

  // Build ordered entries from show.items (with songIds fallback)
  const allEntries = show
    ? (show.items && show.items.length > 0
        ? show.items.map(item => item.type === "cameron"
            ? bits[item.id] ? { type: "cameron", bit: bits[item.id] } : null
            : (songs[String(item.id)] || songs[item.id]) ? { type: "song", song: songs[String(item.id)] || songs[item.id] } : null)
          .filter(Boolean)
        : (show.songIds || []).map(id => songs[String(id)] || songs[id]).filter(Boolean).map(s => ({ type: "song", song: s })))
    : [];

  const songEntries = allEntries.filter(e => e.type === "song");

  useEffect(() => {
    if (songEntries.length <= 1) return;
    const visible = new Set();
    const obs = new IntersectionObserver(ioEntries => {
      ioEntries.forEach(e => {
        const idx = parseInt(e.target.dataset.songIdx || "-1", 10);
        if (idx < 0) return;
        if (e.isIntersecting) visible.add(idx);
        else visible.delete(idx);
      });
      if (visible.size > 0) setCurrentSongIdx(Math.min(...visible));
    }, { threshold: 0.05 });
    for (let i = 0; i < songEntries.length; i++) {
      const el = document.getElementById(`chart-song-${i}`);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [songEntries.length]);

  function scrollToSong(idx) {
    const el = document.getElementById(`chart-song-${idx}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openBitEditor(bit) {
    setEditBitFields({
      title: bit.title || "",
      type: bit.type || "Narration",
      speaker: bit.speaker || "",
      content: bit.content || "",
      duration: bit.duration || "",
    });
    setEditingBit(bit.id);
  }

  async function saveBit() {
    if (!editingBit) return;
    setSavingBit(true);
    try {
      const speakers = editBitFields.speaker
        ? editBitFields.speaker.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      await updateDoc(doc(db, "cameronBits", editingBit), {
        title: editBitFields.title,
        type: editBitFields.type,
        speaker: editBitFields.speaker,
        speakers,
        content: editBitFields.content,
        duration: editBitFields.duration ? Number(editBitFields.duration) : 0,
      });
      setEditingBit(null);
    } finally {
      setSavingBit(false);
    }
  }

  const BIT_TYPES = ["Narration", "Emcee", "LX / cue", "Wardrobe", "Transition"];
  const DOT_COLORS = { "Narration": "#4ecdc4", "Emcee": "#ff6b6b", "LX / cue": "#f4c542", "Wardrobe": "#9b8ec4", "Transition": "#8888aa" };

  const BitEditorModal = editingBit ? (() => {
    const dotColor = DOT_COLORS[editBitFields.type] || "#4ecdc4";
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 10002,
      }} onClick={() => setEditingBit(null)}>
        <div onClick={e => e.stopPropagation()} style={{
          background: "#1e1e34", borderRadius: "12px 12px 0 0",
          width: "100%", maxWidth: 700, maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          border: "1px solid #2a2a4a", borderBottom: "none",
        }}>
          {/* Editor header */}
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #2a2a4a", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, border: `1px solid ${dotColor}`, color: dotColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>Edit Bit</span>
            <div style={{ flex: 1, fontSize: 14, color: "#f7f7f7", fontStyle: "italic" }}>{editBitFields.title || "Untitled"}</div>
            <button onClick={() => setEditingBit(null)} style={{ background: "none", border: "none", color: "#8888aa", fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>
          </div>

          <div style={{ overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Title + Type row */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "#8888aa", display: "block", marginBottom: 4 }}>Title</label>
                <input value={editBitFields.title} onChange={e => setEditBitFields(f => ({ ...f, title: e.target.value }))}
                  style={{ width: "100%", background: "#13132a", border: "1px solid #2a2a4a", borderRadius: 6, color: "#f7f7f7", padding: "8px 10px", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#8888aa", display: "block", marginBottom: 4 }}>Type</label>
                <select value={editBitFields.type} onChange={e => setEditBitFields(f => ({ ...f, type: e.target.value }))}
                  style={{ background: "#13132a", border: "1px solid #2a2a4a", borderRadius: 6, color: "#f7f7f7", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}>
                  {BIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Speaker + Duration row */}
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "#8888aa", display: "block", marginBottom: 4 }}>Speakers (comma separated)</label>
                <input value={editBitFields.speaker} onChange={e => setEditBitFields(f => ({ ...f, speaker: e.target.value }))}
                  placeholder="e.g. Brett, Spencer"
                  style={{ width: "100%", background: "#13132a", border: "1px solid #2a2a4a", borderRadius: 6, color: "#f7f7f7", padding: "8px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div style={{ width: 80 }}>
                <label style={{ fontSize: 11, color: "#8888aa", display: "block", marginBottom: 4 }}>Duration (min)</label>
                <input type="number" min="0" value={editBitFields.duration} onChange={e => setEditBitFields(f => ({ ...f, duration: e.target.value }))}
                  style={{ width: "100%", background: "#13132a", border: "1px solid #2a2a4a", borderRadius: 6, color: "#f7f7f7", padding: "8px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Script content */}
            <div>
              <label style={{ fontSize: 11, color: "#8888aa", display: "block", marginBottom: 4 }}>Script / notes</label>
              <textarea value={editBitFields.content} onChange={e => setEditBitFields(f => ({ ...f, content: e.target.value }))}
                rows={16}
                style={{ width: "100%", background: "#13132a", border: "1px solid #2a2a4a", borderRadius: 6, color: "#d0d0e8", padding: "10px 12px", fontSize: 13, lineHeight: 1.7, fontFamily: "sans-serif", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            {/* Save / Cancel */}
            <div style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
              <button onClick={saveBit} disabled={savingBit} style={{
                flex: 1, padding: "10px", background: "#4ecdc4", border: "none", borderRadius: 6,
                color: "#0d1a19", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}>{savingBit ? "Saving…" : "Save"}</button>
              <button onClick={() => setEditingBit(null)} style={{
                padding: "10px 18px", background: "none", border: "1px solid #2a2a4a", borderRadius: 6,
                color: "#8888aa", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  })() : null;

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ color: "#8888aa", fontSize: 13 }}>Oh Yeah… 🎹</div>
    </div>
  );
  if (!show) return (
    <div style={{ minHeight: "100dvh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ color: "#8888aa", fontSize: 13 }}>Charts not found.</div>
    </div>
  );

  // Single-song view: just the card, no chrome
  if (songId) {
    const singleSong = songs[String(songId)] || songs[songId];
    if (singleSong) return (
      <div style={{ minHeight: "100dvh", background: "#1a1a2e", color: "#f7f7f7", fontFamily: "sans-serif", padding: "24px 16px" }}>
        <SongCard song={singleSong} index={0} showChords={true} editUrl={`${APP_URL}?editSong=${singleSong.id}`} />
      </div>
    );
  }

  const entriesForView = songId
    ? allEntries.filter(e => e.type === "song" && String(e.song.id) === String(songId))
    : allEntries;

  return (
    <div style={{ minHeight: "100dvh", background: "#1a1a2e", color: "#f7f7f7", fontFamily: "sans-serif" }}>
      {BitEditorModal}
      {/* Header */}
      <header style={{ background: "#13132a", borderBottom: "1px solid #2a2a4a", padding: "20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#ff6b6b", fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Sick Day with Ferris
        </div>
        <h1 style={{ margin: "6px 0 4px", fontSize: 26, fontWeight: "bold", color: "#f7f7f7" }}>{show.name}</h1>
        <div style={{ fontSize: 13, color: "#8888aa" }}>
          {[show.date, show.venue, `${songEntries.length} songs`].filter(Boolean).join(" · ")}
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }} className="no-print">
          <button onClick={() => window.print()} style={{
            padding: "8px 18px", background: "#ff6b6b", border: "none", color: "#fff",
            borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit",
          }}>Print all charts</button>
          <button onClick={() => setShowChords(c => !c)} style={{
            padding: "8px 14px", background: showChords ? "#132626" : "transparent",
            border: `1px solid ${showChords ? "#2a6e6b" : "#2a2a4a"}`, color: showChords ? "#4ecdc4" : "#8888aa",
            borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          }}>Chords: {showChords ? "on" : "off"}</button>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "16px 16px 40px" }}>
        {/* Table of contents — links use index-based IDs matching song divs below */}
        <nav style={{ background: "#1e1e34", border: "1px solid #2a2a4a", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }} className="no-print">
          <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8888aa", marginBottom: 8 }}>Set list</div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", columns: "2 280px" }}>
            {(() => {
              let sIdx = 0;
              return entriesForView.map((e, i) => {
                if (e.type === "cameron") {
                  const b = e.bit;
                  return (
                    <li key={`bit-${b.id}`} style={{ breakInside: "avoid", display: "flex", gap: 8, padding: "3px 0", fontSize: 13 }}>
                      <span style={{ color: "#4ecdc4", minWidth: 22, textAlign: "right" }}>▸</span>
                      <a href={`#chart-${i}`} style={{ color: "#4ecdc4", textDecoration: "none", flex: 1, fontStyle: "italic" }}>{b.title}</a>
                      <span style={{ color: "#8888aa", fontSize: 11, whiteSpace: "nowrap" }}>{b.type}</span>
                    </li>
                  );
                }
                const s = e.song;
                const n = sIdx++;
                return (
                  <li key={s.id ?? i} style={{ breakInside: "avoid", display: "flex", gap: 8, padding: "3px 0", fontSize: 14 }}>
                    <span style={{ color: "#9b8ec4", fontVariantNumeric: "tabular-nums", minWidth: 22, textAlign: "right" }}>{n + 1}</span>
                    <a href={`#chart-song-${n}`} style={{ color: "#f7f7f7", textDecoration: "none", flex: 1 }}>{s.title}</a>
                    <span style={{ color: "#8888aa", fontSize: 12, whiteSpace: "nowrap" }}>{s.key} · {s.bpm}</span>
                  </li>
                );
              });
            })()}
          </ol>
        </nav>

        {(() => {
          let sIdx = 0;
          return entriesForView.map((e, i) => {
            if (e.type === "cameron") {
              const b = e.bit;
              const dotColor = { "Narration": "#4ecdc4", "Emcee": "#ff6b6b", "LX / cue": "#f4c542", "Wardrobe": "#9b8ec4", "Transition": "#8888aa" }[b.type] || "#4ecdc4";
              return (
                <div key={`bit-${b.id}`} id={`chart-${i}`} style={{
                  background: "#1e1e34", border: `1px solid ${dotColor}33`,
                  borderLeft: `3px solid ${dotColor}`,
                  borderRadius: 8, marginBottom: 20, padding: "14px 18px",
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: b.content ? 10 : 0 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, color: dotColor, fontStyle: "italic", fontWeight: 600 }}>{b.title}</div>
                      <div style={{ fontSize: 12, color: "#8888aa", marginTop: 2 }}>
                        {b.type}{b.speaker && b.speaker !== "—" ? ` · ${b.speaker}` : ""}
                        {b.duration ? ` · ${b.duration} min` : ""}
                      </div>
                    </div>
                    <span style={{ fontSize: 9, padding: "1px 8px", borderRadius: 99, border: `1px solid ${dotColor}`, color: dotColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>bit</span>
                    <button
                      className="no-print"
                      onClick={() => openBitEditor(b)}
                      style={{ fontSize: 11, color: "#8888aa", border: "1px solid #2a2a4a", borderRadius: 4, padding: "2px 8px", background: "none", cursor: "pointer", fontFamily: "inherit" }}
                    >✎ Edit bit</button>
                  </div>
                  {b.content && (
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 13, lineHeight: 1.7, color: "#d0d0e8", fontFamily: "sans-serif" }}>{b.content}</pre>
                  )}
                </div>
              );
            }
            const song = e.song;
            const n = sIdx++;
            return (
              <div key={song.id ?? i} id={`chart-song-${n}`} data-song-idx={n}>
                <SongCard song={song} index={n} showChords={showChords} editUrl={`${APP_URL}?editSong=${song.id}`} />
              </div>
            );
          });
        })()}
      </main>

      {/* Floating song navigation */}
      {songEntries.length > 1 && (
        <div className="no-print" style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          display: "flex", background: "rgba(19,19,42,0.93)", backdropFilter: "blur(10px)",
          border: "1px solid #2a2a4a", borderRadius: 99, overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)", zIndex: 100,
        }}>
          {[
            { label: "← Prev", disabled: currentSongIdx === 0, onClick: () => scrollToSong(currentSongIdx - 1) },
            { label: "↑ Top",  disabled: false,             onClick: () => {
              document.getElementById("root")?.scrollTo({ top: 0, behavior: "smooth" });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }},
            { label: "Next →", disabled: currentSongIdx === songEntries.length - 1, onClick: () => scrollToSong(currentSongIdx + 1) },
          ].map(({ label, disabled, onClick }) => (
            <button key={label} onClick={onClick} disabled={disabled} style={{
              padding: "10px 18px", border: "none", background: "transparent",
              color: disabled ? "#444466" : "#d0d0e8",
              cursor: disabled ? "default" : "pointer",
              fontSize: 13, fontFamily: "inherit", fontWeight: 600,
              borderRight: label !== "Next →" ? "1px solid #2a2a4a" : "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = "#f7f7f7"; }}
            onMouseLeave={e => { if (!disabled) e.currentTarget.style.color = "#d0d0e8"; }}
            >{label}</button>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body, html, #root { background: #fff !important; }
          header { background: #f5f5f5 !important; border-bottom: 1px solid #ccc !important; }
          header h1 { color: #111 !important; }
          header div { color: #444 !important; }
          main { padding-top: 0 !important; }
          nav { display: none !important; }
          article {
            background: #fff !important;
            border: 1px solid #ddd !important;
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 32px !important;
          }
          article > div:first-child { border-bottom: 1px solid #ddd !important; background: #fff !important; }
          article div[style*="2a220e"] { background: #fff8e6 !important; border-bottom: 1px solid #e0c060 !important; }
          article div[style*="f7f7f7"] { color: #111 !important; }
          article div[style*="8888aa"] { color: #555 !important; }
          article span[style*="9b8ec4"] { color: #666 !important; }
          article span[style*="ff6b6b"] { color: #c00 !important; }
          article b[style*="4ecdc4"] { color: #006b6b !important; background: #e6f7f7 !important; }
          article span[style*="4ecdc4"] { color: #006b6b !important; }
        }
      `}</style>
    </div>
  );
}
