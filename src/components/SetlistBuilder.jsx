import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { VIBE_COLORS } from "../data/songs";
import { useSongs } from "../context/SongsContext";

function fmtDuration(secs) {
  if (!secs) return "";
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function SortableItem({ id, index, onRemove, songMap, sameKeyAsPrev }) {
  const song = songMap[id];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : "auto",
  };

  if (!song) return null;

  return (
    <div ref={setNodeRef} style={style}>
      {sameKeyAsPrev && (
        <div style={{ fontSize:10, color:"#c09040", paddingLeft:44, paddingBottom:2, marginTop:-1 }}>
          ⚠ same key as previous song
        </div>
      )}
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"10px 10px", borderRadius:4, marginBottom:3,
        background:"#141428",
        border: sameKeyAsPrev ? "1px solid #6a4a10" : "1px solid #1e1e36",
        userSelect:"none",
      }}>
        {/* drag handle */}
        <div
          {...listeners} {...attributes}
          style={{ color:"#666", cursor:"grab", fontSize:15, flexShrink:0, paddingRight:2, touchAction:"none" }}
        >
          ⠿
        </div>
        {/* number */}
        <div style={{ color:"#6868a0", fontSize:13, minWidth:22, textAlign:"right", fontVariantNumeric:"tabular-nums" }}>
          {index + 1}
        </div>
        {/* vibe dot */}
        <div style={{
          width:8, height:8, borderRadius:"50%", flexShrink:0,
          background: VIBE_COLORS[song.vibe] || "#444",
        }} />
        {/* info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, color:"#e0dcd0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {song.title}
          </div>
          <div style={{ fontSize:12, color:"#999", marginTop:1 }}>
            {song.artist} · {song.bpm} BPM
          </div>
          {song.note && (
            <div style={{ fontSize:11, color:"#7a9a90", marginTop:3, fontStyle:"italic", lineHeight:1.4 }}>
              {song.note}
            </div>
          )}
        </div>
        {/* key + duration */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
          {song.key && (
            <div style={{
              fontSize:11, fontWeight:"bold", color:"#0d0d1c",
              background: sameKeyAsPrev ? "#c09040" : "#5ecdc4",
              borderRadius:3, padding:"2px 6px", letterSpacing:"0.05em",
            }}>
              {song.key}
            </div>
          )}
          {song.duration && (
            <div style={{ fontSize:11, color:"#666" }}>{fmtDuration(song.duration)}</div>
          )}
        </div>
        {/* remove */}
        <button
          onClick={() => onRemove(id)}
          style={{
            background:"none", border:"none", color:"#777", cursor:"pointer",
            fontSize:18, padding:"0 4px", flexShrink:0, lineHeight:1,
          }}
          title="Remove"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function calcTotalDuration(songIds, songMap) {
  return songIds.reduce((sum, id) => sum + (songMap[id]?.duration || 0), 0);
}

export default function SetlistBuilder({ songIds, onChange }) {
  const { songs } = useSongs();
  const songMap = Object.fromEntries(songs.map(s => [s.id, s]));
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
        color:"#666", fontSize:14, textAlign:"center", padding:24, fontStyle:"italic",
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
              songMap={songMap}
              sameKeyAsPrev={i > 0 && songMap[id]?.key && songMap[songIds[i-1]]?.key === songMap[id]?.key}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
