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
