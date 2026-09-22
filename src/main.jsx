import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { SongsProvider } from "./context/SongsContext.jsx";
import VotePage from "./components/VotePage.jsx";
import SetlistPage from "./components/SetlistPage.jsx";

// Reset styles
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body { background: #0e0e12; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
  select option { background: #1a1a24; }
`;
document.head.appendChild(style);

const params = new URLSearchParams(window.location.search);
const voteId = params.get("vote");
const setlistId = params.get("setlist");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {voteId ? (
      <VotePage showId={voteId} />
    ) : setlistId ? (
      <SetlistPage showId={setlistId} />
    ) : (
      <SongsProvider>
        <App />
      </SongsProvider>
    )}
  </React.StrictMode>
);
