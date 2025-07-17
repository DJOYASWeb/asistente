const generados = new Set();
const maxCodigos = 100000;

function generarCodigo() {
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

    let codigo;
    do {
        codigo = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    } while (generados.has(codigo));

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

    // Guardar en Firestore
    window.db.collection("codigos-generados").add({
        idPrestaShop: idPS,
        nombre: nombre,
        correo: correo,
        codigo: codigo,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log("Código guardado en Firestore");
    })
    .catch((error) => {
        console.error("Error al guardar en Firestore: ", error);
    });

    // Limpiar los campos del formulario
    document.getElementById('formulario').reset();
}

//upd v1