import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const CameronBitsContext = createContext({ bits: [], loading: true });

export function CameronBitsProvider({ children }) {
  const [bits, setBits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cameronBits"), (snapshot) => {
      setBits(snapshot.docs.map(d => d.data()));
      setLoading(false);
    }, (err) => {
      console.error("Cameron Bits listener failed:", err);
    });
    return unsub;
  }, []);

  return (
    <CameronBitsContext.Provider value={{ bits, loading }}>
      {children}
    </CameronBitsContext.Provider>
  );
}

export function useCameronBits() {
  return useContext(CameronBitsContext);
}
