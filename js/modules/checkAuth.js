// checkAuth.js — para versión clásica de Firebase (8.x)

// Escuchar cambios en la sesión
firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
        // No autenticado, redirigir al login
        window.location.href = "login.html";
    } else {
        // Usuario autenticado, mostrar su info en el menú si existe
        var nameEl = document.getElementById("userName");
        var emailEl = document.getElementById("userEmail");
        if (nameEl) nameEl.textContent = user.displayName || "(Sin nombre)";
        if (emailEl) emailEl.textContent = user.email;

        // Mostrar la página privada
        document.body.style.display = "block";
    }
});

// Logout seguro
window.logout = function () {
    firebase.auth().signOut()
        .then(function() {
            window.location.href = "login.html";
        })
        .catch(function(error) {
            console.error("Error al cerrar sesión:", error);
            alert("Error al cerrar sesión. Inténtalo de nuevo.");
        });
};
