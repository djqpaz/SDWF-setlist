import { useState } from "react";
import { colors } from "../theme";

const BASE_URL = "https://djqpaz.github.io/SDWF-setlist";

export default function ShareModal({ show, onClose, onToast }) {
  const [copied, setCopied] = useState(false);
  if (!show) return null;

  const shareUrl = `${BASE_URL}/?setlist=${show.id}`;

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleOpen() {
    window.open(shareUrl, "_blank", "noopener");
  }

  function handleCopyText() {
    const { name, date, venue, songIds, suggestedBy } = show;
    const lines = [
      "SICK DAY WITH FERRIS",
      name,
      date && `Date: ${date}`,
      venue && `Venue: ${venue}`,
      suggestedBy && `Suggested by: ${suggestedBy}`,
      "",
      shareUrl,
    ].filter(l => l !== undefined).join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      onToast?.("Copied to clipboard ✓");
      onClose();
    });
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.bgPage, border: `1px solid ${colors.borderMed}`,
          borderRadius: 6, width: "min(440px, 95vw)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          fontFamily: "'Georgia', serif",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${colors.borderMed}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, color: colors.textMuted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
              Share Set List
            </div>
            <div style={{ fontSize: 16, color: colors.textPrimary }}>{show.name}</div>
            {(show.date || show.venue) && (
              <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>
                {[show.date, show.venue].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: colors.textMuted, cursor: "pointer",
            fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Share link */}
        <div style={{ padding: "20px 20px 8px" }}>
          <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Shareable link
          </div>
          <div style={{
            background: colors.bgPanel, border: `1px solid ${colors.borderMed}`,
            borderRadius: 4, padding: "10px 14px",
            fontSize: 12, color: colors.textSecondary, wordBreak: "break-all",
            fontFamily: "monospace",
          }}>
            {shareUrl}
          </div>
        </div>

        {/* Primary actions */}
        <div style={{ padding: "12px 20px", display: "flex", gap: 8 }}>
          <button onClick={handleOpen} style={{
            flex: 1, padding: "10px 0", background: "transparent",
            border: `1px solid ${colors.borderTeal}`, color: colors.teal,
            borderRadius: 4, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          }}>
            Open Page ↗
          </button>
          <button onClick={handleCopy} style={{
            flex: 1, padding: "10px 0", background: copied ? colors.teal : colors.coral,
            border: "none", color: colors.onAccent,
            borderRadius: 4, cursor: "pointer", fontSize: 13,
            fontFamily: "inherit", fontWeight: "bold",
            transition: "background 0.2s",
          }}>
            {copied ? "Copied ✓" : "Copy Link"}
          </button>
        </div>

        {/* Secondary */}
        <div style={{
          padding: "8px 20px 16px", borderTop: `1px solid ${colors.borderLight}`,
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button onClick={handleCopyText} style={{
            padding: "6px 14px", background: "transparent",
            border: `1px solid ${colors.borderMed}`, color: colors.textSecondary,
            borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
          }}>
            Copy as Text
          </button>
          <button onClick={() => window.print()} style={{
            padding: "6px 14px", background: "transparent",
            border: `1px solid ${colors.borderMed}`, color: colors.textSecondary,
            borderRadius: 4, cursor: "pointer", fontSize: 11, fontFamily: "inherit",
          }}>
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
