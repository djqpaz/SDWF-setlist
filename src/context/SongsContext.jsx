import { createContext, useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { SONGS } from "../data/songs";

const SongsContext = createContext({ songs: [], loading: true });

const seedMap = Object.fromEntries(SONGS.map(s => [String(s.id), s]));

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

      // Migrate any songs missing key or duration
      const needsUpdate = snapshot.docs.filter(d => {
        const data = d.data();
        return !data.key || !data.duration;
      });
      if (needsUpdate.length > 0) {
        const batch = writeBatch(db);
        needsUpdate.forEach(d => {
          const seed = seedMap[d.id];
          if (seed) {
            const updates = {};
            if (!d.data().key) updates.key = seed.key;
            if (!d.data().duration) updates.duration = seed.duration;
            batch.update(doc(db, "songs", d.id), updates);
          }
        });
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
