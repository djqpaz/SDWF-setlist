import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db } from "../firebase";

const CH = /^[A-G][#b]?(maj|min|m|dim|aug|sus|add|M)?\d*(sus\d|add\d|[#b]\d+)*(\/[A-G][#b]?)?$/;

function parseLine(l) {
  const segs = []; let re = /\[([^\]]*)\]/g, last = 0, m, cur = { c: "", t: "" };
  while ((m = re.exec(l))) { cur.t += l.slice(last, m.index); if (cur.t || cur.c) segs.push(cur); cur = { c: m[1], t: "" }; last = re.lastIndex; }
  cur.t += l.slice(last); segs.push(cur); return segs;
}

function renderChart(chart, note) {
  const lines = chart.split("\n").slice(1);
  if (note && lines[0] === note) lines.shift();
  return lines.map((raw, idx) => {
    const l = raw.replace(/\s+$/, "");
    if (!l.trim()) return <div key={idx} style={{ height: "0.6em" }} />;
    const sm = l.match(/^\[([^\]]+)\]\s*(?:\((.*)\))?\s*$/);
    if (sm && !CH.test(sm[1])) {
      return (
        <div key={idx} style={{
          display: "flex", gap: 12, alignItems: "baseline",
          margin: "18px 0 6px", flexWrap: "wrap",
        }}>
          <span style={{
            background: "#1a3a38", color: "#4ecdc4",
            borderLeft: "4px solid #4ecdc4", padding: "2px 14px",
            fontSize: 18, letterSpacing: "0.1em", fontWeight: "bold",
          }}>{sm[1]}</span>
          {sm[2] && <span style={{ color: "#8888aa", fontSize: 16 }}>{sm[2]}</span>}
        </div>
      );
    }
    const segs = parseLine(l);
    const chordOnly = segs.every(s => !s.t.trim());
    return (
      <div key={idx} style={{
        display: "flex", flexWrap: "wrap", alignItems: "flex-end",
        minHeight: "2em", opacity: chordOnly ? 0.75 : 1,
      }}>
        {segs.map((s, i) => (
          <span key={i} style={{ display: "inline-flex", flexDirection: "column" }}>
            <span style={{ color: "#ff6b6b", fontWeight: "bold", height: "1.5em", whiteSpace: "pre", paddingRight: "0.5em", fontSize: 22 }}>{s.c || " "}</span>
            <span style={{ whiteSpace: "pre", fontSize: 26 }}>{s.t || (s.c ? " " : "")}</span>
          </span>
        ))}
      </div>
    );
  });
}

export default function PrompterPage({ showId }) {
  const [show, setShow] = useState(null);
  const [songs, setSongs] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  // Override global overflow:hidden
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.getElementById("root").style.overflow = "hidden";
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "shows", showId), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setShow(data);
        document.title = `Prompter — ${data.name} | SDWF`;
      }
      setLoading(false);
    });
    return () => { unsub(); document.title = "Sick Day with Ferris"; };
  }, [showId]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "songs"), snap => {
      const map = {};
      snap.forEach(d => { map[d.id] = d.data(); map[String(d.data().id)] = d.data(); });
      setSongs(map);
    });
    return unsub;
  }, []);

  const songList = (show?.songIds || []).map(id => songs[String(id)] || songs[id]).filter(Boolean);
  const totalSongs = songList.length;

  const goNext = useCallback(() => setCurrentIdx(i => Math.min(i + 1, totalSongs - 1)), [totalSongs]);
  const goPrev = useCallback(() => setCurrentIdx(i => Math.max(i - 1, 0)), []);

  // Keyboard nav: ← prev, → next, space next
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault(); goNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault(); goPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // Keep currentIdx in bounds when setlist changes
  useEffect(() => {
    if (totalSongs > 0 && currentIdx >= totalSongs) setCurrentIdx(totalSongs - 1);
  }, [totalSongs]);

  if (loading) return (
    <div style={{
      height: "100dvh", background: "#0d0d1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#4ecdc4", fontFamily: "monospace", fontSize: 16,
    }}>
      Loading…
    </div>
  );

  if (!show || totalSongs === 0) return (
    <div style={{
      height: "100dvh", background: "#0d0d1a",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#666688", fontFamily: "monospace", fontSize: 16,
    }}>
      {!show ? "Show not found." : "No songs in this set."}
    </div>
  );

  const song = songList[currentIdx];
  const nextSong = songList[currentIdx + 1];

  return (
    <div style={{
      display: "flex", height: "100dvh",
      background: "#0d0d1a", color: "#f0f0f0",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      overflow: "hidden",
      userSelect: "none",
    }}>
      {/* Left: song list nav */}
      <div style={{
        width: 220, minWidth: 220, flexShrink: 0,
        background: "#11112a", borderRight: "1px solid #1e1e3a",
        overflowY: "auto", display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "12px 14px 8px",
          fontSize: 10, color: "#ff6b6b", letterSpacing: "0.2em",
          textTransform: "uppercase", fontWeight: "bold",
          borderBottom: "1px solid #1e1e3a",
        }}>
          {show.name}
        </div>
        {songList.map((s, i) => (
          <button key={s.id ?? i} onClick={() => setCurrentIdx(i)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
            background: i === currentIdx ? "#1e1e3a" : "transparent",
            border: "none", borderLeft: i === currentIdx ? "3px solid #4ecdc4" : "3px solid transparent",
            color: i === currentIdx ? "#f0f0f0" : "#888899",
            cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "inherit",
            fontSize: 13, lineHeight: 1.3,
          }}>
            <span style={{
              fontSize: 11, color: i === currentIdx ? "#4ecdc4" : "#444460",
              minWidth: 22, textAlign: "right", fontVariantNumeric: "tabular-nums",
            }}>{i + 1}</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.title}
            </span>
          </button>
        ))}
      </div>

      {/* Right: current song chart */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Song header */}
        <div style={{
          padding: "14px 24px 12px",
          background: "#11112a", borderBottom: "1px solid #1e1e3a",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#4ecdc4", fontVariantNumeric: "tabular-nums" }}>
              {currentIdx + 1} / {totalSongs}
            </span>
            <span style={{ fontSize: 32, fontWeight: "bold", color: "#f0f0f0", fontFamily: "Georgia, serif", lineHeight: 1.1 }}>
              {song.title}
            </span>
            <span style={{ fontSize: 14, color: "#888899" }}>{song.artist}</span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            {song.key && (
              <span style={{
                fontSize: 13, fontWeight: "bold", padding: "3px 10px",
                borderRadius: 99, background: "#132626", border: "1px solid #2a6e6b", color: "#4ecdc4",
              }}>Key {song.key}</span>
            )}
            {song.bpm && (
              <span style={{
                fontSize: 13, padding: "3px 10px",
                borderRadius: 99, background: "#1e1e2e", border: "1px solid #2a2a4a", color: "#aaaacc",
              }}>{song.bpm} BPM</span>
            )}
            {song.capo > 0 && (
              <span style={{
                fontSize: 13, padding: "3px 10px",
                borderRadius: 99, background: "#1e1e2e", border: "1px solid #2a2a4a", color: "#aaaacc",
              }}>Capo {song.capo}</span>
            )}
            {song.note && (
              <span style={{ fontSize: 14, color: "#f4c542", marginLeft: 4 }}>{song.note}</span>
            )}
          </div>
        </div>

        {/* Chart area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px 80px" }}>
          {song.chart
            ? renderChart(song.chart, song.note)
            : (
              <div style={{ color: "#444460", fontStyle: "italic", marginTop: 24, fontSize: 18 }}>
                No chart for this song yet.
              </div>
            )
          }
        </div>

        {/* Bottom nav bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px", background: "#0d0d1a", borderTop: "1px solid #1e1e3a",
          flexShrink: 0, gap: 12,
        }}>
          <button onClick={goPrev} disabled={currentIdx === 0} style={{
            padding: "12px 24px", fontSize: 18, background: "#1a1a2e",
            border: "1px solid #2a2a4a", color: currentIdx === 0 ? "#333348" : "#f0f0f0",
            borderRadius: 6, cursor: currentIdx === 0 ? "default" : "pointer",
            fontFamily: "inherit",
          }}>← Prev</button>

          {nextSong ? (
            <div style={{ flex: 1, textAlign: "center", color: "#555570", fontSize: 12 }}>
              Up next: <span style={{ color: "#aaaacc" }}>{nextSong.title}</span>
              {nextSong.key && <span style={{ color: "#4ecdc4", marginLeft: 8 }}>Key {nextSong.key}</span>}
            </div>
          ) : (
            <div style={{ flex: 1, textAlign: "center", color: "#4ecdc4", fontSize: 12, letterSpacing: "0.15em" }}>
              END OF SET
            </div>
          )}

          <button onClick={goNext} disabled={currentIdx >= totalSongs - 1} style={{
            padding: "12px 24px", fontSize: 18, background: "#1a1a2e",
            border: "1px solid #2a2a4a", color: currentIdx >= totalSongs - 1 ? "#333348" : "#f0f0f0",
            borderRadius: 6, cursor: currentIdx >= totalSongs - 1 ? "default" : "pointer",
            fontFamily: "inherit",
          }}>Next →</button>
        </div>
      </div>
    </div>
  );
}
