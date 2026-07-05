import { useState } from "react";
import { createPortal } from "react-dom";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useSongs } from "../context/SongsContext";
import { VIBE_COLORS } from "../data/songs";
import { colors } from "../theme";

const VIBES = ["anthemic","epic","fun","groove","joy","love","nostalgia","pride","singalong","soulful","swagger","tension","uplift"];

const EMPTY_SONG = { title:"", artist:"", bpm:"", genre:"", vibe:"groove", year:"", popularity:"", key:"", duration:"", note:"" };

function parseDuration(str) {
  const parts = String(str).split(":");
  if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1]);
  return Number(str) || 0;
}

function fmtDuration(secs) {
  if (!secs) return "";
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Field({ label, value, onChange, type = "text", options }) {
  const inputStyle = {
    width:"100%", background:colors.bgInput, border:`1px solid ${colors.borderMed}`,
    color:colors.textPrimary, padding:"6px 8px", borderRadius:3,
    fontSize:12, fontFamily:"'Georgia', serif", outline:"none",
    boxSizing:"border-box",
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:colors.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, cursor:"pointer" }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
      )}
    </div>
  );
}

function SongForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  function handleSave() {
    if (!form.title.trim() || !form.artist.trim() || !form.bpm) return;
    onSave({
      ...form,
      bpm: Number(form.bpm),
      year: Number(form.year) || new Date().getFullYear(),
      popularity: Number(form.popularity) || 70,
      duration: parseDuration(form.duration),
    });
  }

  return (
    <div style={{
      background:colors.bgPanel, border:`1px solid ${colors.borderMed}`, borderRadius:6,
      padding:16, display:"flex", flexDirection:"column", gap:12,
    }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Field label="Title *" value={form.title} onChange={set("title")} />
        <Field label="Artist *" value={form.artist} onChange={set("artist")} />
        <Field label="BPM *" value={form.bpm} onChange={set("bpm")} type="number" />
        <Field label="Key (e.g. G, Am, C#)" value={form.key || ""} onChange={set("key")} />
        <Field label="Duration (m:ss)" value={fmtDuration(form.duration) || form.duration} onChange={set("duration")} />
        <Field label="Genre" value={form.genre} onChange={set("genre")} />
        <Field label="Vibe" value={form.vibe} onChange={set("vibe")} options={VIBES} />
        <Field label="Year" value={form.year} onChange={set("year")} type="number" />
        <Field label="Popularity (1–100)" value={form.popularity} onChange={set("popularity")} type="number" />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
        <label style={{ fontSize:10, color:colors.textMuted, letterSpacing:"0.1em", textTransform:"uppercase" }}>Sound Notes</label>
        <textarea
          value={form.note || ""}
          onChange={e => set("note")(e.target.value)}
          placeholder="Key, cues, EQ notes, tempo changes…"
          rows={3}
          style={{
            width:"100%", background:colors.bgInput, border:`1px solid ${colors.borderMed}`,
            color:colors.textPrimary, padding:"6px 8px", borderRadius:3,
            fontSize:13, fontFamily:"'Georgia', serif", outline:"none",
            boxSizing:"border-box", resize:"vertical", lineHeight:1.5,
          }}
        />
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <button onClick={onCancel} style={{
          padding:"7px 14px", background:"transparent", border:`1px solid ${colors.borderMed}`,
          color:colors.textMuted, borderRadius:3, cursor:"pointer", fontSize:12, fontFamily:"inherit",
        }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{
          padding:"7px 14px", background:colors.coral, border:"none",
          color: colors.onAccent, borderRadius:3, cursor:"pointer", fontSize:12,
          fontFamily:"inherit", fontWeight:"bold", opacity: saving ? 0.6 : 1,
        }}>{saving ? "Saving…" : "Save Song"}</button>
      </div>
    </div>
  );
}

export default function SongAdmin({ onClose }) {
  const { songs } = useSongs();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = songs
    .filter(s => {
      const q = search.toLowerCase();
      return !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  async function handleAdd(data) {
    setSaving(true);
    const id = crypto.randomUUID();
    await setDoc(doc(db, "songs", id), { ...data, id });
    setSaving(false);
    setAdding(false);
  }

  async function handleEdit(song, data) {
    setSaving(true);
    await updateDoc(doc(db, "songs", String(song.id)), data);
    setSaving(false);
    setEditingId(null);
  }

  async function handleDelete(song) {
    await deleteDoc(doc(db, "songs", String(song.id)));
    setConfirmDelete(null);
  }

  return createPortal(
    <div style={{
      position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.85)",
      display:"flex", alignItems:"stretch", justifyContent:"center",
      fontFamily:"'Georgia', serif",
    }}>
      <div style={{
        background: colors.bgPage, width:"min(720px, 100vw)", display:"flex",
        flexDirection:"column", height:"100%",
      }}>
        {/* Header */}
        <div style={{
          padding:"14px 20px", borderBottom:`1px solid ${colors.borderMed}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0,
        }}>
          <div>
            <div style={{ fontSize:11, color:colors.textMuted, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:2 }}>
              Song Manager
            </div>
            <div style={{ fontSize:15, color:colors.textPrimary }}>{songs.length} songs in library</div>
          </div>
          <button onClick={onClose} style={{
            background:"none", border:"none", color:colors.textMuted, cursor:"pointer", fontSize:22, lineHeight:1,
          }}>×</button>
        </div>

        {/* Toolbar */}
        <div style={{
          padding:"10px 20px", borderBottom:`1px solid ${colors.borderLight}`,
          display:"flex", gap:10, flexShrink:0,
        }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search songs or artists…"
            style={{
              flex:1, background:colors.bgInput, border:`1px solid ${colors.borderMed}`,
              color:colors.textPrimary, padding:"7px 12px", borderRadius:4,
              fontSize:12, fontFamily:"inherit", outline:"none",
            }}
          />
          <button onClick={() => { setAdding(true); setEditingId(null); }} style={{
            padding:"7px 14px", background:colors.teal, border:"none",
            color: colors.onAccent, borderRadius:4, cursor:"pointer", fontSize:12,
            fontFamily:"inherit", fontWeight:"bold", whiteSpace:"nowrap",
          }}>+ Add Song</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 20px 24px" }}>

          {/* Add form */}
          {adding && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:colors.teal, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
                New Song
              </div>
              <SongForm
                initial={EMPTY_SONG}
                onSave={handleAdd}
                onCancel={() => setAdding(false)}
                saving={saving}
              />
            </div>
          )}

          {/* Song rows */}
          {filtered.map(song => {
            const isEditing = editingId === song.id;
            return (
              <div key={song.id} style={{ marginBottom:4 }}>
                {isEditing ? (
                  <SongForm
                    initial={{ ...song, bpm: String(song.bpm), year: String(song.year), popularity: String(song.popularity), key: song.key || "", duration: song.duration || "", note: song.note || "" }}
                    onSave={(data) => handleEdit(song, data)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                ) : (
                  <div style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"8px 10px", borderRadius:4,
                    background:colors.bgCard, border:`1px solid ${colors.borderMed}`,
                  }}>
                    <div style={{
                      width:8, height:8, borderRadius:"50%", flexShrink:0,
                      background: VIBE_COLORS[song.vibe] || colors.vibeDotFallback,
                    }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, color:colors.textPrimary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {song.title}
                      </div>
                      <div style={{ fontSize:11, color:colors.textSecondary, marginTop:1 }}>
                        {song.artist} · {song.genre} · {song.bpm} BPM · {song.vibe}
                      </div>
                      {song.note && (
                        <div style={{ fontSize:11, color:colors.textNote, marginTop:3, fontStyle:"italic", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {song.note}
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setEditingId(song.id); setAdding(false); }} style={{
                      padding:"3px 10px", background:"transparent", border:`1px solid ${colors.borderMed}`,
                      color:colors.textMuted, borderRadius:3, cursor:"pointer", fontSize:11, fontFamily:"inherit",
                    }}>Edit</button>
                    <button onClick={() => setConfirmDelete(song)} style={{
                      padding:"3px 8px", background:"transparent", border:`1px solid ${colors.borderRed}`,
                      color:colors.danger, borderRadius:3, cursor:"pointer", fontSize:11, fontFamily:"inherit",
                    }}>✕</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{
          position:"absolute", inset:0, background:"rgba(0,0,0,0.7)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000,
        }}>
          <div style={{
            background:colors.bgCard, border:`1px solid ${colors.borderMed}`, borderRadius:8,
            padding:"24px 20px", maxWidth:300, width:"90%",
          }}>
            <div style={{ fontSize:13, color:colors.textPrimary, marginBottom:20, lineHeight:1.6 }}>
              Delete <strong style={{ color:colors.coral }}>{confirmDelete.title}</strong> from the library?
              <br /><span style={{ fontSize:11, color:colors.textMuted }}>This won't affect existing setlists.</span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex:1, padding:"10px", background:"transparent", border:`1px solid ${colors.borderMed}`,
                color:colors.textMuted, borderRadius:4, cursor:"pointer", fontSize:12, fontFamily:"inherit",
              }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{
                flex:1, padding:"10px", background:colors.coral, border:"none",
                color: colors.onAccent, borderRadius:4, cursor:"pointer", fontSize:12,
                fontFamily:"inherit", fontWeight:"bold",
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
