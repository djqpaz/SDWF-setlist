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
import { colors } from "../theme";
import { VIBE_COLORS } from "../data/songs";
import { useSongs } from "../context/SongsContext";
import { useCameronBits } from "../context/CameronBitsContext";

const BIT_TYPE_COLORS = {
  "Narration":  "#4ecdc4",
  "Emcee":      "#ff6b6b",
  "LX / cue":   "#f4c542",
  "Wardrobe":   "#9b8ec4",
  "Transition": "#8888aa",
};

function fmtDuration(secs) {
  if (!secs) return "";
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function SortableItem({ itemKey, id, index, onRemove, songMap, bitMap, type, sameKeyAsPrev, pendingRemove, onPendingRemove, chartUrl, locked, onOpenBit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: itemKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : "auto",
  };

  if (type === "cameron") {
    const bit = bitMap[id];
    if (!bit) return null;
    const dotColor = BIT_TYPE_COLORS[bit.type] || colors.textDim;
    return (
      <div ref={setNodeRef} style={style}>
        <div style={{
          borderRadius: 4, marginBottom: 3,
          background: colors.bgPanel, border: `1px solid ${colors.borderTeal}`,
          borderLeft: `3px solid ${dotColor}`,
          overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", userSelect: "none" }}>
            {locked ? (
              <div style={{ color: colors.textDim, fontSize: 15, flexShrink: 0, paddingRight: 2, opacity: 0.3 }}>⠿</div>
            ) : (
              <div {...listeners} {...attributes} style={{ color: colors.textDim, cursor: "grab", fontSize: 15, flexShrink: 0, paddingRight: 2, touchAction: "none" }}>⠿</div>
            )}
            <div style={{ color: colors.textDim, fontSize: 10, minWidth: 22, textAlign: "right" }}>—</div>
            <div style={{ flex: 1, minWidth: 0, cursor: bit.content ? "pointer" : "default" }} onClick={() => bit.content && onOpenBit && onOpenBit(bit)}>
              <div style={{ fontSize: 13, color: colors.teal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontStyle: "italic" }}>
                {bit.title}{bit.content ? " ▾" : ""}
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                {bit.type}{bit.speaker && bit.speaker !== "—" ? ` · ${bit.speaker}` : ""}
                {bit.duration ? ` · ${bit.duration} min` : ""}
              </div>
            </div>
            <span style={{
              fontSize: 9, padding: "1px 7px", borderRadius: 99,
              border: `1px solid ${colors.borderTeal}`, color: colors.teal,
              textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0,
            }}>bit</span>
            {!locked && (pendingRemove ? (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => onRemove(itemKey)} style={{
                  background: colors.danger, border: "none", color: "#fff",
                  cursor: "pointer", fontSize: 11, padding: "4px 8px",
                  borderRadius: 3, fontFamily: "inherit", fontWeight: "bold",
                }}>Remove</button>
                <button onClick={() => onPendingRemove(null)} style={{
                  background: "none", border: `1px solid ${colors.borderMed}`, color: colors.textMuted,
                  cursor: "pointer", fontSize: 11, padding: "4px 8px", borderRadius: 3, fontFamily: "inherit",
                }}>Keep</button>
              </div>
            ) : (
              <button onClick={() => onPendingRemove(itemKey)} style={{
                background: "none", border: "none", color: colors.textDim, cursor: "pointer",
                fontSize: 18, padding: "0 4px", flexShrink: 0, lineHeight: 1,
              }} title="Remove from set">×</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Song item
  const song = songMap[id];
  if (!song) return null;

  return (
    <div ref={setNodeRef} style={style}>
      {sameKeyAsPrev && (
        <div style={{ fontSize: 10, color: colors.gold, paddingLeft: 44, paddingBottom: 2, marginTop: -1 }}>
          ⚠ same key as previous song
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 10px", borderRadius: 4, marginBottom: 3,
        background: pendingRemove ? colors.bgSelectedWash : colors.bgCard,
        border: pendingRemove ? `1px solid ${colors.borderRed}` : sameKeyAsPrev ? `1px solid ${colors.borderGold}` : `1px solid ${colors.borderMed}`,
        userSelect: "none",
      }}>
        {locked ? (
          <div style={{ color: colors.textDim, fontSize: 15, flexShrink: 0, paddingRight: 2, opacity: 0.3 }}>⠿</div>
        ) : (
          <div
            {...listeners} {...attributes}
            style={{ color: colors.textDim, cursor: "grab", fontSize: 15, flexShrink: 0, paddingRight: 2, touchAction: "none" }}
          >⠿</div>
        )}
        <div style={{ color: colors.purple, fontSize: 13, minWidth: 22, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
          {index + 1}
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: VIBE_COLORS[song.vibe] || colors.vibeDotFallback,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, color: colors.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {song.title}
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
            {song.artist} · {song.bpm} BPM
          </div>
          {song.note && (
            <div style={{
              fontSize: 11, color: colors.textNote, marginTop: 3, fontStyle: "italic", lineHeight: 1.4,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {song.note}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          {song.key && (
            <div style={{
              fontSize: 11, fontWeight: "bold", color: colors.onAccent,
              background: sameKeyAsPrev ? colors.gold : colors.teal,
              borderRadius: 3, padding: "2px 6px", letterSpacing: "0.05em",
            }}>
              {song.key}
            </div>
          )}
          {song.duration && (
            <div style={{ fontSize: 11, color: colors.textDim }}>{fmtDuration(song.duration)}</div>
          )}
        </div>
        {chartUrl && (
          <a href={chartUrl} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 10, color: colors.textDim, border: `1px solid ${colors.borderLight}`,
            borderRadius: 3, padding: "2px 5px", textDecoration: "none", flexShrink: 0,
            whiteSpace: "nowrap",
          }}>Chart ↗</a>
        )}
        {!locked && (pendingRemove ? (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => onRemove(itemKey)} style={{
              background: colors.danger, border: "none", color: "#fff",
              cursor: "pointer", fontSize: 11, padding: "4px 8px",
              borderRadius: 3, fontFamily: "inherit", fontWeight: "bold",
            }}>Remove</button>
            <button onClick={() => onPendingRemove(null)} style={{
              background: "none", border: `1px solid ${colors.borderMed}`, color: colors.textMuted,
              cursor: "pointer", fontSize: 11, padding: "4px 8px",
              borderRadius: 3, fontFamily: "inherit",
            }}>Keep</button>
          </div>
        ) : (
          <button
            onClick={() => onPendingRemove(itemKey)}
            style={{
              background: "none", border: "none", color: colors.textDim, cursor: "pointer",
              fontSize: 18, padding: "0 4px", flexShrink: 0, lineHeight: 1,
            }}
            title="Remove from set"
          >×</button>
        ))}
      </div>
    </div>
  );
}

export function calcTotalDuration(songIds, songMap) {
  return songIds.reduce((sum, id) => sum + (songMap[id]?.duration || 0), 0);
}

export default function SetlistBuilder({ items = [], onChange, showId, baseUrl, locked }) {
  const { songs } = useSongs();
  const { bits } = useCameronBits();
  const songMap = Object.fromEntries(songs.map(s => [s.id, s]));
  const bitMap = Object.fromEntries(bits.map(b => [b.id, b]));
  const [pendingRemoveKey, setPendingRemoveKey] = useState(null);
  const [openedBit, setOpenedBit] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Each item gets a stable composite key for DnD
  const itemKeys = items.map(item => `${item.type}-${item.id}`);

  function handleDragEnd(event) {
    if (locked) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = itemKeys.indexOf(active.id);
      const newIndex = itemKeys.indexOf(over.id);
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  }

  function handleRemove(itemKey) {
    const idx = itemKeys.indexOf(itemKey);
    onChange(items.filter((_, i) => i !== idx));
    setPendingRemoveKey(null);
  }

  if (items.length === 0) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: colors.textDim, fontSize: 14, textAlign: "center", padding: 24,
      }}>
        <div style={{ fontStyle: "italic", marginBottom: 6 }}>Anyone? Anyone?</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>← Add a song from the library</div>
      </div>
    );
  }

  // Count song index for numbering (skip cameron bits)
  let songIndex = 0;
  let prevSongKey = null;

  return (
    <>
    {openedBit && (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        zIndex: 10002,
      }} onClick={() => setOpenedBit(null)}>
        <div onClick={e => e.stopPropagation()} style={{
          background: colors.bgCard, borderRadius: "12px 12px 0 0",
          width: "100%", maxWidth: 640, maxHeight: "80vh",
          display: "flex", flexDirection: "column",
          border: `1px solid ${colors.borderTeal}`, borderBottom: "none",
        }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${colors.borderMed}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: colors.teal, fontStyle: "italic", fontWeight: "bold" }}>{openedBit.title}</div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {openedBit.type}{openedBit.speaker && openedBit.speaker !== "—" ? ` · ${openedBit.speaker}` : ""}
                  {openedBit.duration ? ` · ${openedBit.duration} min` : ""}
                </div>
              </div>
              <button onClick={() => setOpenedBit(null)} style={{
                background: "none", border: "none", color: colors.textMuted,
                fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0,
              }}>×</button>
            </div>
          </div>
          <div style={{ overflowY: "auto", padding: "14px 16px 24px" }}>
            <pre style={{
              margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
              fontSize: 13, lineHeight: 1.7, color: colors.textPrimary,
              fontFamily: "'Georgia', serif",
            }}>{openedBit.content}</pre>
          </div>
        </div>
      </div>
    )}
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemKeys} strategy={verticalListSortingStrategy}>
        <div style={{ padding: "8px 12px 16px" }}>
          {items.map((item, i) => {
            const itemKey = itemKeys[i];
            const isSong = item.type === "song";
            const sameKeyAsPrev = isSong && prevSongKey !== null &&
              songMap[item.id]?.key && songMap[prevSongKey]?.key === songMap[item.id]?.key;
            const currentIndex = isSong ? songIndex++ : -1;
            if (isSong) prevSongKey = item.id;

            return (
              <SortableItem
                key={itemKey}
                itemKey={itemKey}
                id={item.id}
                type={item.type}
                index={currentIndex}
                onRemove={handleRemove}
                songMap={songMap}
                bitMap={bitMap}
                sameKeyAsPrev={sameKeyAsPrev}
                pendingRemove={pendingRemoveKey === itemKey}
                onPendingRemove={setPendingRemoveKey}
                chartUrl={isSong && showId && baseUrl ? `${baseUrl}?charts=${showId}&song=${item.id}` : null}
                locked={locked}
                onOpenBit={setOpenedBit}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
    </>
  );
}
