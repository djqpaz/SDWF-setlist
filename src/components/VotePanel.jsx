import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

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
        background: "#0d0d1c", border: "1px solid #282840",
        borderRadius: 10, padding: 28, textAlign: "center",
        maxWidth: 320, width: "90%",
      }}>
        <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
          Crowd Voting Link
        </div>
        <img src={qrSrc} alt="QR Code" style={{ width: 240, height: 240, borderRadius: 8, background: "white", padding: 8 }} />
        <div style={{
          marginTop: 14, fontSize: 11, color: "#5ecdc4",
          wordBreak: "break-all", lineHeight: 1.5,
        }}>{url}</div>
        <button
          onClick={() => navigator.clipboard?.writeText(url)}
          style={{
            marginTop: 12, padding: "8px 16px", background: "transparent",
            border: "1px solid #282840", color: "#888",
            borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
          }}
        >Copy Link</button>
        <div style={{ marginTop: 8 }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", background: "#f07272", border: "none",
            color: "#0d0d1c", borderRadius: 4, cursor: "pointer",
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
      background: isActive ? (isPaused ? "#1a1208" : "#0e1e14") : "#0e0e1e",
      border: `1px solid ${isActive ? (isPaused ? "#5a4010" : "#2a6040") : "#1e1e36"}`,
      borderRadius: 6,
    }}>
      {isActive ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: isPaused ? "#c8a040" : "#5ecdc4", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              {isPaused ? "⏸ Voting Paused" : "🗳 Voting Open"}
            </div>
            <div style={{
              fontSize: 28, fontWeight: "bold", lineHeight: 1.2, marginTop: 2,
              color: isPaused ? "#c8a040" : (timeLeft !== null && timeLeft <= 10 ? "#f07272" : "#5ecdc4"),
            }}>
              {isPaused
                ? fmtMs(voting.pausedRemaining)
                : (timeLeft !== null ? fmtTime(timeLeft) : "")
              }
            </div>
          </div>
          <button onClick={() => setShowQR(true)} style={{
            padding: "8px 12px", background: "transparent",
            border: `1px solid ${isPaused ? "#5a4010" : "#2a6040"}`, color: isPaused ? "#c8a040" : "#5ecdc4",
            borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
          }}>QR Code</button>
          {isPaused ? (
            <button onClick={onResume} style={{
              padding: "8px 14px", background: "#5ecdc4", border: "none",
              color: "#0d0d1c", borderRadius: 4, cursor: "pointer",
              fontSize: 12, fontFamily: "inherit", fontWeight: "bold",
            }}>▶ Resume</button>
          ) : (
            <button onClick={onPause} style={{
              padding: "8px 12px", background: "transparent",
              border: "1px solid #5a4010", color: "#c8a040",
              borderRadius: 4, cursor: "pointer", fontSize: 12, fontFamily: "inherit",
            }}>⏸ Pause</button>
          )}
          <button onClick={onClose} style={{
            padding: "8px 14px", background: "#f07272", border: "none",
            color: "#0d0d1c", borderRadius: 4, cursor: "pointer",
            fontSize: 12, fontFamily: "inherit", fontWeight: "bold",
          }}>Close Vote</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, color: "#888", flex: 1 }}>Let the crowd vote on the next song</div>
          <div style={{ display: "flex", gap: 4 }}>
            {TIMER_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setTimerSecs(opt.value)} style={{
                padding: "4px 8px", fontSize: 11, fontFamily: "inherit",
                background: timerSecs === opt.value ? "#18182c" : "transparent",
                border: `1px solid ${timerSecs === opt.value ? "#f07272" : "#282840"}`,
                color: timerSecs === opt.value ? "#f07272" : "#666",
                borderRadius: 3, cursor: "pointer",
              }}>{opt.label}</button>
            ))}
          </div>
          <button onClick={() => { onOpen(timerSecs); setShowQR(true); }} style={{
            padding: "8px 14px", background: "#5ecdc4", border: "none",
            color: "#0d0d1c", borderRadius: 4, cursor: "pointer",
            fontSize: 12, fontFamily: "inherit", fontWeight: "bold",
          }}>🗳 Open Vote</button>
        </div>
      )}
      {showQR && <QRModal url={voteUrl} onClose={() => setShowQR(false)} />}
    </div>
  );
}
