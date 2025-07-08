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
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";

// Cambia si tu login está en otro lugar
const loginPage = "login.html";

// Verifica sesión y rellena datos
onAuthStateChanged(auth, user => {
    if (!user) {
        // No autenticado
        window.location.href = loginPage;
    } else if (!user.emailVerified) {
        // Opcional: sólo permitir usuarios con email verificado
        alert("Debes verificar tu correo electrónico antes de continuar.");
        signOut(auth).then(() => {
            window.location.href = loginPage;
        });
    } else {
        // Usuario autenticado: mostrar su info en el menú si existe
        const nameEl = document.getElementById("userName");
        const emailEl = document.getElementById("userEmail");
        if (nameEl) nameEl.textContent = user.displayName || "(Sin nombre)";
        if (emailEl) emailEl.textContent = user.email;
    }
});

// Cerrar sesión
window.logout = function () {
    signOut(auth)
        .then(() => {
            window.location.href = loginPage;
        })
        .catch(error => {
            console.error("Error al cerrar sesión:", error);
            alert("Hubo un error al cerrar sesión.");
        });
};
