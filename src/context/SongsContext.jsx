import { createContext, useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { SONGS } from "../data/songs";

const SongsContext = createContext({ songs: [], loading: true });

export function SongsProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "songs"), async (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        SONGS.forEach(s => batch.set(doc(db, "songs", String(s.id)), s));
        await batch.commit();
        return;
      }
      const data = snapshot.docs.map(d => d.data());
      setSongs(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <SongsContext.Provider value={{ songs, loading }}>
      {children}
    </SongsContext.Provider>
  );
}

export function useSongs() {
  return useContext(SongsContext);
}
