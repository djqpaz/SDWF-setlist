export const DEFAULT_SPEAKER_COLORS = {
  Brett:   "#60a5fa",
  Spencer: "#f472b6",
  Kenny:   "#4ade80",
  John:    "#fb923c",
  Chris:   "#c084fc",
  Matt:    "#f87171",
  Dave:    "#2dd4bf",
  All:     "#e2e8f0",
};

export function speakerColor(name, colorMap) {
  return (colorMap || DEFAULT_SPEAKER_COLORS)[name] || "#8888aa";
}

// Parse a script line and return { text, color, dim }
// Handles: "NAME: dialogue", "[LX: cue]", "(stage direction)", "*note*"
export function parseScriptLine(line, colorMap) {
  const colors = colorMap || DEFAULT_SPEAKER_COLORS;

  // Speaker dialogue: "NAME:" or "NAME NAME:" at start of line
  const speakerMatch = line.match(/^([A-Z][A-Z ]+?):\s*(.*)/);
  if (speakerMatch) {
    const rawName = speakerMatch[1].trim();
    // Find case-insensitive match in color map
    const key = Object.keys(colors).find(k => k.toUpperCase() === rawName);
    if (key) return { text: line, color: colors[key], dim: false };
    // LX / stage cues written as "LX:" at line start
    if (rawName === "LX") return { text: line, color: "#f4c542", dim: false };
  }

  // LX cue in brackets: [LX: ...] or [lx: ...]
  if (/^\[LX:/i.test(line)) return { text: line, color: "#f4c542", dim: false };

  // Stage direction in parens: (...)
  if (/^\(.*\)\s*$/.test(line)) return { text: line, color: "#555577", dim: true };

  // Italic/bold stage direction: *...* or **...**
  if (/^\*{1,2}[^*].*\*{1,2}\s*$/.test(line)) return { text: line, color: "#555577", dim: true };

  // Plain text
  return { text: line, color: null, dim: false };
}
