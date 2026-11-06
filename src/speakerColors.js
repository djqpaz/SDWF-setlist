export const DEFAULT_SPEAKER_COLORS = {
  Brett:   "#f472b6",
  Spencer: "#60a5fa",
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
