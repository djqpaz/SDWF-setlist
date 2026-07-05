import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { colors } from "../theme";

const TIMER_OPTIONS = [
  { label: "30 sec", value: 30 },
  { label: "1 min",  value: 60 },
  { label: "90 sec", value: 90 },
  { label: "2 min",  value: 120 },
];

function QRModal({ url, onClose }) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Georgia', serif",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: colors.bgPage, border: `1px solid ${colors.borderMed}`,
        borderRadius: 10, padding: 28, textAlign: "center",
        maxWidth: 320, width: "90%",
      }}>
        <div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
          Crowd Voting Link
        </div>
        <img src={qrSrc} alt="QR Code" style={{ width: 240, height: 240, borderRadius: 8, background: "white", padding: 8 }} />
        <div style={{
          marginTop: 14, fontSize: 11, color: colors.teal,
          wordBreak: "break-all", lineHeight: 1.5,
        }}>{url}</div>
        <button
          onClick={() => navigator.clipboard?.writeText(url)}
          style={{
            marginTop: 12, padding: "8px 16px", background: "transparent",
            border: `1px solid ${colors.borderMed}`, color: colors.textMuted,
            borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
          }}
        >Copy Link</button>
        <div style={{ marginTop: 8 }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", background: colors.coral, border: "none",
            color: colors.onAccent, borderRadius: 4, cursor: "pointer",
            fontSize: 12, fontFamily: "inherit", fontWeight: "bold",
          }}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function VotePanel({ show, onOpen, onClose, onPause, onResume }) {
  const [timerSecs, setTimerSecs] = useState(60);
  const [showQR, setShowQR] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const voting = show?.voting || {};
  const isActive = voting.active;
  const isPaused = voting.paused;
  const voteUrl = `${window.location.origin}${window.location.pathname}?vote=${show?.id}`;

  useEffect(() => {
    if (!isActive || !voting.endsAt || isPaused) { setTimeLeft(null); return; }
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((voting.endsAt - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [isActive, voting.endsAt, isPaused]);

  function fmtTime(s) {
    if (s === null) return "";
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function fmtMs(ms) {
    if (!ms && ms !== 0) return "";
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <div style={{
      margin: "8px 12px", padding: "12px 14px",
      background: isActive ? (isPaused ? colors.bgVotingPaused : colors.bgVotingActive) : colors.bgPanel,
      border: `1px solid ${isActive ? (isPaused ? colors.borderGold : colors.borderGreen) : colors.borderMed}`,
      borderRadius: 6,
    }}>
      {isActive ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: isPaused ? colors.gold : colors.teal, letterSpacing: "0.15em", textTransform: "uppercase" }}>
              {isPaused ? "⏸ Voting Paused" : "🗳 Voting Open"}
            </div>
            <div style={{
              fontSize: 28, fontWeight: "bold", lineHeight: 1.2, marginTop: 2,
              color: isPaused ? colors.gold : (timeLeft !== null && timeLeft <= 10 ? colors.coral : colors.teal),
            }}>
              {isPaused
                ? fmtMs(voting.pausedRemaining)
                : (timeLeft !== null ? fmtTime(timeLeft) : "")
              }
            </div>
          </div>
          <button onClick={() => setShowQR(true)} style={{
            padding: "8px 12px", background: "transparent",
            border: `1px solid ${isPaused ? colors.borderGold : colors.borderGreen}`, color: isPaused ? colors.gold : colors.teal,
            borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
          }}>QR Code</button>
          {isPaused ? (
            <button onClick={onResume} style={{
              padding: "8px 14px", background: colors.teal, border: "none",
              color: colors.onAccent, borderRadius: 4, cursor: "pointer",
              fontSize: 12, fontFamily: "inherit", fontWeight: "bold",
            }}>▶ Resume</button>
          ) : (
            <button onClick={onPause} style={{
              padding: "8px 12px", background: "transparent",
              border: `1px solid ${colors.borderGold}`, color: colors.gold,
              borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
            }}>⏸ Pause</button>
          )}
          <button onClick={onClose} style={{
            padding: "8px 14px", background: colors.coral, border: "none",
            color: colors.onAccent, borderRadius: 4, cursor: "pointer",
            fontSize: 12, fontFamily: "inherit", fontWeight: "bold",
          }}>Close Vote</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, color: colors.textMuted, flex: 1 }}>Let the crowd vote on the next song</div>
          <div style={{ display: "flex", gap: 4 }}>
            {TIMER_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setTimerSecs(opt.value)} style={{
                padding: "4px 8px", fontSize: 11, fontFamily: "inherit",
                background: timerSecs === opt.value ? colors.bgInput : "transparent",
                border: `1px solid ${timerSecs === opt.value ? colors.coral : colors.borderMed}`,
                color: timerSecs === opt.value ? colors.coral : colors.textDim,
                borderRadius: 3, cursor: "pointer",
              }}>{opt.label}</button>
            ))}
          </div>
          <button onClick={() => { onOpen(timerSecs); setShowQR(true); }} style={{
            padding: "8px 14px", background: colors.teal, border: "none",
            color: colors.onAccent, borderRadius: 4, cursor: "pointer",
            fontSize: 12, fontFamily: "inherit", fontWeight: "bold",
          }}>🗳 Open Vote</button>
        </div>
      )}
      {showQR && <QRModal url={voteUrl} onClose={() => setShowQR(false)} />}
    </div>
  );
}
