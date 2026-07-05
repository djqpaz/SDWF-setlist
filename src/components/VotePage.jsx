import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, increment, collection } from "firebase/firestore";
import { db } from "../firebase";
import { colors } from "../theme";

function fmtTime(s) {
  if (!s && s !== 0) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function VotePage({ showId }) {
  const [show, setShow] = useState(null);
  const [songs, setSongs] = useState({});
  const [loading, setLoading] = useState(true);
  const [myVote, setMyVote] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const voteKey = `sdwf-vote-${showId}`;

  // Load saved vote
  useEffect(() => {
    const saved = localStorage.getItem(voteKey);
    if (saved) setMyVote(saved);
  }, [voteKey]);

  // Listen to show
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "shows", showId), snap => {
      if (snap.exists()) setShow({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [showId]);

  // Listen to songs
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "songs"), snap => {
      const map = {};
      snap.docs.forEach(d => { const s = d.data(); map[s.id] = s; });
      setSongs(map);
    });
    return unsub;
  }, []);

  // Timer countdown
  useEffect(() => {
    const endsAt = show?.voting?.endsAt;
    const active = show?.voting?.active;
    const paused = show?.voting?.paused;
    if (!active || !endsAt || paused) { setTimeLeft(null); return; }
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [show?.voting?.active, show?.voting?.endsAt, show?.voting?.paused]);

  async function castVote(songId) {
    if (!show?.voting?.active) return;
    const key = String(songId);
    const prev = myVote;
    if (prev === key) return;

    const updates = {};
    if (prev) updates[`voting.songVotes.${prev}`] = increment(-1);
    updates[`voting.songVotes.${key}`] = increment(1);

    await updateDoc(doc(db, "shows", showId), updates);
    localStorage.setItem(voteKey, key);
    setMyVote(key);
  }

  if (loading) return (
    <div style={{
      height: "100dvh", background: colors.bgPage, display: "flex",
      alignItems: "center", justifyContent: "center",
      color: colors.teal, fontFamily: "'Georgia', serif", fontSize: 14,
    }}>Loading…</div>
  );

  if (!show) return (
    <div style={{
      height: "100dvh", background: colors.bgPage, display: "flex",
      alignItems: "center", justifyContent: "center",
      color: colors.coral, fontFamily: "'Georgia', serif", fontSize: 14, padding: 24, textAlign: "center",
    }}>Show not found. Check your link.</div>
  );

  const voting = show.voting || {};
  const isActive = voting.active;
  const isPaused = voting.paused;
  const playedSet = new Set(show.playedSongIds || []);
  const votes = voting.songVotes || {};

  // Candidates = unplayed songs in the setlist
  const candidates = (show.songIds || [])
    .filter(id => !playedSet.has(id) && songs[id])
    .map(id => ({
      song: songs[id],
      id,
      count: votes[String(id)] || votes[id] || 0,
    }));

  // Sort by votes descending for display
  const sorted = [...candidates].sort((a, b) => b.count - a.count);
  const totalVotes = sorted.reduce((s, c) => s + c.count, 0);

  return (
    <div style={{
      minHeight: "100dvh", background: colors.bgPage, color: colors.textPrimary,
      fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        background: colors.bgHeader, borderBottom: `1px solid ${colors.borderMed}`,
        padding: "16px 20px", textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: colors.coral, fontWeight: "bold", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Sick Day with Ferris
        </div>
        <div style={{ fontSize: 18, color: colors.textPrimary, marginTop: 4 }}>{show.name}</div>
        {(show.date || show.venue) && (
          <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
            {[show.date, show.venue].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>

      {/* Voting status */}
      <div style={{
        padding: "14px 20px", textAlign: "center",
        background: isActive ? colors.bgVotingActive : colors.bgPanel,
        borderBottom: `1px solid ${colors.borderLight}`,
      }}>
        {isActive ? (
          <>
            <div style={{ fontSize: 13, color: isPaused ? colors.gold : colors.teal, letterSpacing: "0.1em" }}>
              {isPaused ? "⏸ Voting paused — hold tight!" : "🗳 Vote for the next song!"}
            </div>
            {!isPaused && timeLeft !== null && (
              <div style={{
                fontSize: 40, fontWeight: "bold", marginTop: 6,
                color: timeLeft <= 10 ? colors.coral : colors.teal,
                lineHeight: 1,
              }}>
                {fmtTime(timeLeft)}
              </div>
            )}
            {totalVotes > 0 && (
              <div style={{ fontSize: 11, color: colors.textDim, marginTop: 4 }}>
                {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: colors.textDim, fontStyle: "italic" }}>
            {candidates.length === 0
              ? "That's a wrap — thanks for coming out! 🎉"
              : "Voting is not open right now. Check back soon!"}
          </div>
        )}
      </div>

      {/* Song candidates */}
      <div style={{ flex: 1, padding: "12px 16px 40px" }}>
        {sorted.map(({ song, id, count }) => {
          const voted = myVote === String(id);
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

          return (
            <button
              key={id}
              onClick={() => castVote(id)}
              disabled={!isActive}
              style={{
                width: "100%", marginBottom: 10, padding: "14px 16px",
                background: voted ? colors.bgVotedCandidate : colors.bgCard,
                border: `2px solid ${voted ? colors.teal : isActive ? colors.borderMed : colors.borderLight}`,
                borderRadius: 8, cursor: isActive ? "pointer" : "default",
                textAlign: "left", fontFamily: "inherit", color: colors.textPrimary,
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Vote progress bar */}
              {totalVotes > 0 && (
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${pct}%`, background: voted ? colors.voteBarVoted : colors.voteBarUnvoted,
                  transition: "width 0.4s ease",
                }} />
              )}

              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, color: voted ? colors.teal : colors.textPrimary, fontWeight: voted ? "bold" : "normal" }}>
                    {song.title}
                    {voted && <span style={{ fontSize: 13, marginLeft: 8 }}>✓ your vote</span>}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {song.artist}{song.key ? ` · Key of ${song.key}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: "bold", color: voted ? colors.teal : colors.textPrimary }}>
                    {count > 0 ? count : ""}
                  </div>
                  {totalVotes > 0 && (
                    <div style={{ fontSize: 11, color: colors.textDim }}>{pct}%</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {!isActive && sorted.length > 0 && sorted[0].count > 0 && (
          <div style={{
            textAlign: "center", marginTop: 16, fontSize: 12, color: colors.teal, fontStyle: "italic",
          }}>
            {sorted[0].song.title} is leading with {sorted[0].count} votes
          </div>
        )}
      </div>

      <div style={{
        padding: "12px 20px", textAlign: "center",
        fontSize: 10, color: colors.textFaint,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      }}>
        SDWF SET LIST · djqpaz.github.io/SDWF-setlist
      </div>
    </div>
  );
}
