import { useState } from "react";
import { collection, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { colors } from "../theme";
import { useCameronBits } from "../context/CameronBitsContext";
import { useSpeakerColors } from "../context/SpeakerColorsContext";

const BIT_TYPES = ["Narration", "Emcee", "LX / cue", "Wardrobe", "Transition"];
const SPEAKERS = ["Brett", "Spencer", "Kenny", "John", "Chris", "Matt", "Dave", "All", "—"];

const TYPE_COLORS = {
  "Narration":  "#4ecdc4",
  "Emcee":      "#ff6b6b",
  "LX / cue":   "#f4c542",
  "Wardrobe":   "#9b8ec4",
  "Transition": "#8888aa",
};

const makeEmptyBit = (showId) => ({ title: "", type: "Narration", speakers: [], duration: "", content: "", showId: showId || "" });

function Field({ label, value, onChange, type = "text", options, rows }) {
  const inputStyle = {
    width: "100%", background: colors.bgInput, border: `1px solid ${colors.borderMed}`,
    color: colors.textPrimary, padding: "6px 8px", borderRadius: 3,
    fontSize: 12, fontFamily: "'Georgia', serif", outline: "none", boxSizing: "border-box",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : rows ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          placeholder="Script text, lighting notes, cues…"
        />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
      )}
    </div>
  );
}

function SpeakerPicker({ value, onChange }) {
  const { speakerColors } = useSpeakerColors();
  const people = SPEAKERS.filter(s => s !== "—");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        Speaker(s)
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {people.map(name => {
          const on = value.includes(name);
          const c = speakerColors[name] || "#8888aa";
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(on ? value.filter(n => n !== name) : [...value, name])}
              style={{
                padding: "3px 10px", borderRadius: 99, fontSize: 11, cursor: "pointer",
                fontFamily: "inherit",
                background: on ? c : "transparent",
                color: on ? "#000" : c,
                border: `1px solid ${on ? c : c + "60"}`,
                fontWeight: on ? "bold" : "normal",
              }}
            >{name}</button>
          );
        })}
      </div>
    </div>
  );
}

function BitForm({ initial, onSave, onCancel, saving, shows = [] }) {
  // speakers stored as array internally; saved as comma-joined string
  const initSpeakers = initial.speakers && Array.isArray(initial.speakers)
    ? initial.speakers
    : (initial.speaker && initial.speaker !== "—" ? initial.speaker.split(", ").filter(Boolean) : []);
  const [form, setForm] = useState({ ...initial, speakers: initSpeakers });
  const set = key => val => setForm(f => ({ ...f, [key]: val }));

  function handleSave() {
    if (!form.title.trim()) return;
    const speaker = form.speakers.length ? form.speakers.join(", ") : "—";
    onSave({ ...form, speaker, duration: Number(form.duration) || 0 });
  }

  const showOptions = shows.map(s => ({ value: s.id, label: s.name }));

  return (
    <div style={{
      background: colors.bgPanel, border: `1px solid ${colors.borderMed}`,
      borderRadius: 6, padding: 16, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Title *" value={form.title} onChange={set("title")} />
        </div>
        <Field label="Type" value={form.type} onChange={set("type")} options={BIT_TYPES} />
        <Field label="Duration (min)" value={form.duration} onChange={set("duration")} type="number" />
        {showOptions.length > 0 && (
          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 10, color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Show</label>
            <select
              value={form.showId || ""}
              onChange={e => setForm(f => ({ ...f, showId: e.target.value }))}
              style={{ width: "100%", background: colors.bgInput, border: `1px solid ${colors.borderMed}`, color: colors.textPrimary, padding: "6px 8px", borderRadius: 3, fontSize: 12, fontFamily: "'Georgia', serif", outline: "none", cursor: "pointer" }}
            >
              <option value="">— any show —</option>
              {showOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <SpeakerPicker value={form.speakers} onChange={val => setForm(f => ({ ...f, speakers: val }))} />
        </div>
      </div>
      <Field label="Script / notes" value={form.content} onChange={set("content")} rows={5} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{
          padding: "7px 14px", background: "transparent", border: `1px solid ${colors.borderMed}`,
          color: colors.textMuted, borderRadius: 3, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
        }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.title.trim()} style={{
          padding: "7px 14px", background: colors.teal, border: "none",
          color: colors.onAccent, borderRadius: 3, cursor: "pointer", fontSize: 12,
          fontFamily: "inherit", fontWeight: "bold", opacity: (saving || !form.title.trim()) ? 0.5 : 1,
        }}>{saving ? "Saving…" : "Save bit"}</button>
      </div>
    </div>
  );
}

export default function CameronBitManager({ onToast, activeShowId, shows = [] }) {
  const { bits } = useCameronBits();
  const { speakerColors, updateColor, resetColors } = useSpeakerColors();
  const [expandedId, setExpandedId] = useState(null);
  const [showColorEditor, setShowColorEditor] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("All");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Show only bits for the active show (plus legacy bits with no showId)
  const showBits = bits.filter(b => !b.showId || b.showId === activeShowId);
  const filtered = showBits.filter(b => filterType === "All" || b.type === filterType);

  async function handleAdd(data) {
    setSaving(true);
    const id = crypto.randomUUID();
    await setDoc(doc(db, "cameronBits", id), { ...data, id });
    setSaving(false);
    setAdding(false);
    onToast?.("Cameron Bit added ✓");
  }

  async function handleEdit(bit, data) {
    setSaving(true);
    await updateDoc(doc(db, "cameronBits", bit.id), data);
    setSaving(false);
    setExpandedId(null);
    onToast?.("Saved ✓");
  }

  async function handleDelete(bit) {
    await deleteDoc(doc(db, "cameronBits", bit.id));
    setConfirmDelete(null);
    onToast?.("Deleted");
  }

  const filters = ["All", ...BIT_TYPES];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 24px" }}>

      {/* Filter chips + Add */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilterType(f)} style={{
              padding: "3px 12px", borderRadius: 99, fontSize: 11, cursor: "pointer",
              background: filterType === f ? colors.teal : "transparent",
              color: filterType === f ? colors.onAccent : colors.textSecondary,
              border: `1px solid ${filterType === f ? colors.teal : colors.borderMed}`,
              fontFamily: "inherit",
            }}>{f}</button>
          ))}
        </div>
        <button onClick={() => { setAdding(true); setExpandedId(null); }} style={{
          padding: "6px 14px", background: colors.teal, border: "none",
          color: colors.onAccent, borderRadius: 4, cursor: "pointer", fontSize: 12,
          fontFamily: "inherit", fontWeight: "bold", whiteSpace: "nowrap",
        }}>+ New bit</button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ marginBottom: 14 }}>
          <BitForm
            initial={makeEmptyBit(activeShowId)}
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
            saving={saving}
            shows={shows}
          />
        </div>
      )}

      {/* Empty state */}
      {!adding && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: colors.textMuted, fontSize: 13, fontStyle: "italic" }}>
          {filterType === "All" ? "No Cameron Bits for this show yet — add one above." : `No ${filterType} bits for this show yet.`}
        </div>
      )}

      {/* Bit rows */}
      {filtered.map(bit => {
        const isExpanded = expandedId === bit.id;
        const dotColor = TYPE_COLORS[bit.type] || colors.textDim;
        return (
          <div key={bit.id} style={{ marginBottom: 4 }}>
            {isExpanded ? (
              <BitForm
                initial={{ ...bit, duration: bit.duration ? String(bit.duration) : "" }}
                onSave={data => handleEdit(bit, data)}
                onCancel={() => setExpandedId(null)}
                saving={saving}
                shows={shows}
              />
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 4,
                background: colors.bgCard, border: `1px solid ${colors.borderMed}`,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: dotColor }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: colors.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {bit.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: colors.textSecondary }}>{bit.type}{bit.duration ? ` · ${bit.duration} min` : ""}</span>
                    {bit.speaker && bit.speaker !== "—" && bit.speaker.split(", ").filter(Boolean).map(s => (
                      <span key={s} style={{
                        fontSize: 10, padding: "1px 7px", borderRadius: 99,
                        background: (speakerColors[s] || "#8888aa") + "28",
                        border: `1px solid ${(speakerColors[s] || "#8888aa") + "60"}`,
                        color: speakerColors[s] || "#8888aa",
                        fontWeight: "bold",
                      }}>{s}</span>
                    ))}
                  </div>
                  {bit.content && (
                    <div style={{ fontSize: 11, color: colors.textNote, marginTop: 2, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {bit.content}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 99,
                  border: `1px solid ${colors.borderMed}`, color: colors.textMuted,
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>{bit.type}</span>
                <button onClick={() => { setExpandedId(bit.id); setAdding(false); }} style={{
                  padding: "3px 10px", background: "transparent", border: `1px solid ${colors.borderMed}`,
                  color: colors.textMuted, borderRadius: 3, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
                }}>Edit</button>
                <button onClick={() => setConfirmDelete(bit)} style={{
                  padding: "3px 8px", background: "transparent", border: `1px solid ${colors.borderRed}`,
                  color: colors.danger, borderRadius: 3, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
                }}>✕</button>
              </div>
            )}
          </div>
        );
      })}

      {/* Speaker color editor */}
      <div style={{ marginTop: 24, borderTop: `1px solid ${colors.borderMed}`, paddingTop: 14 }}>
        <button onClick={() => setShowColorEditor(v => !v)} style={{
          background: "none", border: "none", color: colors.textMuted,
          fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 14 }}>{showColorEditor ? "▾" : "▸"}</span>
          SPEAKER COLORS
        </button>
        {showColorEditor && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
              {Object.entries(speakerColors).map(([name, color]) => (
                <div key={name} style={{ position: "relative" }}>
                  <div
                    onClick={() => document.getElementById(`sc-${name}`).click()}
                    style={{
                      display: "flex", alignItems: "center", gap: 7, padding: "6px 10px",
                      borderRadius: 4, border: `1px solid ${color}50`, background: `${color}18`,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color, fontWeight: "bold" }}>{name}</span>
                  </div>
                  <input
                    id={`sc-${name}`}
                    type="color"
                    value={color}
                    onChange={e => updateColor(name, e.target.value)}
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none", top: 0, left: 0, width: 1, height: 1 }}
                  />
                </div>
              ))}
            </div>
            <button onClick={resetColors} style={{
              marginTop: 10, background: "none", border: `1px solid ${colors.borderMed}`,
              color: colors.textMuted, fontSize: 10, padding: "3px 10px", borderRadius: 3,
              cursor: "pointer", fontFamily: "inherit",
            }}>Reset to defaults</button>
          </div>
        )}
      </div>

      {/* Delete confirm overlay */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10001,
        }}>
          <div style={{
            background: colors.bgCard, border: `1px solid ${colors.borderMed}`,
            borderRadius: 8, padding: "24px 20px", maxWidth: 300, width: "90%",
          }}>
            <div style={{ fontSize: 13, color: colors.textPrimary, marginBottom: 20, lineHeight: 1.6 }}>
              Delete <strong style={{ color: colors.coral }}>{confirmDelete.title}</strong>?
              <br /><span style={{ fontSize: 11, color: colors.textMuted }}>It will be removed from any setlist that uses it.</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: 10, background: "transparent", border: `1px solid ${colors.borderMed}`,
                color: colors.textMuted, borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
              }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{
                flex: 1, padding: 10, background: colors.coral, border: "none",
                color: colors.onAccent, borderRadius: 4, cursor: "pointer", fontSize: 12,
                fontFamily: "inherit", fontWeight: "bold",
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
