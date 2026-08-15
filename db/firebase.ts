import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth, browserLocalPersistence, setPersistence } from "firebase/auth";

// Firebase's client config is not a secret (it's public by design — access is
// governed by Firestore/Storage security rules, not by hiding this object).
const firebaseConfig = {
  apiKey: "AIzaSyAqXO7MJ3tX_ZOUKxG0T-KPEeSx7_uJF98",
  authDomain: "dyd-industries.firebaseapp.com",
  projectId: "dyd-industries",
  storageBucket: "dyd-industries.firebasestorage.app",
  messagingSenderId: "184402201207",
  appId: "1:184402201207:web:2f8f9a7a317b6b8820d472"
};

let remoteDb: Firestore | null = null;
let auth: Auth | null = null;
let app: FirebaseApp | null = null;

try {
  app = initializeApp(firebaseConfig);
  remoteDb = getFirestore(app);
  auth = getAuth(app);
  // Keep the session cached locally so login survives offline/refresh, matching
  // the app's offline-first design (only the initial sign-in needs connectivity).
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Firebase Auth persistence setup failed.", error);
  });
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed. Running in Offline Mode.", error);
  // App will continue to work with local IndexedDB (Dexie), but login requires
  // Firebase Auth, so authentication will be unavailable until connectivity returns.
  remoteDb = null;
  auth = null;
}

export { remoteDb, auth };