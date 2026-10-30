import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const CH = /^[A-G][#b]?(maj|min|m|dim|aug|sus|add|M)?\d*(sus\d|add\d|[#b]\d+)*(\/[A-G][#b]?)?$/;

function parseLine(l) {
  const segs = []; let re = /\[([^\]]*)\]/g, last = 0, m, cur = { c: "", t: "" };
  while ((m = re.exec(l))) { cur.t += l.slice(last, m.index); if (cur.t || cur.c) segs.push(cur); cur = { c: m[1], t: "" }; last = re.lastIndex; }
  cur.t += l.slice(last); segs.push(cur); return segs;
}

function parseSections(chart, note) {
  if (!chart) return [];
  const rawLines = chart.split("\n").slice(1);
  const lines = (note && rawLines[0] === note) ? rawLines.slice(1) : rawLines;
  const sections = [];
  let cur = { label: null, subtitle: null, lines: [] };
  for (const raw of lines) {
    const l = raw.replace(/\s+$/, "");
    const sm = l.match(/^\[([^\]]+)\]\s*(?:\((.*)\))?\s*$/);
    if (sm && !CH.test(sm[1])) {
      if (cur.label !== null || cur.lines.some(ln => ln.trim())) sections.push(cur);
      cur = { label: sm[1], subtitle: sm[2] || null, lines: [] };
    } else {
      cur.lines.push(raw);
    }
  }
  if (cur.label !== null || cur.lines.some(ln => ln.trim())) sections.push(cur);
  // If no section markers, treat whole chart as one unlabeled section
  return sections.length ? sections : [{ label: null, subtitle: null, lines }];
}

function SectionContent({ lines }) {
  // Trim leading/trailing blank lines
  const first = lines.findIndex(l => l.trim());
  const last  = lines.length - 1 - [...lines].reverse().findIndex(l => l.trim());
  const trimmed = first < 0 ? [] : lines.slice(first, last + 1);

  return trimmed.map((raw, idx) => {
    const l = raw.replace(/\s+$/, "");
    if (!l.trim()) return <div key={idx} style={{ height: "0.5em" }} />;
    const segs = parseLine(l);
    const chordOnly = segs.every(s => !s.t.trim());
    return (
      <div key={idx} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 2, opacity: chordOnly ? 0.65 : 1 }}>
        {segs.map((s, i) => (
          <span key={i} style={{ display: "inline-flex", flexDirection: "column" }}>
            <span style={{ color: "#ff6b6b", fontWeight: "bold", height: "1.4em", whiteSpace: "pre-wrap", paddingRight: "0.5em", fontSize: "clamp(15px,2.8vw,20px)" }}>
              {s.c || " "}
            </span>
            <span style={{ whiteSpace: "pre-wrap", fontSize: "clamp(22px,4vw,30px)", lineHeight: 1.35 }}>
              {s.t || (s.c ? " " : "")}
            </span>
          </span>
        ))}
      </div>
    );
  });
}

function useIsWide() {
  const [isWide, setIsWide] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const update = () => setIsWide(window.innerWidth >= 768);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("orientationchange", update); };
  }, []);
  return isWide;
}

export default function PrompterPage({ showId }) {
  const [show, setShow]           = useState(null);
  const [songs, setSongs]         = useState({});
  const [songIdx, setSongIdx]     = useState(0);
  const [secIdx, setSecIdx]       = useState(0);
  const [loading, setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isWide = useIsWide();
  const touchStartX = useRef(null);
  const contentRef  = useRef(null);

  // Auto-open sidebar on wide screens, close overlay on narrow
  useEffect(() => {
    setSidebarOpen(isWide);
  }, [isWide]);

  useEffect(() => {
    const root = document.getElementById("root");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (root) root.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "shows", showId), snap => {
      if (snap.exists()) { setShow({ id: snap.id, ...snap.data() }); document.title = `Prompter — ${snap.data().name} | SDWF`; }
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

  const songList = useMemo(
    () => (show?.songIds || []).map(id => songs[String(id)] || songs[id]).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [show?.songIds?.join(","), songs]
  );

  const song     = songList[songIdx];
  const sections = useMemo(() => parseSections(song?.chart, song?.note), [song?.chart, song?.note]);

  // Reset to section 0 when song changes
  useEffect(() => { setSecIdx(0); }, [songIdx]);
  // Clamp secIdx if sections shrink
  useEffect(() => { if (sections.length && secIdx >= sections.length) setSecIdx(sections.length - 1); }, [sections.length]);
  // Scroll content to top when section changes
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [songIdx, secIdx]);

  const isFirst = songIdx === 0 && secIdx === 0;
  const isLast  = songIdx === songList.length - 1 && secIdx >= Math.max(0, sections.length - 1);

  const goNext = useCallback(() => {
    if (secIdx < sections.length - 1) { setSecIdx(s => s + 1); }
    else if (songIdx < songList.length - 1) { setSongIdx(s => s + 1); setSecIdx(0); }
  }, [secIdx, sections.length, songIdx, songList.length]);

  const goPrev = useCallback(() => {
    if (secIdx > 0) { setSecIdx(s => s - 1); }
    else if (songIdx > 0) { setSongIdx(s => s - 1); setSecIdx(0); }
  }, [secIdx, songIdx]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")                    { e.preventDefault(); goPrev(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  if (loading) return (
    <div style={{ height:"100dvh", background:"#0d0d1a", display:"flex", alignItems:"center", justifyContent:"center", color:"#4ecdc4", fontFamily:"monospace", fontSize:16 }}>Oh Yeah… 🎹</div>
  );
  if (!show || songList.length === 0) return (
    <div style={{ height:"100dvh", background:"#0d0d1a", display:"flex", alignItems:"center", justifyContent:"center", color:"#666688", fontFamily:"monospace", fontSize:16 }}>
      {!show ? "Show not found." : "No songs in this set."}
    </div>
  );

  const curSection  = sections[secIdx];
  const nextSection = sections[secIdx + 1];
  const nextSong    = songList[songIdx + 1];
  const upNext = nextSection
    ? { label: nextSection.label, isSong: false }
    : nextSong ? { label: nextSong.title, key: nextSong.key, isSong: true }
    : null;

  return (
    <div style={{
      display:"flex", flexDirection:"column", height:"100dvh",
      background:"#0d0d1a", color:"#f0f0f0", overflow:"hidden",
      fontFamily:"ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      userSelect:"none", position:"relative",
    }}>

      {/* ── Header ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
        background:"#0a0a18", borderBottom:"1px solid #1e1e3a", flexShrink:0,
      }}>
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            background: sidebarOpen ? "#1a2a2a" : "none",
            border: `1px solid ${sidebarOpen ? "#2a6e6b" : "#252545"}`,
            color: sidebarOpen ? "#4ecdc4" : "#555570",
            borderRadius:6, padding:"5px 9px", cursor:"pointer",
            fontSize:14, flexShrink:0, lineHeight:1, fontFamily:"inherit",
          }}
          title={sidebarOpen ? "Hide set list" : "Show set list"}
        >☰</button>
        <span style={{ fontSize:11, color:"#4ecdc4", fontWeight:"bold", fontVariantNumeric:"tabular-nums", flexShrink:0 }}>
          {songIdx + 1}&nbsp;/&nbsp;{songList.length}
        </span>
        <span style={{ fontSize:20, fontWeight:"bold", color:"#f0f0f0", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {song.title}
        </span>
        {song.key && (
          <span style={{ fontSize:13, fontWeight:"bold", padding:"2px 10px", borderRadius:99, background:"#132626", border:"1px solid #2a6e6b", color:"#4ecdc4", flexShrink:0 }}>
            {song.key}
          </span>
        )}
        {song.bpm && (
          <span style={{ fontSize:12, color:"#555570", flexShrink:0 }}>{song.bpm} BPM</span>
        )}
      </div>

      {/* ── Body: sidebar + main content ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

        {/* Sidebar — persistent column on wide, overlay on narrow */}
        {sidebarOpen && (
          <div style={{
            display:"flex", flexDirection:"column",
            width: isWide ? 220 : "min(280px, 80vw)",
            flexShrink: 0,
            background:"#080814",
            borderRight:"1px solid #1e1e3a",
            ...(isWide ? {} : {
              position:"absolute", top:0, left:0, bottom:0, zIndex:50,
              boxShadow:"4px 0 24px rgba(0,0,0,0.6)",
            }),
          }}>
            {/* Sidebar header — only show ✕ on narrow (overlay mode) */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"10px 14px", borderBottom:"1px solid #1e1e3a",
              background:"#0a0a18", flexShrink:0,
            }}>
              <span style={{ fontSize:11, color:"#4ecdc4", fontWeight:"bold", letterSpacing:"0.12em" }}>SET LIST</span>
              {!isWide && (
                <button onClick={() => setSidebarOpen(false)} style={{
                  background:"none", border:"none", color:"#555570",
                  fontSize:18, cursor:"pointer", lineHeight:1, padding:"0 2px",
                }}>✕</button>
              )}
            </div>
            {/* Song rows */}
            <div style={{ overflowY:"auto", flex:1, padding:"6px 0" }}>
              {songList.map((s, i) => (
                <div
                  key={i}
                  onClick={() => { setSongIdx(i); setSecIdx(0); if (!isWide) setSidebarOpen(false); }}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding: isWide ? "8px 12px" : "10px 14px",
                    cursor:"pointer",
                    background: i === songIdx ? "#0f2020" : "transparent",
                    borderLeft: i === songIdx ? "3px solid #4ecdc4" : "3px solid transparent",
                  }}
                >
                  <span style={{ fontSize:11, color: i === songIdx ? "#4ecdc4" : "#444468", fontVariantNumeric:"tabular-nums", minWidth:18, textAlign:"right", flexShrink:0 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: isWide ? 13 : 15, color: i === songIdx ? "#f0f0f0" : "#8080a0", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {s.title}
                  </span>
                  {s.key && (
                    <span style={{ fontSize:10, color:"#2a6e6b", flexShrink:0 }}>{s.key}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tap-away backdrop — only in overlay/narrow mode */}
        {sidebarOpen && !isWide && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position:"absolute", inset:0, zIndex:49, background:"rgba(0,0,0,0.4)" }}
          />
        )}

        {/* ── Main content column ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

          {/* Note bar */}
          {song.note && (
            <div style={{ padding:"6px 18px", background:"#140f00", borderBottom:"1px solid #3a2800", fontSize:13, color:"#f4c542", flexShrink:0, lineHeight:1.4 }}>
              {song.note}
            </div>
          )}

          {/* Section label */}
          {curSection?.label && (
            <div style={{ padding:"7px 18px", background:"#091a1a", borderBottom:"1px solid #0e3030", flexShrink:0, display:"flex", alignItems:"baseline", gap:10 }}>
              <span style={{ background:"#0f2e2e", color:"#4ecdc4", borderLeft:"4px solid #4ecdc4", padding:"3px 16px", fontSize:15, letterSpacing:"0.12em", fontWeight:"bold" }}>
                {curSection.label}
              </span>
              {curSection.subtitle && (
                <span style={{ color:"#556668", fontSize:13 }}>{curSection.subtitle}</span>
              )}
            </div>
          )}

          {/* Chart content */}
          <div
            ref={contentRef}
            style={{ flex:1, overflowY:"auto", padding:"18px 22px 10px", WebkitOverflowScrolling:"touch" }}
            onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (touchStartX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(dx) > 60) { dx < 0 ? goNext() : goPrev(); }
            }}
          >
            {curSection ? (
              <SectionContent lines={curSection.lines} />
            ) : (
              <div style={{ color:"#444460", fontStyle:"italic", fontSize:18, marginTop:24 }}>No chart for this song.</div>
            )}
          </div>

          {/* Up next strip */}
          <div style={{ padding:"5px 18px", background:"#080810", borderTop:"1px solid #111126", flexShrink:0, minHeight:28, display:"flex", alignItems:"center", gap:6 }}>
            {upNext ? (
              <span style={{ fontSize:12, color:"#2a2a50" }}>
                {upNext.isSong ? "↓ Next song: " : "↓ "}<span style={{ color:"#2a3a4a" }}>{upNext.label}</span>
                {upNext.key && <span style={{ color:"#1a4a3a", marginLeft:8 }}>Key {upNext.key}</span>}
              </span>
            ) : songList.length > 0 ? (
              <span style={{ fontSize:11, color:"#1a4a3a", letterSpacing:"0.1em" }}>
                Danke Schoen… and goodnight.
                <span style={{ display:"block", fontSize:10, color:"#112a1a", marginTop:2, fontStyle:"italic" }}>
                  You're still here? It's over. Go home.
                </span>
              </span>
            ) : null}
          </div>

          {/* Bottom nav */}
          <div style={{
            display:"flex", alignItems:"center", padding:"10px 14px", gap:10,
            background:"#080810", borderTop:"1px solid #1a1a30", flexShrink:0,
          }}>
            <button onClick={goPrev} disabled={isFirst} style={{
              padding:"14px 22px", fontSize:17, background:"#111124",
              border:"1px solid #2a2a4a", color: isFirst ? "#252540" : "#c0c0d8",
              borderRadius:6, cursor: isFirst ? "default" : "pointer", fontFamily:"inherit", flexShrink:0,
            }}>← Prev</button>

            <div style={{ flex:1, display:"flex", gap:5, justifyContent:"center", alignItems:"center", flexWrap:"wrap" }}>
              {sections.length > 1 ? sections.map((s, i) => (
                <div key={i} onClick={() => setSecIdx(i)} title={s.label || `Section ${i + 1}`} style={{
                  height:7, width: i === secIdx ? 22 : 7,
                  borderRadius:99, background: i === secIdx ? "#4ecdc4" : "#252545",
                  cursor:"pointer", transition:"all 0.18s", flexShrink:0,
                }} />
              )) : (
                <span style={{ fontSize:11, color:"#333358", letterSpacing:"0.1em" }}>
                  {sections.length === 1 && curSection?.label ? curSection.label : ""}
                </span>
              )}
            </div>

            <button onClick={goNext} disabled={isLast} style={{
              padding:"14px 22px", fontSize:17, background:"#111124",
              border:"1px solid #2a2a4a", color: isLast ? "#252540" : "#c0c0d8",
              borderRadius:6, cursor: isLast ? "default" : "pointer", fontFamily:"inherit", flexShrink:0,
            }}>Next →</button>
          </div>

        </div>{/* end main column */}
      </div>{/* end body row */}
    </div>
  );
}
