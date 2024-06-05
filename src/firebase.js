// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";// TODO: Add SDKs for Firebase products that you want to use
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);