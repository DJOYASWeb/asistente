async function generarCodigo() {
    const idPS = document.getElementById('idPS').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();

    // Validar que todos los campos estén llenos
    if (!idPS || !nombre || !correo) {
        document.getElementById('output').textContent = "Por favor completa todos los campos antes de generar un código.";
        return;
    }

    if (generados.size >= maxCodigos) {
        document.getElementById('output').textContent = "Ya se generaron todos los códigos posibles.";
        return;
    }

    let intentos = 0;
    let codigo = null;

    while (intentos < 1000) { // Evitar bucles infinitos
        intentos++;
        const candidato = Math.floor(Math.random() * 100000).toString().padStart(5, '0');

        try {
            const docRef = window.db.collection("codigos-generados").doc(candidato);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                // Código no está en uso
                codigo = candidato;

                await docRef.set({
                    idPrestaShop: idPS,
                    nombre: nombre,
                    correo: correo,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                console.log(`Código ${codigo} guardado en Firestore`);
                break;
            }
            // Si existe, sigue buscando
        } catch (error) {
            console.error("Error consultando Firestore: ", error);
            document.getElementById('output').textContent = "Error al consultar Firestore. Intenta de nuevo.";
            return;
        }
    }

    if (!codigo) {
        document.getElementById('output').textContent = "No se pudo generar un código único. Intenta más tarde.";
        return;
    }

    generados.add(codigo);

    document.getElementById('output').textContent = `Código generado: ${codigo}`;

    // Añadir a la tabla
    const tbody = document.getElementById('tabla').querySelector('tbody');
    const fila = document.createElement('tr');
    fila.innerHTML = `
        <td>${idPS}</td>
        <td>${nombre}</td>
        <td>${correo}</td>
        <td>${codigo}</td>
    `;
    tbody.appendChild(fila);

    // Limpiar los campos del formulario
    document.getElementById('formulario').reset();
}

//upd v1.2