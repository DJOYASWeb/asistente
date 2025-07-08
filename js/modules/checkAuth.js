import { auth } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";

// Cambia esto si tu página de login tiene otro nombre
const loginPage = "login.html";

onAuthStateChanged(auth, user => {
    if (!user) {
        // No autenticado
        window.location.href = loginPage;
    } else if (!user.emailVerified) {
        // Opcional: fuerza verificación de email
        alert("Debes verificar tu correo electrónico antes de continuar.");
        signOut(auth).then(() => {
            window.location.href = loginPage;
        });
    }
});


import { auth } from "./firebase-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";

// Esta función es llamada desde tu enlace en el HTML
window.logout = function () {
    signOut(auth)
        .then(() => {
            // Redirige al login después de cerrar sesión
            window.location.href = "login.html";
        })
        .catch((error) => {
            console.error("Error al cerrar sesión:", error);
            alert("Hubo un error al cerrar sesión. Intenta de nuevo.");
        });
}
