import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, RecaptchaVerifier } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBbGGhlWnPJm2BkwuGWXzpgqA0p233WrHE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sabquick-17da6.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sabquick-17da6",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sabquick-17da6.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "197455053731",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:197455053731:web:515a1022a23c4047061016",
};

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  const app = getFirebaseApp();
  return getAuth(app);
}

export function createRecaptchaVerifier(
  containerId: string,
  onSolved?: () => void,
  onExpired?: () => void
): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  return new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {
      if (onSolved) onSolved();
    },
    "expired-callback": () => {
      if (onExpired) onExpired();
    },
  });
}
