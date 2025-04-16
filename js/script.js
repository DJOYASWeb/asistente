// LOGIN INICIO
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

  function isEmailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

function togglePassword() {
  const passwordInput = document.getElementById("password");
  const eyeIcon = document.getElementById("eyeIcon");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    eyeIcon.classList.remove("fa-eye");
    eyeIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    eyeIcon.classList.remove("fa-eye-slash");
    eyeIcon.classList.add("fa-eye");
  }
}

  function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const messageDiv = document.getElementById("message");

    // Limpiar mensajes anteriores
    messageDiv.textContent = "";
    messageDiv.className = "";

    // Validaciones antes de enviar
    if (email === "" || password === "") {
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
      .then((userCredential) => {
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
// LOGIN FIN



// DASHBOARD INICIO

function toggleSidebar() {
      document.getElementById("sidebar").classList.toggle("collapsed");
    }

    function toggleMobileSidebar() {
      document.getElementById("sidebar").classList.toggle("active");
      document.getElementById("overlay").classList.toggle("show");
    }

    function closeMobileSidebar() {
      document.getElementById("sidebar").classList.remove("active");
      document.getElementById("overlay").classList.remove("show");
    }

    function toggleDropdown() {
      document.getElementById("dropdown").classList.toggle("show");
    }

    function toggleTheme() {
      const body = document.body;
      const icon = document.getElementById("theme-icon");
      const label = document.querySelector(".switch-label");
      const isDark = body.getAttribute("data-theme") === "dark";
      body.setAttribute("data-theme", isDark ? "light" : "dark");
      icon.textContent = isDark ? "🌙" : "☀️";
      label.textContent = isDark ? "Modo oscuro" : "Modo claro";
    }

    function logout() {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "login.html";
    }

    window.onclick = function (e) {
      if (!e.target.closest('.profile-section')) {
        const dropdown = document.getElementById("dropdown");
        if (dropdown && dropdown.classList.contains("show")) {
          dropdown.classList.remove("show");
        }
      }
    }

// DASHBOARD FIN

// INSPIRA INICIO
// INSPIRA FIN

// TAREAS INICIO
// TAREAS FIN

// BLOG INICIO
// BLOG FIN
