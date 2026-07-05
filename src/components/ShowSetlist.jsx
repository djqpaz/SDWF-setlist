import { VIBE_COLORS } from "../data/songs";
import { colors } from "../theme";

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
  const remaining = songIds
    .filter(id => !playedSet.has(id) && songMap[id])
    .sort((a, b) => {
      if (!votingActive) return 0; // preserve order when not voting
      const va = votes[String(a)] || votes[a] || 0;
      const vb = votes[String(b)] || votes[b] || 0;
      if (vb !== va) return vb - va;
      return songIds.indexOf(a) - songIds.indexOf(b); // tie-break: original order
    });

  return (
    <div style={{ padding: "8px 12px 16px" }}>

      {/* Played songs */}
      {played.map((id, i) => {
        const song = songMap[id];
        return (
          <div key={id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 4, marginBottom: 3,
            background: colors.bgPlayedRow, border: `1px solid ${colors.borderLight}`,
            opacity: 0.45,
          }}>
            <div style={{ color: colors.teal, fontSize: 13, flexShrink: 0 }}>✓</div>
            <div style={{ color: colors.purple, fontSize: 12, minWidth: 22, textAlign: "right" }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "line-through" }}>
                {song.title}
              </div>
              <div style={{ fontSize: 11, color: colors.textFaint }}>{song.artist}</div>
            </div>
            <button onClick={() => onUndoPlayed(id)} style={{
              background: "none", border: `1px solid ${colors.borderLight}`, color: colors.textFaint,
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
                fontSize: 9, color: colors.coral, letterSpacing: "0.2em",
                textTransform: "uppercase", padding: "6px 0 3px",
              }}>
                ▶ Now Playing / Up Next
              </div>
            )}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 10px", borderRadius: 4, marginBottom: 3,
              background: isNext ? colors.bgNowPlaying : colors.bgCard,
              border: isNext ? `1px solid ${colors.coral}` : `1px solid ${colors.borderMed}`,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: VIBE_COLORS[song.vibe] || colors.vibeDotFallback,
              }} />
              <div style={{ color: colors.purple, fontSize: 12, minWidth: 22, textAlign: "right" }}>
                {played.length + i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: isNext ? colors.coral : colors.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {song.title}
                </div>
                <div style={{ fontSize: 11, color: colors.textSecondary }}>
                  {song.artist} · {song.bpm} BPM{song.key ? ` · ${song.key}` : ""}
                </div>
              </div>

              {/* Vote count */}
              {voteCount > 0 && (
                <div style={{
                  background: votingActive ? colors.teal : colors.borderTeal,
                  color: votingActive ? colors.bgPage : colors.teal,
                  borderRadius: 12, padding: "2px 8px",
                  fontSize: 12, fontWeight: "bold", flexShrink: 0,
                }}>
                  {voteCount}
                </div>
              )}

              {/* Key badge */}
              {song.key && (
                <div style={{
                  fontSize: 11, fontWeight: "bold", color: colors.onAccent,
                  background: colors.teal, borderRadius: 3,
                  padding: "2px 6px", flexShrink: 0,
                }}>
                  {song.key}
                </div>
              )}

              {/* Duration */}
              {song.duration && (
                <div style={{ fontSize: 11, color: colors.textDim, flexShrink: 0 }}>{fmtDuration(song.duration)}</div>
              )}

              {/* Mark played button */}
              {isNext && (
                <button onClick={() => onMarkPlayed(id)} style={{
                  background: colors.coral, border: "none", color: colors.onAccent,
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
          color: colors.teal, fontSize: 14, fontStyle: "italic",
        }}>
          🎉 That's the show!
        </div>
      )}
    </div>
  );
}
