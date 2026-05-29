import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, increment, collection } from "firebase/firestore";
import { db } from "../firebase";

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
      height: "100dvh", background: "#0d0d1c", display: "flex",
      alignItems: "center", justifyContent: "center",
      color: "#5ecdc4", fontFamily: "'Georgia', serif", fontSize: 14,
    }}>Loading…</div>
  );

  if (!show) return (
    <div style={{
      height: "100dvh", background: "#0d0d1c", display: "flex",
      alignItems: "center", justifyContent: "center",
      color: "#f07272", fontFamily: "'Georgia', serif", fontSize: 14, padding: 24, textAlign: "center",
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
      minHeight: "100dvh", background: "#0d0d1c", color: "#e0dcd0",
      fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        background: "#09091a", borderBottom: "1px solid #1e1e36",
        padding: "16px 20px", textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: "#f07272", fontWeight: "bold", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Sick Day with Ferris
        </div>
        <div style={{ fontSize: 18, color: "#e0dcd0", marginTop: 4 }}>{show.name}</div>
        {(show.date || show.venue) && (
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
            {[show.date, show.venue].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>

      {/* Voting status */}
      <div style={{
        padding: "14px 20px", textAlign: "center",
        background: isActive ? "#0a1a10" : "#0e0e1e",
        borderBottom: "1px solid #1a1a2e",
      }}>
        {isActive ? (
          <>
            <div style={{ fontSize: 13, color: isPaused ? "#c8a040" : "#5ecdc4", letterSpacing: "0.1em" }}>
              {isPaused ? "⏸ Voting paused — hold tight!" : "🗳 Vote for the next song!"}
            </div>
            {!isPaused && timeLeft !== null && (
              <div style={{
                fontSize: 40, fontWeight: "bold", marginTop: 6,
                color: timeLeft <= 10 ? "#f07272" : "#5ecdc4",
                lineHeight: 1,
              }}>
                {fmtTime(timeLeft)}
              </div>
            )}
            {totalVotes > 0 && (
              <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                {totalVotes} vote{totalVotes !== 1 ? "s" : ""} cast
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#666", fontStyle: "italic" }}>
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
                background: voted ? "#0e2018" : "#141428",
                border: `2px solid ${voted ? "#5ecdc4" : isActive ? "#282840" : "#1a1a2e"}`,
                borderRadius: 8, cursor: isActive ? "pointer" : "default",
                textAlign: "left", fontFamily: "inherit", color: "#e0dcd0",
                position: "relative", overflow: "hidden",
              }}
            >
              {/* Vote progress bar */}
              {totalVotes > 0 && (
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${pct}%`, background: voted ? "#5ecdc420" : "#ffffff08",
                  transition: "width 0.4s ease",
                }} />
              )}

              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, color: voted ? "#5ecdc4" : "#e0dcd0", fontWeight: voted ? "bold" : "normal" }}>
                    {song.title}
                    {voted && <span style={{ fontSize: 13, marginLeft: 8 }}>✓ your vote</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                    {song.artist}{song.key ? ` · Key of ${song.key}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: "bold", color: voted ? "#5ecdc4" : "#e0dcd0" }}>
                    {count > 0 ? count : ""}
                  </div>
                  {totalVotes > 0 && (
                    <div style={{ fontSize: 11, color: "#666" }}>{pct}%</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {!isActive && sorted.length > 0 && sorted[0].count > 0 && (
          <div style={{
            textAlign: "center", marginTop: 16, fontSize: 12, color: "#5ecdc4", fontStyle: "italic",
          }}>
            {sorted[0].song.title} is leading with {sorted[0].count} votes
          </div>
        )}
      </div>

      <div style={{
        padding: "12px 20px", textAlign: "center",
        fontSize: 10, color: "#333",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      }}>
        SDWF SET LIST · djqpaz.github.io/SDWF-setlist
      </div>
    </div>
  );
}
