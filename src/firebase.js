import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB4ZCM-WGSgGTZra0tuQ6WbZyMUfbt6BNU",
  authDomain: "sdwf-setlist.firebaseapp.com",
  projectId: "sdwf-setlist",
  storageBucket: "sdwf-setlist.firebasestorage.app",
  messagingSenderId: "153291273568",
  appId: "1:153291273568:web:9d9d928c130b5e74ff9a05"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
