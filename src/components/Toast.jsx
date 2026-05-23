import { useEffect } from "react";

export function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  const isError = type === "error";
  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      background: isError ? "#2a1010" : "#101e1a",
      border: `1px solid ${isError ? "#f07272" : "#5ecdc4"}`,
      color: isError ? "#f07272" : "#5ecdc4",
      padding: "10px 20px", borderRadius: 8, fontSize: 13,
      zIndex: 9999, whiteSpace: "nowrap",
      boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
      fontFamily: "'Georgia', serif",
      animation: "fadeSlideIn 0.2s ease",
    }}>
      {message}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Georgia', serif",
    }}>
      <div style={{
        background: "#141428", border: "1px solid #282840",
        borderRadius: 8, padding: "24px 20px", maxWidth: 300, width: "90%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
      }}>
        <div style={{ fontSize: 14, color: "#e0dcd0", marginBottom: 20, lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "10px", background: "transparent",
            border: "1px solid #282840", color: "#888",
            borderRadius: 4, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "10px", background: "#f07272",
            border: "none", color: "#0d0d1c",
            borderRadius: 4, cursor: "pointer", fontSize: 13,
            fontFamily: "inherit", fontWeight: "bold",
          }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
