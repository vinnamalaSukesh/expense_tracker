import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// React Native's fetch/XHR implementation doesn't support the streaming
// transport Firestore's web SDK uses by default, which surfaces as
// "Failed to get document because the client is offline" even with a
// working connection. Long polling works around that.
export const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});
