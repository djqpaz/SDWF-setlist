import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { SongsProvider } from "./context/SongsContext.jsx";
import VotePage from "./components/VotePage.jsx";
import SetlistPage from "./components/SetlistPage.jsx";
import ChartsPage from "./components/ChartsPage.jsx";
import PrompterPage from "./components/PrompterPage.jsx";

// Google Fonts — Poppins (headings) + Inter (body), matches sickdaywithferris.com
const gfLink = document.createElement("link");
gfLink.rel = "stylesheet";
gfLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap";
document.head.appendChild(gfLink);

// Reset styles
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; font-family: 'Inter', sans-serif; }
  body { background: #1a1a2e; }
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
const chartsId = params.get("charts");
const prompterId = params.get("prompter");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {voteId ? (
      <VotePage showId={voteId} />
    ) : setlistId ? (
      <SetlistPage showId={setlistId} />
    ) : chartsId ? (
      <ChartsPage showId={chartsId} />
    ) : prompterId ? (
      <PrompterPage showId={prompterId} />
    ) : (
      <SongsProvider>
        <App />
      </SongsProvider>
    )}
  </React.StrictMode>
);
