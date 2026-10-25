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
        SONGS.forEach(s => batch.set(doc(db, "songs", String(s.id)), s, { merge: true }));
        await batch.commit();
        return;
      }

      // Seed any songs in the local list not yet in Firestore
      const existingIds = new Set(snapshot.docs.map(d => d.id));
      const missingSongs = SONGS.filter(s => !existingIds.has(String(s.id)));
      if (missingSongs.length > 0) {
        const batch = writeBatch(db);
        missingSongs.forEach(s => batch.set(doc(db, "songs", String(s.id)), s, { merge: true }));
        await batch.commit();
        return;
      }

      // Migrate any songs missing fields added since initial seed.
      // Only migrate songs that have a seed entry — custom songs with no seed
      // are left alone to avoid an unresolvable migration loop.
      const needsUpdate = snapshot.docs.filter(d => {
        const data = d.data();
        const seed = seedMap[d.id];
        if (!seed) return false;
        if (!data.key || !data.duration) return true;
        if (seed.powerRanking !== undefined && data.powerRanking === undefined) return true;
        if (seed.note && data.note === undefined) return true;
        return false;
      });
      if (needsUpdate.length > 0) {
        const batch = writeBatch(db);
        needsUpdate.forEach(d => {
          const seed = seedMap[d.id];
          const updates = {};
          if (!d.data().key) updates.key = seed.key;
          if (!d.data().duration) updates.duration = seed.duration;
          if (seed.powerRanking !== undefined && d.data().powerRanking === undefined) updates.powerRanking = seed.powerRanking;
          if (seed.note && !d.data().note) updates.note = seed.note;
          batch.update(doc(db, "songs", d.id), updates);
        });
        await batch.commit();
        return;
      }

      const data = snapshot.docs.map(d => d.data());
      setSongs(data);
      setLoading(false);
    }, (err) => {
      console.error("Songs listener failed:", err);
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
