import { useState } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SONGS, VIBE_COLORS } from "../data/songs";

const songMap = Object.fromEntries(SONGS.map(s => [s.id, s]));

function SortableItem({ id, index, onRemove, note, onNoteChange }) {
  const song = songMap[id];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note || "");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : "auto",
  };

  function commitNote() {
    setEditing(false);
    onNoteChange(id, draft.trim());
  }

  if (!song) return null;

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{
        padding:"9px 10px 6px", borderRadius:4, marginBottom:3,
        background:"#141428", border:"1px solid #1e1e36",
        userSelect:"none",
      }}>
        {/* Top row */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* drag handle */}
          <div
            {...listeners} {...attributes}
            style={{ color:"#666", cursor:"grab", fontSize:14, flexShrink:0, paddingRight:2, touchAction:"none" }}
          >
            ⠿
          </div>
          {/* number */}
          <div style={{ color:"#6868a0", fontSize:11, minWidth:20, textAlign:"right", fontVariantNumeric:"tabular-nums" }}>
            {index + 1}
          </div>
          {/* vibe dot */}
          <div style={{
            width:7, height:7, borderRadius:"50%", flexShrink:0,
            background: VIBE_COLORS[song.vibe] || "#444",
          }} />
          {/* info */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, color:"#e0dcd0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {song.title}
            </div>
            <div style={{ fontSize:10, color:"#999", marginTop:1 }}>
              {song.artist} · {song.bpm} BPM
            </div>
          </div>
          {/* remove */}
          <button
            onClick={() => onRemove(id)}
            style={{
              background:"none", border:"none", color:"#777", cursor:"pointer",
              fontSize:16, padding:"0 4px", flexShrink:0, lineHeight:1,
            }}
            title="Remove"
          >
            ×
          </button>
        </div>

        {/* Notes row */}
        <div style={{ paddingLeft:44, paddingBottom:3 }}>
          {editing ? (
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commitNote}
              onKeyDown={e => { if (e.key === "Escape") commitNote(); }}
              placeholder="Sound notes, key, cues, tempo changes…"
              rows={2}
              style={{
                width:"100%", background:"#0d0d1c", border:"1px solid #2a2a50",
                color:"#c0bdb5", fontSize:11, fontFamily:"'Georgia', serif",
                borderRadius:3, padding:"5px 7px", resize:"none", outline:"none",
                lineHeight:1.5, boxSizing:"border-box",
              }}
            />
          ) : (
            <div
              onClick={() => { setDraft(note || ""); setEditing(true); }}
              style={{
                fontSize:11, color: note ? "#a09a8e" : "#444",
                cursor:"text", lineHeight:1.5, minHeight:18,
                fontStyle: note ? "normal" : "italic",
                paddingTop:3,
              }}
            >
              {note || "add sound note…"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetlistBuilder({ songIds, onChange, songNotes, onNoteChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = songIds.indexOf(active.id);
      const newIndex = songIds.indexOf(over.id);
      onChange(arrayMove(songIds, oldIndex, newIndex));
    }
  }

  function handleRemove(id) {
    onChange(songIds.filter(s => s !== id));
  }

  if (songIds.length === 0) {
    return (
      <div style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        color:"#666", fontSize:13, textAlign:"center", padding:24, fontStyle:"italic",
      }}>
        ← Click songs from the library to add them here
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={songIds} strategy={verticalListSortingStrategy}>
        <div style={{ padding:"8px 12px 16px" }}>
          {songIds.map((id, i) => (
            <SortableItem
              key={id}
              id={id}
              index={i}
              onRemove={handleRemove}
              note={(songNotes || {})[id] || ""}
              onNoteChange={onNoteChange}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
