// js/modules/perfil.js

(function () {
    const path = window.location.pathname;

    if (path.includes("configuracion.html")) {
        initConfiguracion();
    } else if (path.includes("dashboard.html")) {
        initDashboard();
    }

    function initConfiguracion() {
        const fotoInput = document.getElementById("fotoPerfil");
        const nombreInput = document.getElementById("nombreUsuario");
        const correoInput = document.getElementById("correoUsuario");
        const previewFoto = document.getElementById("previewFoto");
        const guardarBtn = document.getElementById("guardarPerfilBtn");

        const correo = prompt("Ingresa tu correo para cargar tu perfil:");
        if (!correo) return;

        correoInput.value = correo;

        db.collection("usuarios").doc(correo).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                fotoInput.value = data.fotoPerfil || "";
                nombreInput.value = data.nombreUsuario || "";
                correoInput.value = data.correoUsuario || "";

                if (data.fotoPerfil) {
                    previewFoto.src = data.fotoPerfil;
                    previewFoto.style.display = "block";
                }
            }
        });

        fotoInput.addEventListener("input", () => {
            const url = fotoInput.value;
            if (url) {
                previewFoto.src = url;
                previewFoto.style.display = "block";
            } else {
                previewFoto.style.display = "none";
            }
        });

        guardarBtn.addEventListener("click", () => {
            const foto = fotoInput.value;
            const nombre = nombreInput.value;
            const correo = correoInput.value;

            if (!correo) {
                alert("Correo es obligatorio");
                return;
            }

            db.collection("usuarios").doc(correo).set({
                fotoPerfil: foto,
                nombreUsuario: nombre,
                correoUsuario: correo
            }).then(() => {
                alert("Perfil guardado en Firebase.");
            }).catch(error => {
                console.error("Error al guardar: ", error);
                alert("Ocurrió un error al guardar.");
            });
        });
    }

    function initDashboard() {
        const avatar = document.getElementById("avatar");
        const userName = document.getElementById("userName");
        const userEmail = document.getElementById("userEmail");

        const correo = prompt("Ingresa tu correo para cargar tu perfil:");
        if (!correo) return;

        db.collection("usuarios").doc(correo).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data.fotoPerfil) avatar.src = data.fotoPerfil;
                if (data.nombreUsuario) userName.innerText = data.nombreUsuario;
                if (data.correoUsuario) userEmail.innerText = data.correoUsuario;
            }
        }).catch(error => {
            console.error("Error al cargar perfil: ", error);
        });
    }

})();

//v1