import { useState } from "react";
import { createPortal } from "react-dom";
import { colors } from "../theme";

const SECTION_CHIPS = ["VERSE 1", "VERSE 2", "CHORUS", "BRIDGE", "SOLO", "OUTRO"];
const SHARP_NOTES = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];
const FLAT_NOTES  = ["A","Bb","B","C","Db","D","Eb","E","F","Gb","G","Ab"];

function shiftNote(root, n, flats) {
  let i = SHARP_NOTES.indexOf(root);
  if (i < 0) i = FLAT_NOTES.indexOf(root);
  if (i < 0) return root;
  const k = ((i + n) % 12 + 12) % 12;
  return flats ? FLAT_NOTES[k] : SHARP_NOTES[k];
}

function transposeChord(chord, n, flats) {
  return String(chord).split("/").map(part => {
    const m = part.match(/^([A-G][#b]?)(.*)$/);
    return m ? shiftNote(m[1], n, flats) + m[2] : part;
  }).join("/");
}

// [Chord] markers split a line into tokens; each token is the chord plus
// the text that follows it, up to the next chord marker.
function parseLine(raw, shift, flats) {
  const tokens = [];
  const lead = raw.split("[")[0];
  if (lead) tokens.push({ chord: null, text: lead, hasChord: false });
  const re = /\[([^\]]*)\]([^[]*)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const lyric = m[2] || "";
    tokens.push({
      chord: transposeChord(m[1].trim(), shift, flats),
      text: lyric.trim() ? lyric : "   ",
      hasChord: true,
    });
  }
  if (!tokens.length) tokens.push({ chord: null, text: raw, hasChord: false });
  return tokens;
}

// A line that is only [SECTION NAME] becomes a banner; blank lines are ignored.
function parseChart(text, shift) {
  const flats = shift < 0;
  const sections = [];
  let current = null;
  text.split("\n").forEach(raw => {
    const trimmed = raw.trim();
    const m = trimmed.match(/^\[([A-Za-z0-9 #'/-]+)\]$/);
    if (m) { current = { label: m[1], lines: [] }; sections.push(current); return; }
    if (!trimmed) return;
    if (!current) { current = { label: "Section", lines: [] }; sections.push(current); }
    current.lines.push(parseLine(raw, shift, flats));
  });
  return sections;
}

function Chip({ label, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding:"4px 10px", borderRadius:12, fontSize:11, cursor:"pointer",
        fontFamily:"inherit", whiteSpace:"nowrap",
        border: `1px solid ${hover ? colors.coral : colors.borderMed}`,
        background: hover ? colors.bgSelectedWash : "transparent",
        color: hover ? colors.coral : colors.textMuted,
      }}
    >{label}</button>
  );
}

export default function ChartEditor({ song, onSave, onCancel }) {
  const [text, setText] = useState(song.chart || "");
  const [savedText, setSavedText] = useState(song.chart || "");
  const [shift, setShift] = useState(0);
  const [saving, setSaving] = useState(false);

  const dirty = text !== savedText;
  const flats = shift < 0;
  const sections = parseChart(text, shift);
  const lineCount = sections.reduce((a, s) => a + s.lines.length, 0);
  const previewKey = song.key ? transposeChord(song.key, shift, flats) : "—";
  const shiftNoteText = shift === 0 ? "as written" : shift > 0 ? `+${shift} semitones` : `${shift} semitones`;

  function insert(label) {
    setText(t => t.replace(/\s*$/, "") + "\n\n[" + label + "]\n");
  }

  function openChordSearch() {
    const q = encodeURIComponent(`${song.title} ${song.artist || ""}`.trim());
    window.open(`https://www.ultimate-guitar.com/search.php?search_type=title&value=${q}`, "_blank", "noopener,noreferrer");
  }

  async function handleSave() {
    setSaving(true);
    await onSave(text);
    setSaving(false);
    setSavedText(text);
  }

  return createPortal(
    <div style={{
      position:"fixed", inset:0, zIndex:10001, background:"rgba(0,0,0,0.85)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Georgia', serif", padding:24,
    }}>
      <div style={{
        width:"min(1100px, 100%)", maxHeight:"92vh", background:colors.bgPage,
        border:`1px solid ${colors.borderMed}`, borderRadius:6,
        display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{
          padding:"14px 20px", borderBottom:`1px solid ${colors.borderMed}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0,
        }}>
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
            <span style={{ fontSize:11, color:colors.textMuted, letterSpacing:"0.2em", textTransform:"uppercase" }}>
              Song Manager · Chart
            </span>
            <span style={{ fontSize:15, color:colors.textPrimary }}>{song.title}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, color:colors.textFaint }}>{dirty ? "Unsaved changes" : "Saved"}</span>
            <span onClick={onCancel} style={{ fontSize:22, lineHeight:1, color:colors.textMuted, cursor:"pointer" }}>×</span>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          padding:"10px 20px", borderBottom:`1px solid ${colors.borderLight}`,
          display:"flex", gap:8, alignItems:"center", flexWrap:"wrap",
        }}>
          <span style={{ fontSize:10, color:colors.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginRight:2 }}>
            Insert
          </span>
          {SECTION_CHIPS.map(label => (
            <Chip key={label} label={label} onClick={() => insert(label)} />
          ))}

          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:10, color:colors.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>
              Preview key
            </span>
            <button onClick={() => setShift(s => s - 1)} style={{
              width:26, height:24, border:`1px solid ${colors.borderMed}`, background:"transparent",
              color:colors.textMuted, borderRadius:3, cursor:"pointer", fontFamily:"inherit", fontSize:13,
            }}>−</button>
            <span style={{
              fontSize:11, fontWeight:"bold", color:colors.onAccent, background:colors.teal,
              borderRadius:3, padding:"3px 8px", letterSpacing:"0.05em",
            }}>{previewKey}</span>
            <button onClick={() => setShift(s => s + 1)} style={{
              width:26, height:24, border:`1px solid ${colors.borderMed}`, background:"transparent",
              color:colors.textMuted, borderRadius:3, cursor:"pointer", fontFamily:"inherit", fontSize:13,
            }}>+</button>
            <span style={{ fontSize:11, color:colors.textFaint }}>{shiftNoteText}</span>
          </div>
        </div>

        {/* Panes */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", flex:1, minHeight:0, overflow:"hidden" }}>
          {/* Left: source */}
          <div style={{ borderRight:`1px solid ${colors.borderLight}`, display:"flex", flexDirection:"column", minHeight:0 }}>
            <div style={{ padding:"10px 16px 6px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:10, color:colors.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                  Chart source
                </span>
                <button onClick={openChordSearch} style={{
                  padding:"2px 8px", borderRadius:10, fontSize:10, cursor:"pointer",
                  fontFamily:"inherit", whiteSpace:"nowrap",
                  border:`1px solid ${colors.borderTeal}`, background:"transparent", color:colors.teal,
                }}>Search chords online ↗</button>
              </div>
              <span style={{ fontSize:11, color:colors.textFaint }}>{sections.length} sections · {lineCount} lines</span>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              spellCheck={false}
              style={{
                flex:1, margin:"0 16px 16px", background:colors.bgInput, border:`1px solid ${colors.borderMed}`,
                borderRadius:3, padding:12, fontFamily:"ui-monospace, Menlo, Consolas, monospace",
                fontSize:13, lineHeight:1.7, color:colors.textPrimary, resize:"none", boxSizing:"border-box", outline:"none",
              }}
            />
            <div style={{ padding:"0 16px 16px", fontSize:11, color:colors.textMuted, lineHeight:1.6, flexShrink:0 }}>
              Chords in [square brackets] sit above the word after them. A line that is only{" "}
              <span style={{ color:colors.coral }}>[SECTION NAME]</span> becomes a banner. Blank lines are ignored.
              <br />
              "Search chords online" opens Ultimate Guitar in a new tab as a starting point — paste what you find back in here and reformat it.
            </div>
          </div>

          {/* Right: preview */}
          <div style={{ display:"flex", flexDirection:"column", background:colors.bgPanel, minHeight:0 }}>
            <div style={{ padding:"10px 16px 6px", display:"flex", justifyContent:"space-between", alignItems:"baseline", flexShrink:0 }}>
              <span style={{ fontSize:10, color:colors.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>
                Stage preview
              </span>
              <span style={{ fontSize:11, color:colors.textFaint }}>as the prompter will render it</span>
            </div>
            <div style={{
              flex:1, margin:"0 16px 16px", background:colors.bgCard, border:`1px solid ${colors.borderLight}`,
              borderRadius:3, padding:"16px 18px", overflow:"auto",
            }}>
              {sections.map((sec, si) => (
                <div key={si} style={{ marginBottom:18 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:10, color:colors.coral, letterSpacing:"0.2em", textTransform:"uppercase" }}>{sec.label}</span>
                    <span style={{ flex:1, height:1, background:colors.borderLight }} />
                  </div>
                  {sec.lines.map((tokens, li) => (
                    <div key={li} style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-end", marginBottom:8 }}>
                      {tokens.map((tok, ti) => (
                        <div key={ti} style={{ display:"flex", flexDirection:"column", paddingRight:10, flexShrink:0 }}>
                          {tok.hasChord ? (
                            <span style={{
                              fontSize:11, fontWeight:"bold", color:colors.teal, letterSpacing:"0.05em",
                              fontFamily:"ui-monospace, Menlo, Consolas, monospace",
                            }}>{tok.chord}</span>
                          ) : (
                            <span style={{ display:"block", height:14 }} />
                          )}
                          <span style={{ fontSize:15, color:colors.textPrimary, lineHeight:1.4 }}>{tok.text}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:"12px 20px", borderTop:`1px solid ${colors.borderMed}`,
          display:"flex", alignItems:"center", gap:8, flexShrink:0,
        }}>
          <span style={{ fontSize:11, color:colors.textMuted }}>
            Saved on the song document as <span style={{ color:colors.textNote }}>chart</span> — exports to the prompter with the set.
          </span>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button onClick={onCancel} style={{
              padding:"7px 14px", background:"transparent", border:`1px solid ${colors.borderMed}`,
              color:colors.textMuted, borderRadius:3, cursor:"pointer", fontSize:12, fontFamily:"inherit",
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding:"7px 14px", background:colors.coral, border:"none",
              color:colors.onAccent, borderRadius:3, cursor:"pointer", fontSize:12,
              fontFamily:"inherit", fontWeight:"bold", opacity: saving ? 0.6 : 1,
            }}>{saving ? "Saving…" : "Save Chart"}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
