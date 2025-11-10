// firebase-init.js

// Configuración de tu proyecto Firebase
var firebaseConfig = {
  apiKey: "AIzaSyD6xqVEHb5eGrFr4cEu6y-OHxcpXjvybv4",
  authDomain: "djoyas-asistente.firebaseapp.com",
  projectId: "djoyas-asistente",
  storageBucket: "djoyas-asistente.appspot.com",
  messagingSenderId: "990292345351",
  appId: "1:990292345351:web:72ae605299387fa31c20a2",
  measurementId: "G-9ZTSMFYFE1"
};

// ✅ Inicializa Firebase solo una vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ✅ Inicializa los servicios y los expone globalmente
window.db = firebase.firestore();
window.storage = firebase.storage();
