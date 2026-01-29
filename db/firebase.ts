import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqXO7MJ3tX_ZOUKxG0T-KPEeSx7_uJF98",
  authDomain: "dyd-industries.firebaseapp.com",
  projectId: "dyd-industries",
  storageBucket: "dyd-industries.firebasestorage.app",
  messagingSenderId: "184402201207",
  appId: "1:184402201207:web:2f8f9a7a317b6b8820d472"
};

let remoteDb: Firestore | null = null;
let app: any = null;

try {
  // Safe initialization
  app = initializeApp(firebaseConfig);
  
  // Try to initialize Firestore
  // Note: getFirestore can sometimes fail in specific environments if app isn't ready
  remoteDb = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed. Running in Offline Mode.", error);
  // App will continue to work with local IndexedDB (Dexie)
  remoteDb = null;
}

export { remoteDb };