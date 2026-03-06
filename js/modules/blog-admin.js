// blog-admin.js

let datosTabla = [];
let filaAEliminar = null;

import { slugify, aplicarNegritaUltimaFraseConDosPuntos } from './blog-utils.js';

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
        
        // 1. Aplicar negrita a frases con dos puntos
        let textoProcesado = aplicarNegritaUltimaFraseConDosPuntos(limpio);
        // 2. Aplicar negrita a **texto** (ESTO ES LO QUE FALTABA)
        textoProcesado = textoProcesado.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        contenido += `<li>${textoProcesado}</li>\n`;
      });
      contenido += '</ul>\n';
    } else {
      buffer.forEach(line => {
        // 1. Aplicar negrita a frases con dos puntos
        let textoProcesado = aplicarNegritaUltimaFraseConDosPuntos(line);
        // 2. Aplicar negrita a **texto** (ESTO ES LO QUE FALTABA)
        textoProcesado = textoProcesado.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

        contenido += `<p class="texto-blog">${textoProcesado}</p>\n`;
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

    // FECHA consistente (DD/MM/YYYY para UI)
    let fechaUi = "";
    if (data.fecha) {
      fechaUi = /^\d{4}-\d{2}-\d{2}$/.test(data.fecha)
        ? fechaFromIsoToDisplay(data.fecha)
        : data.fecha;
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
      blogHtml: data.blogHtml || "",   // 👈 IMPORTANTE: ahora sí lo llevamos a la tabla
      meta: data.meta || "",
      fecha: fechaUi,
      fechaIso,
      categoria: data.categoria || "",
      url: data.url || "",
      imagen: data.imagen || ""
    };
  });

  // Si ordenas por ID:
  if (typeof toNumId === "function") {
    datosTabla.sort((a, b) => toNumId(b.id || b.docId) - toNumId(a.id || a.docId));
  }

  renderizarTabla();
}
window.cargarDatosDesdeFirestore = cargarDatosDesdeFirestore;

// Convierte el ID a número para ordenar; si no es numérico, lo manda al final
function toNumId(v){
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : -Infinity;
}

function renderizarTabla() {
  const tabla = document.querySelector('#tablaDatos');
  
  // 🛡️ PROTECCIÓN: Si no existe la tabla, salimos sin hacer nada (y sin errores)
  if (!tabla) {
    console.warn("⚠️ renderizarTabla: No se encontró #tablaDatos en esta vista.");
    return;
  }

  const tbody = tabla.querySelector('tbody');
  if (!tbody) return; // Doble seguridad

  tbody.innerHTML = '';

  datosTabla.forEach((dato, index) => {
    // ID robusto
    const id = (dato.id && String(dato.id).trim()) || (dato.docId && String(dato.docId).trim()) || "";

    const fila = document.createElement('tr');
    if (id) fila.dataset.docId = id;

    // Contenido recortado
    const blogPreview = (dato.blog || '').toString();
    const blogShort = blogPreview.length > 160 ? blogPreview.slice(0, 160) + '…' : blogPreview;

    fila.innerHTML = `
      <td class="text-center">
        <input type="checkbox" class="form-check-input blog-check" data-index="${index}">
      </td>
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
window.renderizarTabla = renderizarTabla;

// En blog-admin.js, dentro de tu onSnapshot:

// Usamos onSnapshot SIN orderBy para que traiga TODOS los documentos,
// tengan o no tengan el campo "creadoEn".
db.collection("blogs").onSnapshot((querySnapshot) => {
    datosTabla = [];
    
    querySnapshot.forEach((doc) => {
        // Guardamos ID y toda la data
        datosTabla.push({ id: doc.id, ...doc.data() });
    });

    // Ordenamiento manual por FECHA (la del blog) para que se vean ordenados en la tabla
    // Esto reemplaza al orderBy de la base de datos
    datosTabla.sort((a, b) => {
        // Si alguno no tiene fecha, lo mandamos al final
        if (!a.fecha) return 1;
        if (!b.fecha) return -1;
        
        // Comparamos fechas como texto (YYYY-MM-DD funciona bien así)
        // O invertimos b y a para que sea descendente (más nuevo arriba)
        return new Date(b.fecha) - new Date(a.fecha);
    });

    // 1. Exportamos los datos para que el Calendario los vea
    window.datosTabla = datosTabla; 

    // 2. Dibujamos la tabla
    renderizarTabla();
    
    // 3. Actualizamos el calendario (si la función existe)
    if (window.renderizarCalendario) {
        console.log("📅 Datos recibidos: " + datosTabla.length + " blogs. Actualizando calendario...");
        window.renderizarCalendario();
    }
});


function abrirModalAgregarDato() {
  document.getElementById('modalAgregarDato').style.display = 'flex';
}
window.abrirModalAgregarDato = abrirModalAgregarDato;

function cerrarModalAgregarDato() {
  document.getElementById('modalAgregarDato').style.display = 'none';
}
window.cerrarModalAgregarDato = cerrarModalAgregarDato;

function limpiarFormulario() {
['nuevoId', 'nuevoNombre', 'nuevoEstado', 'nuevoBlog', 'nuevoBlogHtml', 'nuevoMeta', 'nuevaFecha', 'nuevaCategoria', 'nuevaUrl']
    .forEach(id => document.getElementById(id).value = '');
}

// js/modules/blog-admin.js

/* =====================
   AGREGAR NUEVO DATO (FINAL CON URL)
===================== */
/* =====================
   AGREGAR NUEVO DATO (CON URL E IMAGEN AUTO)
===================== */
async function agregarNuevoDato() {
  // 1. Obtener valores del DOM
  const id = document.getElementById('nuevoId').value.trim();
  const nombre = document.getElementById('nuevoNombre').value.trim();
  const estado = document.getElementById('nuevoEstado').value.trim();
  const blog = document.getElementById('nuevoBlog').value.trim();
  const blogHtml = document.getElementById('nuevoBlogHtml').value.trim();
  const meta = document.getElementById('nuevoMeta').value.trim();
  const fecha = document.getElementById('nuevaFecha').value.trim();
  const categoria = document.getElementById('nuevaCategoria').value.trim();
  
  // 2. Normalizar fecha (si existe tu función auxiliar)
  const fechaRaw = document.getElementById('nuevaFecha')?.value; 
  let norm = { fecha: fechaRaw, fechaIso: fechaRaw };
  if (typeof normalizeFecha === 'function') {
      norm = normalizeFecha(fechaRaw);
  }

  // 3. Validaciones
  if (!id || !nombre || !estado || !blog || !meta || !fecha || !categoria) {
    mostrarNotificacion("⚠️ Completa todos los campos obligatorios.", "alerta");
    return;
  }

  // ---------------------------------------------------------
  // 🔗 A. LOGICA DE URL (SLUG)
  // ---------------------------------------------------------
  let urlGenerada = document.getElementById('nuevaUrl')?.value.trim();
  
  if (!urlGenerada) {
      const limpiar = (txt) => (txt || "").toString().trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
      
      const sCat = limpiar(categoria);
      const sNom = limpiar(nombre);
      urlGenerada = `https://distribuidoradejoyas.cl/blog/${sCat}/${sNom}`;
  }

  // ---------------------------------------------------------
  // 🖼️ B. LOGICA DE IMAGEN (AUTO POR ID)
  // ---------------------------------------------------------
  let imagenFinal = document.getElementById('nuevaImagen') ? document.getElementById('nuevaImagen').value.trim() : "";

  if (!imagenFinal) {
      // Usamos el formato exacto que pediste basado en el ID
      imagenFinal = `https://distribuidoradejoyas.cl/img/cms/paginas%20internas/blogs/blog-${id}.jpg`;
  }

  // 4. Objeto a guardar
  const nuevoDato = { 
    id, 
    nombre, 
    estado, 
    blog, 
    blogHtml, 
    meta, 
    fecha: norm.fecha,       // DD/MM/YYYY
    fechaIso: norm.fechaIso, // YYYY-MM-DD
    categoria, 
    url: urlGenerada,        // <--- URL LISTA
    imagen: imagenFinal,     // <--- IMAGEN LISTA
    creadoEn: firebase.firestore.FieldValue.serverTimestamp() 
  };

  try {
    // 5. Verificar duplicados
    const docRef = firebase.firestore().collection('blogs').doc(id);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
        mostrarNotificacion("⚠️ Ese ID ya existe. Por favor usa otro.", "alerta");
        return;
    }

    // 6. Guardar en Firebase
    await docRef.set(nuevoDato);
    
    // 7. Actualizar tabla localmente (si usas snapshot esto es opcional, pero bueno para feedback inmediato)
    // datosTabla.push(nuevoDato); // Descomentar si no usas onSnapshot
    // renderizarTabla();          // Descomentar si no usas onSnapshot
    
    // 8. Limpieza y Cierre
    cerrarModalAgregarDato();
    
    // Limpiar formulario (incluyendo los nuevos campos)
    const idsALimpiar = ['nuevoId', 'nuevoNombre', 'nuevoEstado', 'nuevoBlog', 'nuevoBlogHtml', 'nuevoMeta', 'nuevaFecha', 'nuevaCategoria', 'nuevaUrl', 'nuevaImagen'];
    idsALimpiar.forEach(campo => {
        if(document.getElementById(campo)) document.getElementById(campo).value = '';
    });

    mostrarNotificacion("✅ Blog agregado correctamente", "exito");

  } catch (error) {
    console.error("Error al guardar:", error);
    mostrarNotificacion("❌ Error al guardar en Firestore.", "error");
  }
}

// Exponer la función globalmente para que el HTML la encuentre
window.agregarNuevoDato = agregarNuevoDato;


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
          
          <div class="row">
            <div class="col-6">
               <span>ID de Blog</span>
               <input type="text" id="editId" class="form-control mb-2" value="${dato.id}" readonly>
            </div>
            <div class="col-6">
               <span>Fecha de Blog</span>
               <input type="date" id="editFecha" class="form-control mb-2" value="${dato.fechaIso || normalizeFecha(dato.fecha || '').fechaIso || ''}">
            </div>
          </div>

          <span>Nombre de Blog</span>
          <input type="text" id="editNombre" class="form-control mb-2" value="${dato.nombre}">

          <div class="row">
            <div class="col-6">
               <span>Estado de Blog</span>
               <select id="editEstado" class="form-control mb-2">
                 <option ${dato.estado === 'transcrito' ? 'selected' : ''}>transcrito</option>
                 <option ${dato.estado === 'pendiente' ? 'selected' : ''}>pendiente</option>
                 <option ${dato.estado === 'reescribir' ? 'selected' : ''}>reescribir</option>
               </select>
            </div>
            <div class="col-6">
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
            </div>
          </div>

          <span>🔗 URL del Blog</span>
          <input type="text" id="editUrl" class="form-control mb-3" readonly style="background-color: #e9ecef;" value="${dato.url || ''}">

          <span>🖼️ URL Imagen Principal</span>
          <input type="text" id="editImagen" class="form-control mb-2" value="${dato.imagen || ''}">

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
    if (selectCat.value !== dato.categoria.trim()) {
      const opt = document.createElement('option');
      opt.value = dato.categoria.trim();
      opt.textContent = dato.categoria.trim();
      opt.selected = true;
      selectCat.appendChild(opt);
    }
  }
}


window.editarFila = editarFila;




function cerrarModalEditarDato() {
  const modal = document.getElementById('modalEditarDato');
  if (modal) modal.remove();
}
window.cerrarModalEditarDato = cerrarModalEditarDato;

function convertirEditBlogHtml() {
  const texto = document.getElementById('editBlog').value;
  const html = convertirTextoABlogHtml(texto);
  document.getElementById('editBlogHtml').value = html;
}
window.convertirEditBlogHtml = convertirEditBlogHtml;


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
  const imagen = modal.querySelector('#editImagen').value.trim();
  
  // 1. Leer la URL del input (Asegúrate de agregar este input en el HTML del modal editar)
  let urlEditada = modal.querySelector('#editUrl') ? modal.querySelector('#editUrl').value.trim() : "";

  if (!id || !nombre || !estado || !blog || !meta || !fechaRaw || !categoria) {
    mostrarNotificacion("⚠️ Completa todos los campos.", "alerta");
    return;
  }

  const norm = normalizeFecha(fechaRaw);

  // 2. Lógica de Respaldo: Si la URL está vacía, la regeneramos
  if (!urlEditada) {
      const limpiar = (txt) => (txt || "").toString().trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
      
      const sCat = limpiar(categoria);
      const sNom = limpiar(nombre);
      urlEditada = `https://distribuidoradejoyas.cl/blog/${sCat}/${sNom}`;

  }

  try {
    // 3. Guardar en Firebase incluyendo la URL
    await firebase.firestore().collection('blogs').doc(id).update({
      nombre, 
      estado, 
      blog, 
      blogHtml, 
      meta,
      fecha: norm.fecha,       // DD/MM/YYYY
      fechaIso: norm.fechaIso, // YYYY-MM-DD
      categoria,
      url: urlEditada ,         
      imagen: imagen
    });

    // 4. Actualizar tabla visualmente
    datosTabla[index] = {
      ...datosTabla[index],
      id, nombre, estado, blog, blogHtml, meta,
      fecha: norm.fecha,
      fechaIso: norm.fechaIso,
      categoria,
      url: urlEditada,
      imagen: imagen
    };

    renderizarTabla();
    cerrarModalEditarDato();
    mostrarNotificacion("✅ Blog actualizado con éxito", "exito");
  } catch (error) {
    console.error(error);
    mostrarNotificacion("❌ Error al actualizar el blog.", "error");
  }
}
window.guardarEdicionFila = guardarEdicionFila;


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

    // Renderizar TODAS las filas (sin el slice de 5)
    rows.forEach(r => {
        const tr = document.createElement("tr");
        headers.forEach(h => {
            const td = document.createElement("td");
            let contenido = (r[h] ?? "").toString();
            // Recortar texto muy largo solo para la previsualización visual
            td.textContent = contenido.length > 50 ? contenido.slice(0, 50) + "..." : contenido;
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
    const chunkSize = 50; 
    const fallos = [];
    let ok = 0, fail = 0;
    const total = rows.length;

    // Función interna para limpiar texto (Slugify)
    const limpiarParaUrl = (txt) => {
        return (txt || "").toString().trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
            .replace(/[^a-z0-9\s-]/g, "")                   // Quita símbolos
            .replace(/\s+/g, "-");                          // Espacios por guiones
    };

    const pick = (obj, key) => (obj[key] ?? "").toString().trim();

    for (let i = 0; i < rows.length; i += chunkSize) {
        const slice = rows.slice(i, i + chunkSize);
        const batch = db.batch();

        slice.forEach((r, idx) => {
            const rowNum = i + idx + 2;
            const id = pick(r, "ID de Blog");
            const nombre = pick(r, "Nombre de Blog");
            const categoria = pick(r, "Categoría") || "general";
            const contenido = pick(r, "Contenido de Blog");

            if (!nombre || !id) {
                fail++; 
                fallos.push(`Fila ${rowNum}: Falta ID o Nombre.`);
                return;
            }

            // --- 🚀 GENERACIÓN AUTOMÁTICA DE DATOS FALTANTES ---
            const slugCat = limpiarParaUrl(categoria);
            const slugNom = limpiarParaUrl(nombre);
            
            // 1. Generar URL del Blog
            const urlAuto = `https://distribuidoradejoyas.cl/blog/${slugCat}/${slugNom}`;
            
            // 2. Generar URL de la Imagen (basada en ID)
            const imagenAuto = `https://distribuidoradejoyas.cl/img/cms/paginas%20internas/blogs/blog-${id}.jpg`;
            
            // 3. Generar HTML (para que no suba vacío)
            const htmlGenerado = typeof convertirTextoABlogHtml === 'function' 
                ? convertirTextoABlogHtml(contenido) 
                : "";

            const ref = db.collection("blogs").doc(id);
            const norm = normalizeFecha(pick(r, "Fecha de Blog"));

            const docBody = {
                id: id,
                nombre: nombre,
                estado: pick(r, "Estado de Blog") || "pendiente",
                fecha: norm.fecha,
                fechaIso: norm.fechaIso,
                categoria: categoria,
                meta: pick(r, "Meta Descripción"),
                blog: contenido,
                blogHtml: htmlGenerado,
                url: urlAuto,      // <-- AHORA SÍ TIENE DATO
                imagen: imagenAuto, // <-- AHORA SÍ TIENE DATO
                creadoEn: firebase.firestore.FieldValue.serverTimestamp()
            };

            batch.set(ref, docBody, { merge: true });
            ok++;
        });

        await batch.commit();

        const processed = Math.min(i + slice.length, total);
        const pct = Math.round((processed / total) * 100);
        if (typeof onProgress === "function") {
            onProgress(pct, `Procesando ${processed} de ${total} blogs...`);
        }
    }

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

function filtrarTabla() {
  const filtro = document.getElementById('filtroTexto').value.toLowerCase().trim();
  const tabla = document.getElementById('tablaDatos');
  const filas = tabla.tBodies[0].rows;

  for (let fila of filas) {
    const textoFila = fila.textContent.toLowerCase();
    fila.style.display = textoFila.includes(filtro) ? '' : 'none';
  }
}

window.filtrarTabla = filtrarTabla;


function convertirNuevoHtml() {
  const texto = document.getElementById('nuevoBlog').value;
  // Usamos la misma lógica de conversión que ya tienes definida arriba
  const html = convertirTextoABlogHtml(texto);
  document.getElementById('nuevoBlogHtml').value = html;
}
window.convertirNuevoHtml = convertirNuevoHtml;

// js/modules/blog-admin.js


// 2. Seleccionar Todo
function toggleSelectAll(source) {
  const checkboxes = document.querySelectorAll('.blog-check');
  checkboxes.forEach(cb => cb.checked = source.checked);
}
window.toggleSelectAll = toggleSelectAll;


function exportarSeleccionados() {
  const checkboxes = document.querySelectorAll('.blog-check:checked');
  
  if (checkboxes.length === 0) {
    mostrarNotificacion("⚠️ No has seleccionado ningún blog.", "alerta");
    return;
  }

  // Encabezados
  let csvContent = "ID,Meta titulo,Meta Descripción,Categoria,Autor,Fecha\n";

  // Diccionario de categorías. 
  // Falla de escalabilidad: Si agregas una categoría nueva en el futuro, DEBES agregarla aquí también.
  const mapaCategorias = {
    "Tips": 2,
    "Emprendimiento": 3,
    "Sabías que?": 4,
    "Beneficios": 5,
    "Tendencias": 6,
    "Cuidado y Mantenimiento": 7,
    "Sustentable": 8,
    "Innovación": 9
  };

  checkboxes.forEach(cb => {
    const index = cb.dataset.index;
    const dato = datosTabla[index];
    
    if (dato) {
      const escape = (txt) => {
        const str = String(txt || "").replace(/"/g, '""'); 
        return `"${str}"`; 
      };

      // --- LÓGICA DE TRANSFORMACIÓN DE FECHA ---
      let fechaFormateada = dato.fecha || "";
      
      if (fechaFormateada.includes('/')) {
        const partes = fechaFormateada.split('/');
        if (partes.length === 3) {
            fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]} 10:00:00`;
        }
      } 
      else if (fechaFormateada.length === 10 && fechaFormateada.includes('-')) {
          fechaFormateada = `${fechaFormateada} 10:00:00`;
      }

      // --- INTERCEPCIÓN DE CATEGORÍA ---
      // Si la categoría existe en el mapa, saca el número. Si no existe o viene mal escrita, devuelve un string vacío para no corromper la columna numérica del CSV.
      const categoriaTexto = (dato.categoria || "").trim();
      const idCategoria = mapaCategorias[categoriaTexto] || "";

      const fila = [
        escape(dato.id || dato.docId),      
        escape(dato.nombre),                
        escape(dato.meta),                  
        escape(idCategoria), // <-- Exportando el ID numérico
        escape("Sofía de DJOYAS"), // Sigo viendo a este autor fijo. Otra deuda técnica.         
        escape(fechaFormateada) 
      ];

      csvContent += fila.join(",") + "\n";
    }
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `blogs_seo_${new Date().toISOString().slice(0,10)}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  mostrarNotificacion(`✅ Exportados ${checkboxes.length} blogs.`, "exito");
}
window.exportarSeleccionados = exportarSeleccionados;

/* =====================
   ACTUALIZAR URL EN VIVO (MODAL CALENDARIO)
===================== */
window.actualizarUrlModal = function() {
    const nombre = document.getElementById("nuevoNombre").value;
    const categoria = document.getElementById("nuevaCategoria").value;
    
    // Función local para limpiar
    const limpiar = (txt) => (txt || "").toString().trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");

    const slugTitulo = limpiar(nombre);
    const slugCat = limpiar(categoria || "categoria"); // Default si está vacío
    
    const urlFinal = `https://distribuidoradejoyas.cl/blog/${slugCat}/${slugTitulo}`;
    
    // Mostrar en el input visual
    const inputUrl = document.getElementById("nuevaUrl");
    if(inputUrl) inputUrl.value = urlFinal;
};

// Cada vez que escribas un ID en el modal de "Agregar", la URL de imagen se pre-llena
document.getElementById('nuevoId')?.addEventListener('input', (e) => {
    const id = e.target.value.trim();
    const inputImagen = document.getElementById('nuevaImagen');
    if (id && inputImagen) {
        inputImagen.value = `https://distribuidoradejoyas.cl/img/cms/paginas%20internas/blogs/blog-${id}.jpg`;
    }
});




// v4