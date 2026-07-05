import { useSongs } from "../context/SongsContext";
import { colors } from "../theme";

export default function PrintModal({ show, onClose, onToast }) {
  const { songs } = useSongs();
  const songMap = Object.fromEntries(songs.map(s => [s.id, s]));
  if (!show) return null;

  const { name, date, venue, songIds, suggestedBy } = show;

  function handlePrint() {
    window.print();
  }

  function handleCopy() {
    const lines = [
      `SICK DAY WITH FERRIS`,
      name,
      date && `Date: ${date}`,
      venue && `Venue: ${venue}`,
      suggestedBy && `Suggested by: ${suggestedBy}`,
      ``,
      ...songIds.map((id, i) => {
        const s = songMap[id];
        return s ? `${String(i+1).padStart(2,"0")}. ${s.title} — ${s.artist}` : "";
      }).filter(Boolean),
      ``,
      `${songIds.length} songs`,
    ].filter(l => l !== undefined).join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      onToast?.("Copied to clipboard ✓");
      onClose();
    });
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,0.85)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.bgPage, border:`1px solid ${colors.borderMed}`,
          borderRadius:6, width:"min(600px, 95vw)", maxHeight:"85vh",
          display:"flex", flexDirection:"column", overflow:"hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding:"16px 20px", borderBottom:`1px solid ${colors.borderMed}`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
        }}>
          <div>
            <div style={{ fontSize:11, color:colors.textMuted, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:4 }}>
              Export Set List
            </div>
            <div style={{ fontSize:16, color:colors.textPrimary }}>{name}</div>
            {(date || venue) && (
              <div style={{ fontSize:11, color:colors.textDim, marginTop:2 }}>
                {[date, venue].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background:"none", border:"none", color:colors.textMuted, cursor:"pointer",
            fontSize:20, lineHeight:1,
          }}>×</button>
        </div>

        {/* Song list */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 20px" }}>
          {songIds.map((id, i) => {
            const s = songMap[id];
            if (!s) return null;
            return (
              <div key={id} style={{
                display:"flex", gap:14, padding:"7px 0",
                borderBottom:`1px solid ${colors.borderLight}`,
              }}>
                <div style={{ color:colors.purple, fontSize:12, minWidth:24, textAlign:"right", fontVariantNumeric:"tabular-nums" }}>
                  {String(i+1).padStart(2,"0")}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:colors.textPrimary }}>{s.title}</div>
                  <div style={{ fontSize:10, color:colors.textSecondary, marginTop:1 }}>{s.artist}</div>
                </div>
                <div style={{ fontSize:10, color:colors.textDim, alignSelf:"center" }}>{s.bpm} BPM</div>
              </div>
            );
          })}
          <div style={{ fontSize:11, color:colors.textMuted, paddingTop:12 }}>
            {songIds.length} songs
            {suggestedBy && ` · Suggested by ${suggestedBy}`}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding:"12px 20px", borderTop:`1px solid ${colors.borderMed}`,
          display:"flex", gap:8, justifyContent:"flex-end",
        }}>
          <button onClick={handleCopy} style={{
            padding:"8px 16px", background:"transparent",
            border:`1px solid ${colors.borderMed}`, color:colors.textSecondary,
            borderRadius:4, cursor:"pointer", fontSize:12, fontFamily:"inherit",
          }}>
            Copy Text
          </button>
          <button onClick={handlePrint} style={{
            padding:"8px 16px", background:colors.coral,
            border:"none", color: colors.onAccent,
            borderRadius:4, cursor:"pointer", fontSize:12,
            fontFamily:"inherit", fontWeight:"bold",
          }}>
            Print
          </button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-modal, .print-modal * { visibility: visible !important; }
          .print-modal {
            position: fixed !important;
            inset: 0 !important;
            background: white !important;
            color: black !important;
            padding: 32px !important;
          }
        }
      `}</style>
    </div>
  );
}
