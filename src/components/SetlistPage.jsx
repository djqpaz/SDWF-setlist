import { useEffect, useState } from "react";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db } from "../firebase";
import { colors } from "../theme";

export default function SetlistPage({ showId }) {
  const [show, setShow] = useState(null);
  const [songs, setSongs] = useState({});
  const [loading, setLoading] = useState(true);

  // Override global overflow:hidden so this page can scroll
  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.getElementById("root").style.overflow = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.getElementById("root").style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "shows", showId), snap => {
      if (snap.exists()) setShow({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return unsub;
  }, [showId]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "songs"), snap => {
      const map = {};
      snap.forEach(d => { map[d.id] = d.data(); map[String(d.data().id)] = d.data(); });
      setSongs(map);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: colors.bgPage, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: colors.textDim, fontFamily: "'Georgia', serif", fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  if (!show) {
    return (
      <div style={{ minHeight: "100dvh", background: colors.bgPage, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: colors.textDim, fontFamily: "'Georgia', serif", fontSize: 13 }}>Set list not found.</div>
      </div>
    );
  }

  const { name, date, venue, songIds = [], suggestedBy } = show;
  const songList = songIds.map(id => songs[String(id)] || songs[id]).filter(Boolean);

  return (
    <div style={{
      minHeight: "100dvh", background: colors.bgPage, color: colors.textPrimary,
      fontFamily: "'Georgia', serif",
    }}>
      {/* Header */}
      <div style={{
        background: colors.bgHeader, borderBottom: `1px solid ${colors.borderMed}`,
        padding: "20px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: colors.coral, fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Sick Day with Ferris
        </div>
        <div style={{ fontSize: 22, color: colors.textPrimary, marginTop: 6, fontWeight: "bold" }}>{name}</div>
        {(date || venue) && (
          <div style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>
            {[date, venue].filter(Boolean).join(" · ")}
          </div>
        )}
        {suggestedBy && (
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
            Suggested by {suggestedBy}
          </div>
        )}
      </div>

      {/* Song list */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 20px 48px" }}>
        <div style={{ fontSize: 10, color: colors.textDim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
          {songList.length} songs
        </div>

        {songList.map((song, i) => (
          <div key={song.id ?? i} style={{
            display: "flex", gap: 16, padding: "12px 0",
            borderBottom: `1px solid ${colors.borderLight}`,
            alignItems: "flex-start",
          }}>
            <div style={{
              color: colors.textDim, fontSize: 12, minWidth: 28, textAlign: "right",
              fontVariantNumeric: "tabular-nums", paddingTop: 2,
            }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, color: colors.textPrimary }}>{song.title}</div>
              <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{song.artist}</div>
            </div>
            {song.key && (
              <div style={{ fontSize: 11, color: colors.textDim, alignSelf: "center", flexShrink: 0 }}>
                {song.key}
              </div>
            )}
          </div>
        ))}

        <div style={{ textAlign: "center", marginTop: 32, fontSize: 11, color: colors.textDim, letterSpacing: "0.1em" }}>
          SICK DAY WITH FERRIS
        </div>
      </div>
    </div>
  );
}
