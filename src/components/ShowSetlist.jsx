import { VIBE_COLORS } from "../data/songs";

function fmtDuration(secs) {
  if (!secs) return "";
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

export default function ShowSetlist({ songIds, playedSongIds, voting, songMap, onMarkPlayed, onUndoPlayed }) {
  const playedSet = new Set(playedSongIds || []);
  const votes = voting?.songVotes || {};
  const votingActive = voting?.active;

  // Sort unplayed by vote count for display (reflects how reorder will happen)
  const played = (playedSongIds || []).filter(id => songMap[id]);
  const remaining = songIds.filter(id => !playedSet.has(id) && songMap[id]);

  return (
    <div style={{ padding: "8px 12px 16px" }}>

      {/* Played songs */}
      {played.map((id, i) => {
        const song = songMap[id];
        return (
          <div key={id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 4, marginBottom: 3,
            background: "#0e0e20", border: "1px solid #1a1a2e",
            opacity: 0.45,
          }}>
            <div style={{ color: "#5ecdc4", fontSize: 13, flexShrink: 0 }}>✓</div>
            <div style={{ color: "#6868a0", fontSize: 12, minWidth: 22, textAlign: "right" }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "line-through" }}>
                {song.title}
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>{song.artist}</div>
            </div>
            <button onClick={() => onUndoPlayed(id)} style={{
              background: "none", border: "1px solid #2a2a40", color: "#555",
              borderRadius: 3, padding: "2px 8px", cursor: "pointer",
              fontSize: 10, fontFamily: "inherit",
            }}>undo</button>
          </div>
        );
      })}

      {/* Remaining songs */}
      {remaining.map((id, i) => {
        const song = songMap[id];
        const isNext = i === 0;
        const voteCount = votes[String(id)] || votes[id] || 0;

        return (
          <div key={id}>
            {isNext && (
              <div style={{
                fontSize: 9, color: "#f07272", letterSpacing: "0.2em",
                textTransform: "uppercase", padding: "6px 0 3px",
              }}>
                ▶ Now Playing / Up Next
              </div>
            )}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 10px", borderRadius: 4, marginBottom: 3,
              background: isNext ? "#1e0e14" : "#141428",
              border: isNext ? "1px solid #f07272" : "1px solid #1e1e36",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: VIBE_COLORS[song.vibe] || "#444",
              }} />
              <div style={{ color: "#6868a0", fontSize: 12, minWidth: 22, textAlign: "right" }}>
                {played.length + i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: isNext ? "#f07272" : "#e0dcd0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {song.title}
                </div>
                <div style={{ fontSize: 11, color: "#999" }}>
                  {song.artist} · {song.bpm} BPM{song.key ? ` · ${song.key}` : ""}
                </div>
              </div>

              {/* Vote count */}
              {voteCount > 0 && (
                <div style={{
                  background: votingActive ? "#5ecdc4" : "#2a4040",
                  color: votingActive ? "#0d0d1c" : "#5ecdc4",
                  borderRadius: 12, padding: "2px 8px",
                  fontSize: 12, fontWeight: "bold", flexShrink: 0,
                }}>
                  {voteCount}
                </div>
              )}

              {/* Key badge */}
              {song.key && (
                <div style={{
                  fontSize: 11, fontWeight: "bold", color: "#0d0d1c",
                  background: "#5ecdc4", borderRadius: 3,
                  padding: "2px 6px", flexShrink: 0,
                }}>
                  {song.key}
                </div>
              )}

              {/* Duration */}
              {song.duration && (
                <div style={{ fontSize: 11, color: "#666", flexShrink: 0 }}>{fmtDuration(song.duration)}</div>
              )}

              {/* Mark played button */}
              {isNext && (
                <button onClick={() => onMarkPlayed(id)} style={{
                  background: "#f07272", border: "none", color: "#0d0d1c",
                  borderRadius: 3, padding: "5px 10px", cursor: "pointer",
                  fontSize: 11, fontFamily: "inherit", fontWeight: "bold", flexShrink: 0,
                }}>✓ Played</button>
              )}
            </div>
          </div>
        );
      })}

      {remaining.length === 0 && (
        <div style={{
          textAlign: "center", padding: "32px 16px",
          color: "#5ecdc4", fontSize: 14, fontStyle: "italic",
        }}>
          🎉 That's the show!
        </div>
      )}
    </div>
  );
}
