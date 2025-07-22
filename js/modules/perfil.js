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

        // cuando el correo pierda foco, intenta cargar perfil
        correoInput.addEventListener("blur", () => {
            const correo = correoInput.value.trim();
            if (!correo) return;

            db.collection("usuarios").doc(correo).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    fotoInput.value = data.fotoPerfil || "";
                    nombreInput.value = data.nombreUsuario || "";
                    correoInput.value = data.correoUsuario || "";

                    if (data.fotoPerfil) {
                        previewFoto.src = data.fotoPerfil;
                    } else {
                        previewFoto.src = "https://via.placeholder.com/150";
                    }
                } else {
                    console.log("No existe perfil para este correo.");
                    fotoInput.value = "";
                    nombreInput.value = "";
                    previewFoto.src = "https://via.placeholder.com/150";
                }
            }).catch(error => {
                console.error("Error al obtener perfil: ", error);
            });
        });

        // cuando la URL de la foto cambie, actualiza preview
        fotoInput.addEventListener("input", () => {
            const url = fotoInput.value.trim();
            if (url) {
                previewFoto.src = url;
            } else {
                previewFoto.src = "https://via.placeholder.com/150";
            }
        });

        guardarBtn.addEventListener("click", () => {
            const foto = fotoInput.value.trim();
            const nombre = nombreInput.value.trim();
            const correo = correoInput.value.trim();

            if (!correo) {
                alert("El correo es obligatorio.");
                return;
            }

            db.collection("usuarios").doc(correo).set({
                fotoPerfil: foto,
                nombreUsuario: nombre,
                correoUsuario: correo
            }).then(() => {
                alert("Perfil guardado correctamente.");
            }).catch(error => {
                console.error("Error al guardar perfil: ", error);
                alert("Ocurrió un error al guardar.");
            });
        });
    }

    function initDashboard() {
        const avatar = document.getElementById("avatar");
        const userName = document.getElementById("userName");
        const userEmail = document.getElementById("userEmail");

        const correo = userEmail?.innerText?.trim();
        if (!correo) {
            console.warn("No se encontró correo en el dashboard.");
            return;
        }

        db.collection("usuarios").doc(correo).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data.fotoPerfil) avatar.src = data.fotoPerfil;
                if (data.nombreUsuario) userName.innerText = data.nombreUsuario;
                if (data.correoUsuario) userEmail.innerText = data.correoUsuario;
            }
        }).catch(error => {
            console.error("Error al cargar perfil en dashboard: ", error);
        });
    }
})();


//v1.2