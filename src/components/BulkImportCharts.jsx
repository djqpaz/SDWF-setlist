import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { colors } from "../theme";
import { parseBulkCharts } from "../lib/bulkImportCharts";

export default function BulkImportCharts({ songs, onClose, onImported }) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState({});
  const [assignTarget, setAssignTarget] = useState("");
  const [manualBlocks, setManualBlocks] = useState([]);
  const [saving, setSaving] = useState(false);

  const { matched, unmatched } = useMemo(() => parseBulkCharts(text, songs), [text, songs]);
  const blocks = [...matched, ...manualBlocks];

  const songById = useMemo(() => Object.fromEntries(songs.map(s => [String(s.id), s])), [songs]);
  const selectableSongs = [...songs].sort((a, b) => a.title.localeCompare(b.title));

  function toggle(key) {
    setChecked(c => ({ ...c, [key]: c[key] === false ? true : false }));
  }

  function isChecked(key) {
    return checked[key] !== false;
  }

  function assignUnmatched() {
    if (!assignTarget || !unmatched.trim()) return;
    const song = songById[assignTarget];
    setManualBlocks(m => [...m, { songId: song.id, title: song.title, chart: unmatched, manual: true }]);
    setAssignTarget("");
  }

  async function handleImport() {
    const toSave = blocks.filter((b, i) => isChecked(b.manual ? `m${i}` : `s${b.songId}`));
    if (!toSave.length) return;
    setSaving(true);
    try {
      await Promise.all(toSave.map(b => updateDoc(doc(db, "songs", String(b.songId)), { chart: b.chart })));
      onImported(toSave.length);
    } catch (err) {
      console.error("Bulk chart import failed:", err);
      onImported(0, err);
    } finally {
      setSaving(false);
    }
  }

  const importCount = blocks.filter((b, i) => isChecked(b.manual ? `m${i}` : `s${b.songId}`)).length;

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 10001, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Georgia', serif", padding: 24,
    }}>
      <div style={{
        width: "min(1000px, 100%)", maxHeight: "92vh", background: colors.bgPage,
        border: `1px solid ${colors.borderMed}`, borderRadius: 6,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: `1px solid ${colors.borderMed}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Song Manager · Bulk Import
            </span>
            <span style={{ fontSize: 15, color: colors.textPrimary }}>Charts</span>
          </div>
          <span onClick={onClose} style={{ fontSize: 22, lineHeight: 1, color: colors.textMuted, cursor: "pointer" }}>×</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Left: paste */}
          <div style={{ borderRight: `1px solid ${colors.borderLight}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "10px 16px 6px" }}>
              <span style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Paste all your charts here
              </span>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              spellCheck={false}
              placeholder={"Paste the whole charts document — one song's chords/lyrics after another. A line that exactly matches a song's title in the library starts a new chart."}
              style={{
                flex: 1, margin: "0 16px 16px", background: colors.bgInput, border: `1px solid ${colors.borderMed}`,
                borderRadius: 3, padding: 12, fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                fontSize: 12, lineHeight: 1.6, color: colors.textPrimary, resize: "none", boxSizing: "border-box", outline: "none",
              }}
            />
          </div>

          {/* Right: preview */}
          <div style={{ display: "flex", flexDirection: "column", background: colors.bgPanel, minHeight: 0, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px 6px", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Matched {blocks.length ? `· ${blocks.length} songs` : ""}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {blocks.length === 0 && (
                <div style={{ fontSize: 12, color: colors.textFaint, fontStyle: "italic" }}>
                  Nothing matched yet — paste text on the left.
                </div>
              )}
              {blocks.map((b, i) => {
                const key = b.manual ? `m${i}` : `s${b.songId}`;
                const song = songById[String(b.songId)];
                const overwriting = song && song.chart;
                return (
                  <label key={key} style={{
                    display: "flex", gap: 10, padding: "8px 10px", borderRadius: 4, cursor: "pointer",
                    background: colors.bgCard, border: `1px solid ${colors.borderMed}`,
                  }}>
                    <input type="checkbox" checked={isChecked(key)} onChange={() => toggle(key)} style={{ marginTop: 3 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: colors.textPrimary, display: "flex", alignItems: "center", gap: 6 }}>
                        {b.title}
                        {overwriting && (
                          <span style={{ fontSize: 9, color: colors.coral, border: `1px solid ${colors.borderMed}`, borderRadius: 8, padding: "1px 6px" }}>
                            replaces existing chart
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11, color: colors.textFaint, marginTop: 3, whiteSpace: "nowrap",
                        overflow: "hidden", textOverflow: "ellipsis", fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                      }}>
                        {b.chart.split("\n").find(l => l.trim()) || ""}
                      </div>
                    </div>
                  </label>
                );
              })}

              {unmatched.trim() && (
                <div style={{
                  marginTop: 8, padding: "8px 10px", borderRadius: 4,
                  background: colors.bgCard, border: `1px dashed ${colors.borderMed}`,
                }}>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>
                    Unrecognized text ({unmatched.split("\n").length} lines) — no song title matched before this.
                    Assign it manually:
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select
                      value={assignTarget}
                      onChange={e => setAssignTarget(e.target.value)}
                      style={{
                        flex: 1, background: colors.bgInput, border: `1px solid ${colors.borderMed}`,
                        color: colors.textPrimary, padding: "5px 8px", borderRadius: 3, fontSize: 12, fontFamily: "inherit",
                      }}
                    >
                      <option value="">Choose a song…</option>
                      {selectableSongs.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                    <button onClick={assignUnmatched} disabled={!assignTarget} style={{
                      padding: "5px 10px", background: "transparent", border: `1px solid ${colors.borderTeal}`,
                      color: colors.teal, borderRadius: 3, cursor: assignTarget ? "pointer" : "default", fontSize: 11, fontFamily: "inherit",
                      opacity: assignTarget ? 1 : 0.5,
                    }}>Add</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${colors.borderMed}`,
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: colors.textMuted }}>
            Saves the <span style={{ color: colors.textNote }}>chart</span> field on each matched song.
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              padding: "7px 14px", background: "transparent", border: `1px solid ${colors.borderMed}`,
              color: colors.textMuted, borderRadius: 3, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
            }}>Cancel</button>
            <button onClick={handleImport} disabled={saving || importCount === 0} style={{
              padding: "7px 14px", background: colors.coral, border: "none",
              color: colors.onAccent, borderRadius: 3, cursor: "pointer", fontSize: 12,
              fontFamily: "inherit", fontWeight: "bold", opacity: (saving || importCount === 0) ? 0.6 : 1,
            }}>{saving ? "Importing…" : `Import ${importCount || ""} Chart${importCount === 1 ? "" : "s"}`}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
