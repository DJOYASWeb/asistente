
let datosCargaPreliminar = []; 

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
    },
    order: [[1, 'desc']] // orden descendente por la columna Código generado
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


document.getElementById('exportarCSV').addEventListener('click', () => {
    const seleccionadas = Array.from(document.querySelectorAll('.selector-clienta:checked'));

    if (seleccionadas.length === 0) {
        mostrarNotificacion("No hay clientas seleccionadas para exportar", "alerta");
        return;
    }

    const csv = [];
    csv.push("Nombre,Correo,Código");

    seleccionadas.forEach(chk => {
        const fila = chk.closest('tr');
        const nombre = fila.cells[2].textContent.trim();
        const correo = fila.cells[3].textContent.trim();
        const codigo = fila.cells[4].textContent.trim();
        csv.push(`"${nombre}","${correo}","${codigo}"`);
    });

    const csvContent = csv.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "CargaBrevo_Clientas.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    mostrarNotificacion("Archivo CSV generado correctamente", "exito");
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
    link.download = "CargaWeb_Clientas.csv";
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



function inicializarEventosCarga() {
    // A. Detectar cuando seleccionan un archivo (Preview automática)
    document.getElementById('archivoMasivo')?.addEventListener('change', function(e) {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            
            // Convertir Excel a JSON
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
            
            if (jsonData.length === 0) {
                alert("El archivo está vacío.");
                return;
            }

            datosCargaPreliminar = jsonData; // Guardamos en la variable global
            renderizarPreview(jsonData);     // Llamamos a la función de dibujo
        };
        reader.readAsArrayBuffer(archivo);
    });

    // B. Detectar clic en el botón "Confirmar"
    document.getElementById('btnConfirmarCarga')?.addEventListener('click', ejecutarCargaDefinitiva);
}

function renderizarPreview(datos) {
    const thead = document.querySelector('#tablaPreviewCarga thead');
    const tbody = document.querySelector('#tablaPreviewCarga tbody');
    const estado = document.getElementById('estadoCarga');
    const btnConfirmar = document.getElementById('btnConfirmarCarga');
    const msgVacio = document.getElementById('mensajeVacioPreview');

    thead.innerHTML = "";
    tbody.innerHTML = "";
    
    if (datos.length > 0) {
        // Ocultar mensaje de "vacío"
        if(msgVacio) msgVacio.style.display = "none";
        
        // 1. Generar Encabezados Dinámicos
        const columnas = Object.keys(datos[0]);
        let headerHTML = "<tr>";
        columnas.forEach(col => headerHTML += `<th>${col}</th>`);
        headerHTML += "</tr>";
        thead.innerHTML = headerHTML;

        // 2. Generar Filas (Mostramos solo las primeras 50 para rapidez)
        const limite = Math.min(datos.length, 50);
        datos.slice(0, limite).forEach(fila => {
            let rowHTML = "<tr>";
            columnas.forEach(col => {
                rowHTML += `<td>${fila[col] !== undefined ? fila[col] : ''}</td>`;
            });
            rowHTML += "</tr>";
            
            // Convertir string a nodo DOM y agregar
            const template = document.createElement('template');
            template.innerHTML = rowHTML.trim();
            tbody.appendChild(template.content.firstChild);
        });

        // 3. Actualizar estado visual
        if(estado) {
            estado.textContent = `✅ ${datos.length} filas detectadas`;
            estado.className = "badge bg-success";
        }
        if(btnConfirmar) btnConfirmar.disabled = false;
    }
}

async function ejecutarCargaDefinitiva() {
    // 1. Elementos de la Interfaz de Usuario
    const btn = document.getElementById('btnConfirmarCarga');
    const contenedorBarra = document.getElementById('contenedorProgreso');
    const barra = document.getElementById('barraProgreso');
    const txtEstado = document.getElementById('textoEstadoProgreso');
    const txtPorcentaje = document.getElementById('porcentajeProgreso');

    // 2. Validaciones de disponibilidad de códigos
    if (generados.size === 0) await cargarCodigosExistentes();
    let pool = generarPoolDeCodigosDisponibles();

    if (pool.length < datosCargaPreliminar.length) {
        mostrarNotificacion(`❌ Error: Solo quedan ${pool.length} códigos disponibles para ${datosCargaPreliminar.length} clientes.`, "error");
        return;
    }

    if (!confirm(`¿Confirmas la carga masiva de ${datosCargaPreliminar.length} clientes?`)) return;

    // 3. Preparar UI para el proceso
    btn.disabled = true;
    btn.style.display = "none";
    contenedorBarra.style.display = "block";

    let procesados = 0;
    let errores = 0;
    const total = datosCargaPreliminar.length;
    
    // Configuración de lotes (Batches) de Firebase
    let batch = window.db.batch();
    let contadorBatch = 0;

    // 4. Bucle de procesamiento
    for (let i = 0; i < total; i++) {
        const fila = datosCargaPreliminar[i];

        // Función interna para encontrar columnas por palabras clave
        const encontrarValor = (keywords) => {
            const key = Object.keys(fila).find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
            return key ? String(fila[key]).trim() : "";
        };

        // Extraer datos según las columnas de tu Excel
        const idPS = encontrarValor(['id', 'prestashop', 'código', 'codigo']);
        const nombre = encontrarValor(['nombre', 'cliente', 'name', 'full name']);
        const correo = encontrarValor(['correo', 'mail', 'email']);

        // Validar datos mínimos obligatorios
        if (!idPS || !nombre) {
            console.error("Fila incompleta omitida:", fila);
            errores++;
            continue;
        }

        // Asignar Código Aleatorio del Pool
        const randomIndex = Math.floor(Math.random() * pool.length);
        const codigoAsignado = pool[randomIndex];
        pool.splice(randomIndex, 1);
        generados.add(codigoAsignado);

        // Preparar la operación en el batch
        const docRef = window.db.collection("codigos-generados").doc(codigoAsignado);
        batch.set(docRef, {
            idPrestaShop: idPS,
            nombre: nombre,
            correo: correo || "Sin correo",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        procesados++;
        contadorBatch++;

        // Si llegamos a 500 registros o al final, ejecutamos el batch
        if (contadorBatch === 500 || i === total - 1) {
            try {
                await batch.commit();
                
                // Actualizar progreso visual
                const porcentaje = Math.round(((i + 1) / total) * 100);
                barra.style.width = `${porcentaje}%`;
                txtPorcentaje.textContent = `${porcentaje}%`;
                txtEstado.textContent = `Guardados ${i + 1} de ${total}...`;
                
                // Reiniciar batch para el siguiente grupo
                batch = window.db.batch();
                contadorBatch = 0;
            } catch (error) {
                console.error("Error al ejecutar batch:", error);
                errores += contadorBatch;
            }
        }
    }

    // 5. Finalización y Limpieza
    txtEstado.textContent = "¡Proceso finalizado con éxito!";
    barra.className = "progress-bar bg-success";
    
    await new Promise(r => setTimeout(r, 1000));

    alert(`✅ Carga Completa.\n\n- Clientes registrados: ${procesados}\n- Errores u omitidos: ${errores}`);
    
    cerrarModalCargaMasiva();
    
    // Restaurar UI original
    contenedorBarra.style.display = "none";
    barra.style.width = "0%";
    btn.style.display = "inline-block";
    btn.disabled = false;
    
    // Refrescar la tabla principal para ver los nuevos datos
    refrescarContenidos();
}

window.cerrarModalCargaMasiva = function() {
    document.getElementById('modalCargaMasiva').style.display = 'none';
    
    // Limpieza de datos
    document.getElementById('archivoMasivo').value = '';
    document.getElementById('tablaPreviewCarga').querySelector('tbody').innerHTML = '';
    document.getElementById('mensajeVacioPreview').style.display = 'block';
    document.getElementById('btnConfirmarCarga').disabled = true;
    document.getElementById('estadoCarga').textContent = "Esperando archivo...";
    document.getElementById('estadoCarga').className = "badge bg-secondary";
    
    datosCargaPreliminar = []; // Vaciar memoria
};


/* =========================================================
   UTILIDAD: DESCARGAR PLANTILLA DE EJEMPLO
   ========================================================= */
window.descargarPlantillaEjemplo = function() {
    // 1. Datos de ejemplo
    const datosEjemplo = [
        {
            "ID PrestaShop": "1050",
            "Nombre": "Ejemplo Juan Pérez",
            "Correo": "juan.perez@email.com"
        },
        {
            "ID PrestaShop": "2040",
            "Nombre": "Ejemplo María López",
            "Correo": "maria.lopez@email.com"
        }
    ];

    // 2. Crear hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(datosEjemplo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Clientes");

    // 3. Descargar archivo
    XLSX.writeFile(wb, "Plantilla_Carga_Masiva.xlsx");
};





/* =========================================================
   LÓGICA DE CARGA MASIVA (PRODUCTOS) - VERSIÓN CORREGIDA
   ========================================================= */

let datosCargadosTemporalmente = []; 

// 1. Abrir Modal
window.abrirModalCarga = function() {
    const modal = document.getElementById("modalCargaMasiva");
    if(!modal) { alert("Error: No encuentro el modal en el HTML"); return; }
    
    modal.style.display = "flex";
    
    // Resetear todo
    document.getElementById("inputFileCarga").value = "";
    document.getElementById("headPrevisualizacion").innerHTML = "";
    document.getElementById("bodyPrevisualizacion").innerHTML = "";
    document.getElementById("msgInicial").style.display = "block";
    document.getElementById("infoCarga").textContent = "Esperando archivo...";
    document.getElementById("infoCarga").className = "badge badge-secondary p-2";
    document.getElementById("btnConfirmarCarga").disabled = true;
    datosCargadosTemporalmente = [];
};

window.cerrarModalCarga = function() {
    const modal = document.getElementById("modalCargaMasiva");
    if(modal) modal.style.display = "none";
};

// 2. DETECTAR CARGA DE ARCHIVO
// Usamos DOMContentLoaded para asegurar que el input exista
document.addEventListener("DOMContentLoaded", function() {
    
    const input = document.getElementById("inputFileCarga");
    if (!input) {
        console.warn("Aviso: No se encontró el input 'inputFileCarga'. Si estás en otra página, ignora esto.");
        return;
    }

    input.addEventListener("change", function(e) {
        // Validación: ¿Existe la librería?
        if (typeof XLSX === 'undefined') {
            alert("❌ ERROR CRÍTICO: No se cargó la librería SheetJS (XLSX). \n\nAsegúrate de incluir el <script src='...xlsx.full.min.js'> en tu HTML.");
            return;
        }

        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Leemos la primera hoja
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                
                // Convertimos a JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (jsonData.length === 0) {
                    alert("⚠️ El archivo Excel está vacío o no se pudo leer.");
                    return;
                }

                // ¡Éxito!
                datosCargadosTemporalmente = jsonData;
                renderizarTablaPrevia(jsonData);

            } catch (err) {
                console.error(err);
                alert("❌ Error al leer el Excel. Revisa la consola para más detalles.");
            }
        };
        reader.readAsArrayBuffer(file);
    });
});

// 3. DIBUJAR TABLA (Preview)
function renderizarTablaPrevia(data) {
    const thead = document.getElementById("headPrevisualizacion");
    const tbody = document.getElementById("bodyPrevisualizacion");
    const info = document.getElementById("infoCarga");
    const btn = document.getElementById("btnConfirmarCarga");
    const msg = document.getElementById("msgInicial");

    // Limpiar
    thead.innerHTML = "";
    tbody.innerHTML = "";
    if(msg) msg.style.display = "none";

    // Columnas
    const columnas = Object.keys(data[0]);
    let htmlHead = "<tr>";
    columnas.forEach(col => htmlHead += `<th class="bg-dark text-white" style="position:sticky; top:0;">${col}</th>`);
    htmlHead += "</tr>";
    thead.innerHTML = htmlHead;

    // Filas (Solo mostramos las primeras 100 para que sea rápido)
    const mostrar = data.slice(0, 100);
    mostrar.forEach(row => {
        let tr = "<tr>";
        columnas.forEach(col => {
            tr += `<td style="white-space:nowrap; max-width:200px; overflow:hidden; text-overflow:ellipsis;">${row[col]}</td>`;
        });
        tr += "</tr>";
        tbody.innerHTML += tr;
    });

    // Actualizar UI
    info.textContent = `✅ ${data.length} productos detectados`;
    info.className = "badge badge-success p-2";
    btn.disabled = false;
}

// 4. PROCESAR CARGA FINAL
window.procesarCargaFinal = function() {
    if (datosCargadosTemporalmente.length === 0) return;

    if(!confirm(`¿Confirmas la importación de ${datosCargadosTemporalmente.length} registros?`)) return;

    // AQUI VA TU LÓGICA DE GUARDADO EN BASE DE DATOS
    console.log("Guardando datos...", datosCargadosTemporalmente);
    
    alert(`✅ ¡Proceso Iniciado! \nSe están procesando ${datosCargadosTemporalmente.length} productos.\n(Revisa la consola para ver los datos raw)`);
    
    cerrarModalCarga();
};






// upd v1
