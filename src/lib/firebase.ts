
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOdqgE08YorcGOuHlTqOGdurx8G6B_gBQ",
  authDomain: "pila-alumni.firebaseapp.com",
  projectId: "pila-alumni",
  storageBucket: "pila-alumni.appspot.com",
  messagingSenderId: "581025728530",
  appId: "1:581025728530:web:cf8d1f8cabd142de56f0cb"
};


// Initialize Firebase
export function getFirebaseApp(): FirebaseApp {
    if (!getApps().length) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}
