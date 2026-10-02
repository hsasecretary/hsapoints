// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBGPykeTAsH474ZE-fievlA-kHalV5Huno",
  authDomain: "hsa-website-5d15a.firebaseapp.com",
  projectId: "hsa-website-5d15a",
  storageBucket: "hsa-website-5d15a.appspot.com",
  messagingSenderId: "651817857101",
  appId: "1:651817857101:web:bf12f08b82ea18d8dbac04",
  measurementId: "G-QDXNW4S6Q1"
};

// `npm run dev:emulator` runs against the local Auth and Firestore emulators
// (`npm run emulator:demo`, seeded by `npm run seed:demo`) instead of the live
// project, so test accounts and fake codes never touch real data.
const useEmulator = import.meta.env.MODE === "emulator";

// Initialize Firebase
const app = initializeApp(useEmulator ? { ...firebaseConfig, projectId: "demo-hsapoints" } : firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

if (useEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}