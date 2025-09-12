// blog-admin.js

let datosTabla = [];
let filaAEliminar = null;

// 🔷 Función adaptada de blog-redactor.js para devolver el HTML como string
function slugify(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function aplicarNegritaUltimaFraseConDosPuntos(texto) {
  const match = texto.match(/^(.*?:)(\s*)(.*)$/);
  return match ? `<b>${match[1]}</b> ${match[3]}` : texto;
}

function convertirTextoABlogHtml(input) {
  const lineas = input.trim().split(/\n/);
  let html = '<section class="blog-container">\n';
  let contenido = '';
  let secciones = [];
  let bloqueIndice = '';
  let buffer = [];
  let enLista = false;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    if (enLista) {
      contenido += '<ul class="texto-blog">\n';
      buffer.forEach(line => {
        const limpio = line.replace(/^\s*-?\s*/, '- ');
        contenido += `<li>${aplicarNegritaUltimaFraseConDosPuntos(limpio)}</li>\n`;
      });
      contenido += '</ul>\n';
    } else {
      buffer.forEach(line => {
        contenido += `<p class="texto-blog">${aplicarNegritaUltimaFraseConDosPuntos(line)}</p>\n`;
      });
    }
    buffer = [];
    enLista = false;
  };

  lineas.forEach(linea => {
    linea = linea.trim();
    if (!linea) {
      flushBuffer();
      return;
    }

    const h2Match = linea.match(/^(\d+)\.\s+(.*)/);
    const h3Match = linea.match(/^(\d+\.\d+)\s+(.*)/);

    if (h3Match) {
      flushBuffer();
      const id = slugify(h3Match[2]);
      contenido += `<h3 id="${id}" class="blog-h3">${h3Match[1]} ${h3Match[2]}</h3>\n`;
      return;
    }

    if (h2Match) {
      flushBuffer();
      const id = slugify(h2Match[2]);
      const tituloCompleto = `${h2Match[1]}. ${h2Match[2]}`;
      secciones.push({ id, titulo: tituloCompleto });
      contenido += `<h2 id="${id}" class="blog-h2"><span class="blog-h2">${h2Match[1]}. </span>${h2Match[2]}</h2>\n`;
      return;
    }

    if (/^-\s*[^\s]/.test(linea)) {
      if (!enLista) flushBuffer();
      enLista = true;
      buffer.push(linea);
    } else {
      flushBuffer();
      buffer.push(linea);
    }
  });

  flushBuffer();

  if (secciones.length > 0) {
    bloqueIndice += '<section class="indice">\n<h2 class="blog-h3">Índice de Contenidos</h2>\n<ul class="texto-blog">\n';
    secciones.forEach(sec => {
      bloqueIndice += `<li><a href="#${sec.id}">${sec.titulo}</a></li>\n`;
    });
    bloqueIndice += '</ul>\n</section>\n';
  }

  const contenidoPartido = contenido.split('</p>\n');
  if (contenidoPartido.length >= 2) {
    contenido = contenidoPartido.slice(0, 2).join('</p>\n') + '</p>\n' + bloqueIndice + contenidoPartido.slice(2).join('</p>\n');
  }

  html += contenido + '</section>';
  return html.trim();
}

firebase.auth().onAuthStateChanged(user => {
  if (user) cargarDatosDesdeFirestore();
  else showIosModal("⚠️ Sin acceso", "Debes iniciar sesión para ver los blogs.");
});

async function cargarDatosDesdeFirestore() {
  const db = firebase.firestore();
  const snap = await db.collection("blogs").get();

  datosTabla = snap.docs.map(doc => {
    const data = doc.data() || {};

    // Detecta si 'fecha' viene en ISO y la convierte a display
    let fechaUi = "";
    if (data.fecha) {
      fechaUi = /^\d{4}-\d{2}-\d{2}$/.test(data.fecha)
        ? fechaFromIsoToDisplay(data.fecha)
        : data.fecha; // ya viene como DD/MM/YYYY
    } else if (data.fechaIso) {
      fechaUi = fechaFromIsoToDisplay(data.fechaIso);
    }

    const fechaIso = data.fechaIso || normalizeFecha(data.fecha || "").fechaIso || "";

    return {
      id: data.id || doc.id,
      docId: doc.id,
      nombre: data.nombre || "",
      estado: data.estado || "",
      blog: data.blog || "",
      meta: data.meta || "",
      fecha: fechaUi,       // lo que muestra la tabla (DD/MM/YYYY)
      fechaIso: fechaIso,   // para el editor (YYYY-MM-DD)
      categoria: data.categoria || ""
    };
  });

  renderizarTabla();
}



function renderizarTabla() {
  const tbody = document.querySelector('#tablaDatos tbody');
  tbody.innerHTML = '';

  datosTabla.forEach((dato, index) => {
    // ID robusto: usa el campo `id` si existe; si no, usa `docId` (doc.id de Firestore)
    const id = (dato.id && String(dato.id).trim()) || (dato.docId && String(dato.docId).trim()) || "";

    const fila = document.createElement('tr');
    if (id) fila.dataset.docId = id; // ← para confirmarEliminarFila(this)

    // Contenido recortado para vista
    const blogPreview = (dato.blog || '').toString();
    const blogShort = blogPreview.length > 160 ? blogPreview.slice(0, 160) + '…' : blogPreview;

    fila.innerHTML = `
      <td class="celda-id">${id}</td>
      <td class="celda-nombre">${dato.nombre || ''}</td>
      <td class="celda-estado">${dato.estado || ''}</td>
      <td class="celda-blog">${blogShort}</td>
      <td class="celda-meta">${dato.meta || ''}</td>
      <td class="celda-fecha">${dato.fecha || ''}</td>
      <td class="celda-categoria">${dato.categoria || ''}</td>
      <td>
        <button class="btn p-0 mx-1" onclick="editarFila(${index})">✏️</button>
        <button class="btn btn-sm p-0" data-id="${id}" onclick="confirmarEliminarFila(this)">🗑️</button>
      </td>
    `;
    tbody.appendChild(fila);
  });
}


function abrirModalAgregarDato() {
  document.getElementById('modalAgregarDato').style.display = 'flex';
}

function cerrarModalAgregarDato() {
  document.getElementById('modalAgregarDato').style.display = 'none';
}

function limpiarFormulario() {
  ['nuevoId', 'nuevoNombre', 'nuevoEstado', 'nuevoBlog', 'nuevoBlogHtml', 'nuevoMeta', 'nuevaFecha', 'nuevaCategoria']
    .forEach(id => document.getElementById(id).value = '');
}

async function agregarNuevoDato() {
  const id = document.getElementById('nuevoId').value.trim();
  const nombre = document.getElementById('nuevoNombre').value.trim();
  const estado = document.getElementById('nuevoEstado').value.trim();
  const blog = document.getElementById('nuevoBlog').value.trim();
  const blogHtml = document.getElementById('nuevoBlogHtml').value.trim();
  const meta = document.getElementById('nuevoMeta').value.trim();
  const fecha = document.getElementById('nuevaFecha').value.trim();
  const categoria = document.getElementById('nuevaCategoria').value.trim();
  const fechaRaw = document.getElementById('nuevaFecha')?.value; // puede venir "2025-06-02" (input date) o manual
const norm = normalizeFecha(fechaRaw);

  if (!id || !nombre || !estado || !blog || !meta || !fecha || !categoria) {
mostrarNotificacion("⚠️ Completa todos los campos.", "alerta");
    return;
  }

  const nuevoDato = { id, nombre, estado, blog, blogHtml, meta, fecha, categoria, creadoEn: firebase.firestore.FieldValue.serverTimestamp() };

  try {
    await firebase.firestore().collection('blogs').doc(id).set(nuevoDato);
    datosTabla.push(nuevoDato);
    renderizarTabla();
    cerrarModalAgregarDato();
    limpiarFormulario();
    mostrarNotificacion("✅ Blog agregado correctamente", "exito");
  } catch {
  mostrarNotificacion("❌ Error al guardar en Firestore.", "error");
  }
  await db.collection("blogs").doc(/* tu id o auto */).set(doc, { merge: true });
}

function editarFila(index) {
  const dato = datosTabla[index];
  const modal = document.createElement('div');
  modal.id = 'modalEditarDato';
  modal.className = 'modal-editar-blog';
  modal.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex;';

  modal.innerHTML = `
    <div class="contenido-modal" style="background:white; padding:4rem; border-radius:16px; width:90%; max-width:60%; margin:auto; position:relative;">
      <button class="btn-close position-absolute end-0 top-0 m-4" onclick="cerrarModalEditarDato()"></button>
      <h5 class="mb-4">✏️ Editar Blog</h5>
      <input type="hidden" id="editIndex" value="${index}">

      <div class="row">
        <div class="col-lg-6 col-12">
<span>ID de Blog</span>
          <input type="text" id="editId" class="form-control mb-2" value="${dato.id}" readonly>
<span>Nombre de Blog</span>
          <input type="text" id="editNombre" class="form-control mb-2" value="${dato.nombre}">
          <span>Estado de Blog</span>
          <select id="editEstado" class="form-control mb-2">
            <option ${dato.estado === 'transcrito' ? 'selected' : ''}>transcrito</option>
            <option ${dato.estado === 'pendiente' ? 'selected' : ''}>pendiente</option>
            <option ${dato.estado === 'reescribir' ? 'selected' : ''}>reescribir</option>
          </select>
           <span>Fecha de Blog</span>   
       <input type="date" id="editFecha" class="form-control mb-2" value="${dato.fechaIso || normalizeFecha(dato.fecha || '').fechaIso || ''}">

          <span>Categoría</span>
  <select id="editCategoria" class="form-control mb-3">
      <option value="">Selecciona categoría</option>
      <option value="Tips">Tips</option>
      <option value="Emprendimiento">Emprendimiento</option>
      <option value="Sabías que?">Sabías que?</option>
      <option value="Beneficios">Beneficios</option>
      <option value="Tendencias">Tendencias</option>
      <option value="Cuidado y Mantenimiento">Cuidado y Mantenimiento</option>
      <option value="Sustentable">Sustentable</option>
      <option value="Innovación">Innovación</option>
    </select>
              <span>Meta Descripción</span>
           <textarea id="editMeta" class="form-control mb-2">${dato.meta}</textarea>
        </div>
        <div class="col-lg-6 col-12">
        <span>Contenido de Blog </span>
          <textarea id="editBlog" class="form-control mb-2">${dato.blog}</textarea>
          <span>Contenido de Blog (HTML generado)</span>
          <textarea id="editBlogHtml" class="form-control mb-2">${dato.blogHtml || ''}</textarea>
          <button class="btn btn-secondary my-2" onclick="convertirEditBlogHtml()">✨ Convertir a HTML</button>
          <button class="btn btn-outline-primary btn-sm my-2" id="btnCopiarBlog" type="button" >📋 Copiar HTML</button>
        </div>
      </div>

      <button class="btn btn-primary w-100 mt-4" onclick="guardarEdicionFila()">Guardar cambios</button>
    </div>
  `;

  document.body.appendChild(modal);

const selectCat = modal.querySelector('#editCategoria');
if (dato.categoria) {
  selectCat.value = dato.categoria.trim();
  // Fallback: si no existe la opción, agregarla y marcarla
  if (selectCat.value !== dato.categoria.trim()) {
    const opt = document.createElement('option');
    opt.value = dato.categoria.trim();
    opt.textContent = dato.categoria.trim();
    opt.selected = true;
    selectCat.appendChild(opt);
  }
}

}

function cerrarModalEditarDato() {
  const modal = document.getElementById('modalEditarDato');
  if (modal) modal.remove();
}

function convertirEditBlogHtml() {
  const texto = document.getElementById('editBlog').value;
  const html = convertirTextoABlogHtml(texto);
  document.getElementById('editBlogHtml').value = html;
}

async function guardarEdicionFila() {
  const modal = document.querySelector('.modal-editar-blog');
  const index = modal.querySelector('#editIndex').value;
  const id = modal.querySelector('#editId').value;
  const nombre = modal.querySelector('#editNombre').value.trim();
  const estado = modal.querySelector('#editEstado').value;
  const blog = modal.querySelector('#editBlog').value.trim();
  const blogHtml = modal.querySelector('#editBlogHtml').value.trim();
  const meta = modal.querySelector('#editMeta').value.trim();
  const fechaRaw = modal.querySelector('#editFecha').value; // yyyy-mm-dd
  const categoria = modal.querySelector('#editCategoria').value;

  if (!id || !nombre || !estado || !blog || !meta || !fechaRaw || !categoria) {
    mostrarNotificacion("⚠️ Completa todos los campos.", "alerta");
    return;
  }

  const norm = normalizeFecha(fechaRaw);

  try {
    await firebase.firestore().collection('blogs').doc(id).update({
      nombre, estado, blog, blogHtml, meta,
      fecha: norm.fecha,       // DD/MM/YYYY
      fechaIso: norm.fechaIso, // YYYY-MM-DD
      categoria
    });

    datosTabla[index] = {
      ...datosTabla[index],
      id, nombre, estado, blog, blogHtml, meta,
      fecha: norm.fecha,
      fechaIso: norm.fechaIso,
      categoria
    };

    renderizarTabla();
    cerrarModalEditarDato();
    mostrarNotificacion("✅ Blog guardado con éxito", "exito");
  } catch {
    mostrarNotificacion("❌ Error al actualizar el blog.", "error");
  }
}


document.addEventListener('click', e => {
  if (e.target && e.target.id === 'btnCopiarBlog') {
    const contenido = document.getElementById('editBlogHtml').value.trim();
    if (!contenido) {
  mostrarNotificacion("⚠️ No hay contenido para copiar.", "alerta");
      return;
    }
    navigator.clipboard.writeText(contenido)
  .then(() => mostrarNotificacion("✅ Contenido HTML copiado", "exito"))
  .catch(err => mostrarNotificacion("❌ Error al copiar: " + err, "error"));
  }
});


// ==== Fechas: normalizar y formatear ====
function normalizeFecha(fechaIn) {
  if (!fechaIn) return { fecha: "", fechaIso: "" };
  const s = String(fechaIn).trim();
  const sep = s.includes('/') ? '/' : (s.includes('-') ? '-' : null);
  if (!sep) return { fecha: s, fechaIso: "" };

  const parts = s.split(sep).map(p => p.trim());
  if (parts.length !== 3) return { fecha: s, fechaIso: "" };

  let d, m, y;
  if (parts[0].length === 4) {        // yyyy-mm-dd
    y = +parts[0]; m = +parts[1]; d = +parts[2];
  } else if (parts[2].length === 4) { // dd/mm/yyyy (preferencia Chile)
    d = +parts[0]; m = +parts[1]; y = +parts[2];
  } else {                            // dd/mm/yy
    d = +parts[0]; m = +parts[1]; y = +parts[2];
    if (y < 100) y += 2000;
  }

  if (isNaN(d) || isNaN(m) || isNaN(y) || d < 1 || d > 31 || m < 1 || m > 12) {
    return { fecha: s, fechaIso: "" };
  }

  const dd = String(d).padStart(2,'0');
  const mm = String(m).padStart(2,'0');
  const yyyy = String(y);
  return { fecha: `${dd}/${mm}/${yyyy}`, fechaIso: `${yyyy}-${mm}-${dd}` };
}

function fechaFromIsoToDisplay(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}



// ===============================
// CSV Preview + Import con progreso
// ===============================
(function initCsvPreviewAndImport(){
  const btn  = document.getElementById('btnCargarCsv');
  const file = document.getElementById('csvInput');
  if (!btn || !file) return;

  // Campos esperados (tal cual los enviarás en el CSV)
  const REQUIRED_HEADERS = [
    "ID de Blog",
    "Nombre de Blog",
    "Estado de Blog",
    "Fecha de Blog",
    "Categoría",
    "Meta Descripción",
    "Contenido de Blog"
  ];

  // Estado interno
  let parsedRows = [];
  let parsedHeaders = [];

  // Abrir selector de archivo
  btn.addEventListener('click', () => file.click());

  // Leer CSV y abrir modal
  file.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    if (!/\.csv$/i.test(f.name)) {
      mostrarNotificacion("Selecciona un archivo .csv válido", "alerta");
      file.value = "";
      return;
    }

    if (typeof Papa === "undefined") {
      mostrarNotificacion("No se encontró el parser CSV (PapaParse).", "error");
      file.value = "";
      return;
    }

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        parsedRows = res.data || [];
        parsedHeaders = (res.meta && res.meta.fields) || [];
        abrirPreviewModal(parsedRows, parsedHeaders);
        file.value = "";
      },
      error: (err) => {
        mostrarNotificacion("Error al leer CSV: " + (err?.message || err), "error");
        file.value = "";
      }
    });
  });

  // ---- Modal helpers ----
  const modal = document.getElementById("csvPreviewModal");
  const $ = (sel) => document.querySelector(sel);

  function showModal(show){
    modal.style.display = show ? "flex" : "none";
  }

  function renderPreviewTable(rows, headers){
    const thead = $("#csvPreviewTable thead");
    const tbody = $("#csvPreviewTable tbody");
    thead.innerHTML = "";
    tbody.innerHTML = "";

    // Encabezados
    const trh = document.createElement("tr");
    headers.forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      trh.appendChild(th);
    });
    thead.appendChild(trh);

    // Primeras 5 filas
    rows.slice(0,5).forEach(r => {
      const tr = document.createElement("tr");
      headers.forEach(h => {
        const td = document.createElement("td");
        td.textContent = (r[h] ?? "").toString();
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function validarHeaders(headers){
    const faltantes = REQUIRED_HEADERS.filter(h => !headers.includes(h));
    return faltantes;
  }

  function abrirPreviewModal(rows, headers){
    const errBox = $("#csvPrevErrors");
    const btnImport = $("#csvPrevImport");
    const progressBox = $("#csvImportProgress");
    const summaryBox = $("#csvImportSummary");

    // Reset UI
    errBox.classList.add("d-none");
    errBox.innerHTML = "";
    btnImport.disabled = true;
    progressBox.classList.add("d-none");
    $("#csvImportStatus").textContent = "";
    progressBox.querySelector(".progress-bar").style.width = "0%";
    summaryBox.classList.add("d-none");
    summaryBox.innerHTML = "";

    if (!rows.length){
      errBox.classList.remove("d-none");
      errBox.innerHTML = "El CSV está vacío.";
      renderPreviewTable([], headers);
      showModal(true);
      return;
    }

    // Valida cabeceras esperadas
    const faltantes = validarHeaders(headers);
    if (faltantes.length){
      errBox.classList.remove("d-none");
      errBox.innerHTML = `Faltan columnas obligatorias: <strong>${faltantes.join(", ")}</strong>`;
    } else {
      btnImport.disabled = false;
    }

    // Render tabla (5 filas)
    renderPreviewTable(rows, headers);
    showModal(true);
  }

  $("#csvPrevClose")?.addEventListener("click", () => showModal(false));
  $("#csvPrevCancel")?.addEventListener("click", () => showModal(false));

  // ---- Importación con progreso ----
  $("#csvPrevImport")?.addEventListener("click", async () => {
    const bars = $("#csvImportProgress");
    const bar  = bars.querySelector(".progress-bar");
    const stat = $("#csvImportStatus");
    const btnImport = $("#csvPrevImport");
    const errBox = $("#csvPrevErrors");
    const summaryBox = $("#csvImportSummary");

    btnImport.disabled = true;
    errBox.classList.add("d-none");
    summaryBox.classList.add("d-none");
    bars.classList.remove("d-none");

    try {
      const { ok, fail, total, fallos } = await importCsvRowsWithProgress(parsedRows, (p, msg) => {
        bar.style.width = `${p}%`;
        stat.textContent = msg || "";
      });

      // Resumen
      summaryBox.classList.remove("d-none");
      summaryBox.innerHTML = `
        <div class="alert alert-${fail ? 'warning' : 'success'} mb-2">
          Importados ${ok} de ${total}. ${fail ? (fail + " con errores.") : "Sin errores."}
        </div>
        ${fallos.length ? `<div class="small"><strong>Detalles:</strong><ul class="mt-2 mb-0">${fallos.map(f => `<li>${f}</li>`).join("")}</ul></div>` : ""}
      `;

      mostrarNotificacion(`Importación: ${ok}/${total}${fail ? `, fallos: ${fail}` : ""}`, fail ? "alerta" : "exito");

      // refrescar tabla
      if (typeof cargarDatosDesdeFirestore === "function") {
        cargarDatosDesdeFirestore();
      }
    } catch (err) {
      errBox.classList.remove("d-none");
      errBox.innerHTML = "Error durante la importación: " + (err?.message || err);
      mostrarNotificacion("Error durante la importación", "error");
    } finally {
      // mantener el modal abierto para ver el resumen
    }
  });

  // Mapea filas y hace commit por lotes con progreso
  async function importCsvRowsWithProgress(rows, onProgress){
    const db = firebase.firestore();
    const chunkSize = 400; // seguro para límite de batch (~500)
    const fallos = [];
    let ok = 0, fail = 0;
    const total = rows.length;

    const pick = (obj, key) => {
      // clave exacta (cabeceras en español tal cual)
      return (obj[key] ?? "").toString().trim();
    };

    for (let i = 0; i < rows.length; i += chunkSize) {
      const slice = rows.slice(i, i + chunkSize);
      const batch = db.batch();

      slice.forEach((r, idx) => {
        const rowNum = i + idx + 2; // +2 por encabezado
        const id         = pick(r, "ID de Blog");
        const nombre     = pick(r, "Nombre de Blog");
        const estado     = pick(r, "Estado de Blog") || "pendiente";
        const fecha      = pick(r, "Fecha de Blog");
        const categoria  = pick(r, "Categoría");
        const meta       = pick(r, "Meta Descripción");
        const contenido  = pick(r, "Contenido de Blog"); // texto plano

        if (!nombre) {
          fail++; fallos.push(`Fila ${rowNum}: falta "Nombre de Blog"`);
          return; // no se agrega al batch
        }

const ref = id ? db.collection("blogs").doc(id) : db.collection("blogs").doc();
const norm = normalizeFecha(fecha); 
    const docBody = {
  id: ref.id,
  nombre,
  estado,
  fecha: norm.fecha,                  // 👈 DD/MM/YYYY para UI/HTML
  fechaIso: norm.fechaIso,            // 👈 YYYY-MM-DD para ordenar/filtrar
  categoria,
  meta,
  blog: contenido,
  blogHtml: ""
};

batch.set(ref, docBody, { merge: true });
        ok++;
      });

      await batch.commit();

      const processed = Math.min(i + slice.length, total);
      const pct = Math.round((processed / total) * 100);
      if (typeof onProgress === "function") {
        onProgress(pct, `Procesando ${processed} / ${total}...`);
      }
    }

    if (typeof onProgress === "function") onProgress(100, `Completado: ${ok} OK, ${fail} con errores.`);
    return { ok, fail, total, fallos };
  }
})();


// ====== Eliminación de blogs con modal (acepta this en onclick) ======
(function initDeleteFlow(){
  const MODAL_ID = "modalConfirmarEliminar";
  let _docIdAEliminar = null;

  function abrirModal(){
    const m = document.getElementById(MODAL_ID);
    if (m) m.style.display = "flex";
  }
  function cerrarModal(){
    const m = document.getElementById(MODAL_ID);
    if (m) m.style.display = "none";
  }

  // Intenta obtener el ID desde: data-id del botón, data-doc-id de la fila, o 1ª celda
  function resolverDocId(btnOrId){
    if (typeof btnOrId === "string") return btnOrId.trim();

    const el = btnOrId;
    if (!el) return "";

    // 1) data-id en el botón <button data-id="...">
    let id = el.dataset?.id || "";
    if (id) return id.trim();

    // 2) data-doc-id en la fila <tr data-doc-id="...">
    const tr = el.closest("tr");
    if (tr){
      id = tr.dataset?.docId || tr.getAttribute("data-doc-id") || tr.dataset?.id || "";
      if (id) return id.trim();

      // 3) 1ª celda de la fila (si tu primera columna es el ID)
      const firstCell = tr.querySelector("td,th");
      if (firstCell){
        const txt = (firstCell.textContent || "").trim();
        if (txt) return txt;
      }
    }
    return "";
  }

  // Llamada desde el botón: onclick="confirmarEliminarFila(this)" o con un string ID
  function confirmarEliminarFila(btnOrId){
    const id = resolverDocId(btnOrId);
    if (!id){
      if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion("No pude obtener el ID del blog a eliminar. Asegúrate de que la fila tenga el ID en la primera columna o agrega data-doc-id al <tr>.", "alerta");
      }
      return;
    }
    _docIdAEliminar = id;
    abrirModal();
  }

  async function eliminarFilaConfirmado(){
    if (!_docIdAEliminar) {
      if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion("No hay blog seleccionado para eliminar.", "alerta");
      }
      return;
    }
    try {
      const db = firebase.firestore();
      await db.collection("blogs").doc(_docIdAEliminar).delete();

      if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion("Blog eliminado correctamente", "exito");
      }
      if (typeof cargarDatosDesdeFirestore === "function") {
        cargarDatosDesdeFirestore();
      }
    } catch (e) {
      if (typeof mostrarNotificacion === "function") {
        mostrarNotificacion("Error al eliminar: " + (e?.message || e), "error");
      }
    } finally {
      _docIdAEliminar = null;
      cerrarModal();
    }
  }

  function cerrarModalEliminar(){
    _docIdAEliminar = null;
    cerrarModal();
  }

  // Exponer globalmente para que funcione el onclick inline
  window.confirmarEliminarFila = confirmarEliminarFila;
  window.eliminarFilaConfirmado = eliminarFilaConfirmado;
  window.cerrarModalEliminar = cerrarModalEliminar;
})();


// v1.7