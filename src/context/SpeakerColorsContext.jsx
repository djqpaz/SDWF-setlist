import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_SPEAKER_COLORS } from "../speakerColors";

const SpeakerColorsContext = createContext({
  speakerColors: DEFAULT_SPEAKER_COLORS,
  updateColor: () => {},
  resetColors: () => {},
});

export function SpeakerColorsProvider({ children }) {
  const [speakerColors, setSpeakerColors] = useState(DEFAULT_SPEAKER_COLORS);

  useEffect(() => {
    const ref = doc(db, "config", "speakerColors");
    return onSnapshot(ref, snap => {
      if (snap.exists()) {
        setSpeakerColors({ ...DEFAULT_SPEAKER_COLORS, ...snap.data() });
      }
    });
  }, []);

  async function updateColor(name, color) {
    await setDoc(doc(db, "config", "speakerColors"), { [name]: color }, { merge: true });
  }

  async function resetColors() {
    await setDoc(doc(db, "config", "speakerColors"), DEFAULT_SPEAKER_COLORS);
  }

  return (
    <SpeakerColorsContext.Provider value={{ speakerColors, updateColor, resetColors }}>
      {children}
    </SpeakerColorsContext.Provider>
  );
}

export function useSpeakerColors() {
  return useContext(SpeakerColorsContext);
}
