firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
        // No autenticado
        window.location.href = "login.html";
    } else if (!user.emailVerified) {
        alert("Debes verificar tu correo electrónico antes de continuar.");
        firebase.auth().signOut().then(function() {
            window.location.href = "login.html";
        });
    } else {
        // Usuario autenticado: mostrar su info
        var nameEl = document.getElementById("userName");
        var emailEl = document.getElementById("userEmail");
        if (nameEl) nameEl.textContent = user.displayName || "(Sin nombre)";
        if (emailEl) emailEl.textContent = user.email;

        // Ya puedes mostrar el contenido
        document.body.style.display = "flex";
    }
});


// Logout
window.logout = function () {
    firebase.auth().signOut().then(function() {
        window.location.href = "login.html";
    }).catch(function(error) {
        console.error("Error al cerrar sesión:", error);
        alert("Hubo un error al cerrar sesión.");
    });
};
