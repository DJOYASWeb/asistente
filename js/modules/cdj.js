const generados = new Set();
const maxCodigos = 100000;

cargarCodigosExistentes();


async function cargarCodigosExistentes() {
    try {
        const snapshot = await window.db.collection("codigos-generados").get();

        const tbody = document.getElementById('tabla').querySelector('tbody');

        snapshot.forEach(doc => {
            const data = doc.data();
            const codigo = doc.id;

            // Añadir a la tabla
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${data.idPrestaShop}</td>
                <td>${data.nombre}</td>
                <td>${data.correo}</td>
                <td>${codigo}</td>
            `;
            tbody.appendChild(fila);

            // Marcar código como ya usado
            generados.add(codigo);
        });

        console.log(`Cargados ${snapshot.size} códigos existentes.`);
    } catch (error) {
        console.error("Error cargando códigos existentes: ", error);
        document.getElementById('output').textContent = "Error al cargar códigos existentes. Intenta más tarde.";
    }
}


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

document.getElementById('exportarCSV').addEventListener('click', () => {
    exportarTablaAXLSX('codigos_generados.xlsx');
});

function exportarTablaAXLSX(nombreArchivo) {
    const tabla = document.getElementById('tabla');
    const ws = XLSX.utils.table_to_sheet(tabla);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Códigos");

    XLSX.writeFile(wb, nombreArchivo);
}

document.getElementById('btnCargaMasiva').addEventListener('click', () => {
    document.getElementById('modalCargaMasiva').style.display = 'block';
});

function cerrarModal() {
    document.getElementById('modalCargaMasiva').style.display = 'none';
}

document.getElementById('procesarCargaMasiva').addEventListener('click', () => {
    const archivo = document.getElementById('archivoMasivo').files[0];
    if (!archivo) {
        alert("Por favor selecciona un archivo.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const clientes = XLSX.utils.sheet_to_json(sheet);

        const tbody = document.getElementById('tabla').querySelector('tbody');

        const tareas = clientes.map(async (cliente, index) => {
            const idPS = (cliente['ID PrestaShop'] || cliente['id prestashop'] || '').trim();
            const nombre = (cliente['Nombre'] || cliente['nombre'] || '').trim();
            const correo = (cliente['Correo'] || cliente['correo'] || '').trim();

            if (!idPS || !nombre || !correo) {
                console.warn(`Cliente en fila ${index + 2} tiene datos incompletos, se omite.`);
                return;
            }

            let intentos = 0;
            let codigo = null;

            while (intentos < 1000) {
                intentos++;
                const candidato = Math.floor(Math.random() * 100000).toString().padStart(5, '0');

                if (generados.has(candidato)) continue;

                const docRef = window.db.collection("codigos-generados").doc(candidato);
                const docSnap = await docRef.get();

                if (!docSnap.exists) {
                    await docRef.set({
                        idPrestaShop: idPS,
                        nombre: nombre,
                        correo: correo,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    generados.add(candidato);

                    const fila = document.createElement('tr');
                    fila.innerHTML = `
                        <td>${idPS}</td>
                        <td>${nombre}</td>
                        <td>${correo}</td>
                        <td>${candidato}</td>
                    `;
                    tbody.appendChild(fila);

                    break;
                }
            }

            if (!codigo) {
                console.warn(`No se pudo generar un código único para cliente ${nombre}.`);
            }
        });

        await Promise.allSettled(tareas);

        alert("Carga masiva completada.");
        cerrarModal();
    };

    reader.readAsArrayBuffer(archivo);
});



//upd v1.8
