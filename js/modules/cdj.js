const generados = new Set();
const maxCodigos = 10000;

cargarCodigosExistentes();

async function cargarCodigosExistentes() {
    try {
        const snapshot = await window.db.collection("codigos-generados").get();

        const tbody = document.getElementById('tabla').querySelector('tbody');

        snapshot.forEach(doc => {
            const data = doc.data();
            const codigo = doc.id;

            const fila = document.createElement('tr');
       fila.innerHTML = `
    <td><input type="checkbox" class="selector-clienta" data-codigo="${codigo}"></td>
    <td>${data.idPrestaShop}</td>
    <td>${data.nombre}</td>
    <td>${data.correo}</td>
    <td>${codigo}</td>
    <td>
        <button class="btn" onclick="editarCliente('${codigo}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn" onclick="confirmarEliminarClienta('${codigo}')"><i class="fa-solid fa-trash-can"></i></button>
    </td>
`;
            tbody.appendChild(fila);

            generados.add(codigo);
        });

        console.log(`Cargados ${snapshot.size} códigos existentes.`);

        // Inicializar DataTable
        $('#tabla').DataTable({
            language: {
                url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
            }
        });
    } catch (error) {
        console.error("Error cargando códigos existentes: ", error);
        document.getElementById('output').textContent = "Error al cargar códigos existentes. Intenta más tarde.";
    }
}

function generarPoolDeCodigosDisponibles() {
    const pool = [];
    for (let i = 1000; i < maxCodigos; i++) {
        const codigo = i.toString();
        if (!generados.has(codigo)) {
            pool.push(codigo);
        }
    }
    return pool;
}

async function generarCodigo() {
    const idPS = document.getElementById('idPS').value.trim();
    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();

    if (!idPS || !nombre || !correo) {
        mostrarNotificacion("Por favor completa todos los campos antes de generar un código.", "alerta");
        return;
    }

    if (generados.size >= (maxCodigos - 1000)) {
        mostrarNotificacion("Ya se generaron todos los códigos posibles.", "alerta");
        return;
    }

    const pool = generarPoolDeCodigosDisponibles();
    const indiceAleatorio = Math.floor(Math.random() * pool.length);
    const codigo = pool[indiceAleatorio];

    try {
        await window.db.collection("codigos-generados").doc(codigo).set({
            idPrestaShop: idPS,
            nombre: nombre,
            correo: correo,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        generados.add(codigo);

        const tbody = document.getElementById('tabla').querySelector('tbody');
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${idPS}</td>
            <td>${nombre}</td>
            <td>${correo}</td>
            <td>${codigo}</td>
              <td>
        <button class="btn" onclick="editarCliente('${codigo}')"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn" onclick="confirmarEliminarClienta('${codigo}')"><i class="fa-solid fa-trash-can"></i></button>
    </td>
        `;
        tbody.appendChild(fila);

        document.getElementById('formularioNuevaClienta').reset();
        cerrarModalNuevaClienta();

        // Notificación de éxito
        mostrarNotificacion(`Clienta ${nombre} registrada con código ${codigo}`, "exito");

    } catch (err) {
        console.error("Error guardando en Firestore: ", err);
        mostrarNotificacion("Error al guardar en Firestore.", "error");
    }
}


// ✅ Nueva función de exportación usando DataTables
document.getElementById('exportarCSV').addEventListener('click', () => {
    exportarTablaAXLSX('codigos_generados.xlsx');
});

function exportarTablaAXLSX(nombreArchivo) {
    const dataTable = $('#tabla').DataTable();
    const datos = dataTable.rows().data(); // incluye todas las filas

    const hoja = [
        ['ID PrestaShop', 'Nombre', 'Correo', 'Código generado']
    ];

    for (let i = 0; i < datos.length; i++) {
        hoja.push([
            datos[i][1],
            datos[i][2],
            datos[i][3],
            datos[i][4]
        ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(hoja);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Códigos");
    XLSX.writeFile(wb, nombreArchivo);
}

document.getElementById('btnCargaMasiva').addEventListener('click', () => {
    document.getElementById('modalCargaMasiva').style.display = 'flex';
});

function cerrarModalCargaMasiva() {
    const modal = document.getElementById('modalCargaMasiva');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('archivoMasivo').value = '';
    }
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

        const pool = generarPoolDeCodigosDisponibles();
        if (pool.length < clientes.length) {
            alert("No hay suficientes códigos disponibles para todos los clientes.");
            return;
        }

        const dataTable = $('#tabla').DataTable();

        for (let index = 0; index < clientes.length; index++) {
            const cliente = clientes[index];

            const idPS = String(cliente['ID PrestaShop'] || cliente['id prestashop'] || '').trim();
            const nombre = String(cliente['Nombre'] || cliente['nombre'] || '').trim();
            const correo = String(cliente['Correo'] || cliente['correo'] || '').trim();

            if (!idPS || !nombre || !correo) {
                console.warn(`Cliente en fila ${index + 2} tiene datos incompletos, se omite.`);
                continue;
            }

            const indiceAleatorio = Math.floor(Math.random() * pool.length);
            const codigo = pool[indiceAleatorio];
            pool.splice(indiceAleatorio, 1);

            try {
                await window.db.collection("codigos-generados").doc(codigo).set({
                    idPrestaShop: idPS,
                    nombre: nombre,
                    correo: correo,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                generados.add(codigo);

                dataTable.row.add([
                    idPS, nombre, correo, codigo
                ]).draw();

                console.log(`Clienta registrado con código`);

            } catch (err) {
                console.error(`Error guardando clienta con código`, err);
            }
        }

        alert("Carga masiva completada.");
        cerrarModalCargaMasiva();
    };

    reader.readAsArrayBuffer(archivo);
});

function abrirModalNuevaClienta() {
    const modal = document.getElementById('modalNuevaClienta');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalNuevaClienta() {
    const modal = document.getElementById('modalNuevaClienta');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('formularioNuevaClienta').reset();
        document.getElementById('output').textContent = "";
    }
}

function abrirModalEstadisticas() {
    const modal = document.getElementById('modalEstadisticas');
    if (modal) {
        const totalPosibles = maxCodigos - 1000;
        const usados = generados.size;
        const restantes = totalPosibles - usados;

        document.getElementById('totalGenerados').textContent = usados;
        document.getElementById('totalRestantes').textContent = restantes;

        modal.style.display = 'flex';
    }
}

function cerrarModalEstadisticas() {
    const modal = document.getElementById('modalEstadisticas');
    if (modal) modal.style.display = 'none';
}


//modalpresta

function abrirModalPresta() {
    const modal = document.getElementById('modalPresta');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function cerrarModalPresta() {
    const modal = document.getElementById('modalPresta');
    if (modal) modal.style.display = 'none';
}

//modalpresta






async function eliminarCliente(codigo) {
    try {
        await window.db.collection("codigos-generados").doc(codigo).delete();
        mostrarNotificacion(`Cliente con código ${codigo} eliminado`, "exito");

        // Quitar la fila de la tabla
        const filas = document.querySelectorAll('#tabla tbody tr');
        filas.forEach(fila => {
            if (fila.cells[3].textContent === codigo) {
                fila.remove();
            }
        });

    } catch (err) {
        console.error("Error eliminando cliente: ", err);
        mostrarNotificacion("Error al eliminar cliente", "error");
    }
}


async function editarCliente(codigo) {
    try {
        const docRef = await window.db.collection("codigos-generados").doc(codigo).get();
        if (!docRef.exists) {
            mostrarNotificacion("No se encontró la clienta", "error");
            return;
        }

        const data = docRef.data();

        document.getElementById('editarCodigo').value = codigo;
        document.getElementById('editarIdPS').value = data.idPrestaShop;
        document.getElementById('editarNombre').value = data.nombre;
        document.getElementById('editarCorreo').value = data.correo;

        document.getElementById('modalEditarClienta').style.display = 'flex';
    } catch (err) {
        console.error("Error cargando datos para edición: ", err);
        mostrarNotificacion("Error al cargar datos", "error");
    }
}

function cerrarModalEditarClienta() {
    document.getElementById('modalEditarClienta').style.display = 'none';
    document.getElementById('formularioEditarClienta').reset();
}

async function guardarEdicionClienta() {
    const codigo = document.getElementById('editarCodigo').value;
    const idPS = document.getElementById('editarIdPS').value.trim();
    const nombre = document.getElementById('editarNombre').value.trim();
    const correo = document.getElementById('editarCorreo').value.trim();

    if (!idPS || !nombre || !correo) {
        mostrarNotificacion("Completa todos los campos", "alerta");
        return;
    }

    try {
        await window.db.collection("codigos-generados").doc(codigo).update({
            idPrestaShop: idPS,
            nombre: nombre,
            correo: correo
        });

        mostrarNotificacion(`Clienta ${nombre} actualizada`, "exito");

        // Actualiza la fila en la tabla
        const filas = document.querySelectorAll('#tabla tbody tr');
        filas.forEach(fila => {
            if (fila.cells[3].textContent === codigo) {
                fila.cells[0].textContent = idPS;
                fila.cells[1].textContent = nombre;
                fila.cells[2].textContent = correo;
            }
        });

        cerrarModalEditarClienta();

    } catch (err) {
        console.error("Error al guardar cambios: ", err);
        mostrarNotificacion("Error al guardar cambios", "error");
    }
}


let codigoParaEliminar = null;

function confirmarEliminarClienta(codigo) {
    console.log("confirmarEliminarClienta llamado con:", codigo);
    if (!codigo) {
        mostrarNotificacion("Código no válido para eliminar", "alerta");
        return;
    }

    codigoParaEliminar = codigo;

    const modal = document.getElementById('modalConfirmarEliminarClienta');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function cerrarModalEliminarClienta() {
    const modal = document.getElementById('modalConfirmarEliminarClienta');
    if (modal) {
        modal.style.display = 'none';
    }
    codigoParaEliminar = null;
}

async function eliminarClienteConfirmado() {
    console.log("eliminarClienteConfirmado con:", codigoParaEliminar);

    if (!codigoParaEliminar) {
        mostrarNotificacion("No se seleccionó ninguna clienta", "alerta");
        cerrarModalEliminarClienta();
        return;
    }

    try {
        await window.db.collection("codigos-generados").doc(codigoParaEliminar).delete();

        mostrarNotificacion(`Clienta ${codigoParaEliminar} eliminada`, "exito");

        // Quitar la fila de la tabla
        const filas = document.querySelectorAll('#tabla tbody tr');
        filas.forEach(fila => {
            if (fila.cells[3].textContent.trim() === codigoParaEliminar) {
                fila.remove();
            }
        });

    } catch (err) {
        console.error("Error eliminando clienta:", err);
        mostrarNotificacion("Error al eliminar clienta", "error");
    }

    cerrarModalEliminarClienta();
}

function refrescarContenidos() {
    const tbody = document.getElementById('tabla').querySelector('tbody');
    tbody.innerHTML = ""; // limpia las filas actuales
    $('#tabla').DataTable().clear().destroy(); // destruye el DataTable actual
    cargarCodigosExistentes(); // vuelve a cargar
}


document.getElementById('exportarClientas').addEventListener('click', () => {
    const seleccionadas = Array.from(document.querySelectorAll('.selector-clienta:checked'));
    if (seleccionadas.length === 0) {
        mostrarNotificacion("No hay clientas seleccionadas para exportar", "alerta");
        return;
    }

    const csv = [];
    csv.push("id_customer;ape_customer");

    seleccionadas.forEach(chk => {
        const fila = chk.closest('tr');
        const idPS = fila.cells[1].textContent.trim();   // columna 1: ID PrestaShop
        const codigo = fila.cells[4].textContent.trim(); // columna 4: Código generado

        csv.push(`${idPS};${codigo}`);
    });

    const csvContent = csv.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "clientas_seleccionadas.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarNotificacion("Archivo CSV generado correctamente", "exito");
});


document.addEventListener('change', (e) => {
    if (e.target.classList.contains('selector-clienta')) {
        const fila = e.target.closest('tr');
        if (e.target.checked) {
            fila.classList.add('fila-seleccionada');
        } else {
            fila.classList.remove('fila-seleccionada');
        }
    }
});


// upd v7
