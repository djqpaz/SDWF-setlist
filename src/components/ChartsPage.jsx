import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, collection } from "firebase/firestore";
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
                  if (window.confirm("Chart editor — band use only.\n\nAre you Kenny or Dave?\n\nIf not, please hit Cancel.")) {
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
  const [loading, setLoading] = useState(true);
  const [showChords, setShowChords] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

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
    return () => { unsub(); document.title = "Sick Day with Ferris — Set List Builder"; };
  }, [showId]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "songs"), snap => {
      const map = {};
      snap.forEach(d => { map[d.id] = d.data(); map[String(d.data().id)] = d.data(); });
      setSongs(map);
    });
    return unsub;
  }, []);

  const songListLen = show
    ? (show.songIds || []).map(id => songs[String(id)] || songs[id]).filter(Boolean).length
    : 0;

  useEffect(() => {
    if (songListLen <= 1) return;
    const visible = new Set();
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const idx = parseInt(e.target.id.replace("chart-", ""), 10);
        if (e.isIntersecting) visible.add(idx);
        else visible.delete(idx);
      });
      if (visible.size > 0) setCurrentIdx(Math.min(...visible));
    }, { threshold: 0.05 });
    for (let i = 0; i < songListLen; i++) {
      const el = document.getElementById(`chart-${i}`);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [songListLen]);

  function scrollToSong(idx) {
    const el = document.getElementById(`chart-${idx}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ color: "#8888aa", fontSize: 13 }}>Loading…</div>
    </div>
  );
  if (!show) return (
    <div style={{ minHeight: "100dvh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ color: "#8888aa", fontSize: 13 }}>Charts not found.</div>
    </div>
  );

  const allSongs = (show.songIds || []).map(id => songs[String(id)] || songs[id]).filter(Boolean);
  const songList = songId
    ? allSongs.filter(s => String(s.id) === String(songId))
    : allSongs;

  // Single-song view: just the card, no chrome
  if (songId && songList.length === 1) {
    return (
      <div style={{ minHeight: "100dvh", background: "#1a1a2e", color: "#f7f7f7", fontFamily: "sans-serif", padding: "24px 16px" }}>
        <SongCard song={songList[0]} index={0} showChords={true} editUrl={`${APP_URL}?editSong=${songList[0].id}`} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#1a1a2e", color: "#f7f7f7", fontFamily: "sans-serif" }}>
      {/* Header */}
      <header style={{ background: "#13132a", borderBottom: "1px solid #2a2a4a", padding: "20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#ff6b6b", fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Sick Day with Ferris
        </div>
        <h1 style={{ margin: "6px 0 4px", fontSize: 26, fontWeight: "bold", color: "#f7f7f7" }}>{show.name}</h1>
        <div style={{ fontSize: 13, color: "#8888aa" }}>
          {[show.date, show.venue, `${songList.length} songs`].filter(Boolean).join(" · ")}
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
            {songList.map((s, i) => (
              <li key={s.id ?? i} style={{ breakInside: "avoid", display: "flex", gap: 8, padding: "3px 0", fontSize: 14 }}>
                <span style={{ color: "#9b8ec4", fontVariantNumeric: "tabular-nums", minWidth: 22, textAlign: "right" }}>{i + 1}</span>
                <a href={`#chart-${i}`} style={{ color: "#f7f7f7", textDecoration: "none", flex: 1 }}>{s.title}</a>
                <span style={{ color: "#8888aa", fontSize: 12, whiteSpace: "nowrap" }}>{s.key} · {s.bpm}</span>
              </li>
            ))}
          </ol>
        </nav>

        {songList.map((song, i) => (
          <div key={song.id ?? i} id={`chart-${i}`}>
            <SongCard song={song} index={i} showChords={showChords} editUrl={`${APP_URL}?editSong=${song.id}`} />
          </div>
        ))}
      </main>

      {/* Floating song navigation */}
      {songList.length > 1 && (
        <div className="no-print" style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          display: "flex", background: "rgba(19,19,42,0.93)", backdropFilter: "blur(10px)",
          border: "1px solid #2a2a4a", borderRadius: 99, overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)", zIndex: 100,
        }}>
          {[
            { label: "← Prev", disabled: currentIdx === 0, onClick: () => scrollToSong(currentIdx - 1) },
            { label: "↑ Top",  disabled: false,             onClick: () => {
              document.getElementById("root")?.scrollTo({ top: 0, behavior: "smooth" });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }},
            { label: "Next →", disabled: currentIdx === songList.length - 1, onClick: () => scrollToSong(currentIdx + 1) },
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
