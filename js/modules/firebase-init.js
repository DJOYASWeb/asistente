// firebase-init.js
const firebaseConfig = {
  apiKey: "AIzaSyD6xqVEHb5eGrFr4cEu6y-OHxcpXjvybv4",
  authDomain: "djoyas-asistente.firebaseapp.com",
  projectId: "djoyas-asistente",
  storageBucket: "djoyas-asistente.firebasestorage.app",
  messagingSenderId: "990292345351",
  appId: "1:990292345351:web:72ae605299387fa31c20a2",
  measurementId: "G-9ZTSMFYFE1"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.db = firebase.firestore();