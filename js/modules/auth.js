// auth.js

// Configuración Firebase
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

// Validación de email
function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Mostrar/ocultar contraseña
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const eyeIcon = document.getElementById("eyeIcon");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    eyeIcon.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    passwordInput.type = "password";
    eyeIcon.classList.replace("fa-eye-slash", "fa-eye");
  }
}

// Iniciar sesión
function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const messageDiv = document.getElementById("message");

  messageDiv.textContent = "";
  messageDiv.className = "";

  if (!email || !password) {
    messageDiv.textContent = "Completa todos los campos.";
    messageDiv.className = "error";
    return;
  }

  if (!isEmailValid(email)) {
    messageDiv.textContent = "El correo no tiene un formato válido.";
    messageDiv.className = "error";
    return;
  }

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => {
      messageDiv.textContent = "Inicio de sesión exitoso.";
      messageDiv.className = "success";
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    })
    .catch((error) => {
      const errorCode = error.code;
      let userMessage = "Ha ocurrido un error.";

      if (errorCode === 'auth/wrong-password' || error.message.includes("INVALID_LOGIN_CREDENTIALS")) {
        userMessage = "Contraseña incorrecta.";
      } else if (errorCode === 'auth/user-not-found') {
        userMessage = "El usuario no existe.";
      } else if (errorCode === 'auth/invalid-email') {
        userMessage = "El correo no es válido.";
      }

      messageDiv.textContent = userMessage;
      messageDiv.className = "error";
    });
}
