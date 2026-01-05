import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';

export const useFirestore = (db, appId, collectionName, user) => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    if (!user) return;

    const col = collection(db, "artifacts", appId, "public", "data", collectionName);
    const unsubscribe = onSnapshot(
      query(col),
      snap => setData(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return unsubscribe;
  }, [db, appId, collectionName, user]);

  return data;
};
