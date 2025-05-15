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

function showTab(tab) {
  const tabs = ['crear', 'editar', 'revisar']; // ajusta según tus secciones reales
  tabs.forEach(t => {
    const section = document.getElementById(t);
    const btn = document.getElementById(`btn${capitalize(t)}`);
    if (section) section.classList.toggle('d-none', t !== tab);
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
