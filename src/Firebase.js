import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 👈 Add this
import { getStorage,ref} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: "first-project-2b259.firebaseapp.com",
  projectId: "first-project-2b259",
  storageBucket: "first-project-2b259.firebasestorage.app",
  messagingSenderId: "186595344534",
  appId: "1:186595344534:web:e6c052f8a3c00c8a0e42b7",
  measurementId: "G-KG4E3BH502",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // 👈 Add this line
const storage = getStorage(app);
// Create a storage reference from our storage service
const storageRef = ref(storage);

export { db, auth, storageRef }; // 👈 Export it
