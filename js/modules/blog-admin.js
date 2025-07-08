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
  const tbody = document.querySelector('#tablaDatos tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">🔄 Cargando datos...</td></tr>';

  try {
    const snapshot = await firebase.firestore().collection('blogs').orderBy('fecha', 'desc').get();
    datosTabla = snapshot.docs.map(doc => doc.data());
    renderizarTabla();
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar.</td></tr>';
  }
}

function renderizarTabla() {
  const tbody = document.querySelector('#tablaDatos tbody');
  tbody.innerHTML = '';

  datosTabla.forEach((dato, index) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td class="celda-id">${dato.id || ''}</td>
      <td class="celda-nombre">${dato.nombre || ''}</td>
      <td class="celda-estado">${dato.estado || ''}</td>
      <td class="celda-blog">${dato.blog || ''}</td>
      <td class="celda-meta">${dato.meta || ''}</td>
      <td class="celda-fecha">${dato.fecha || ''}</td>
      <td class="celda-categoria">${dato.categoria || ''}</td>
      <td>
        <button class="btn p-0 mx-1" onclick="editarFila(${index})">✏️</button>
        <button class="btn btn-sm p-0" onclick="confirmarEliminarFila(this)">🗑️</button>
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

  if (!id || !nombre || !estado || !blog || !meta || !fecha || !categoria) {
    alert('⚠️ Completa todos los campos.');
    return;
  }

  const nuevoDato = { id, nombre, estado, blog, blogHtml, meta, fecha, categoria, creadoEn: firebase.firestore.FieldValue.serverTimestamp() };

  try {
    await firebase.firestore().collection('blogs').doc(id).set(nuevoDato);
    datosTabla.push(nuevoDato);
    renderizarTabla();
    cerrarModalAgregarDato();
    limpiarFormulario();
  } catch {
    alert('Error al guardar en Firestore.');
  }
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
          <input type="date" id="editFecha" class="form-control mb-2" value="${dato.fecha}">
          <span>Categoría</span>
  <select id="nuevaCategoria" class="form-control mb-3">
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
          <button class="btn btn-secondary mb-2" onclick="convertirEditBlogHtml()">✨ Convertir a HTML</button>
          <button id="btnCopiarBlog" type="button" class="btn btn-outline-primary btn-sm mt-2">📋 Copiar HTML</button>
        </div>
      </div>

      <button class="btn btn-primary w-100 mt-4" onclick="guardarEdicionFila()">Guardar cambios</button>
    </div>
  `;

  document.body.appendChild(modal);
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
  const fecha = modal.querySelector('#editFecha').value;
  const categoria = modal.querySelector('#editCategoria').value;

  if (!id || !nombre || !estado || !blog || !meta || !fecha || !categoria) {
    alert('⚠️ Completa todos los campos.');
    return;
  }

  try {
    await firebase.firestore().collection('blogs').doc(id).update({ nombre, estado, blog, blogHtml, meta, fecha, categoria });
    datosTabla[index] = { id, nombre, estado, blog, blogHtml, meta, fecha, categoria };
    renderizarTabla();
    cerrarModalEditarDato();
  } catch {
    alert('Error al actualizar.');
  }
}



document.addEventListener('click', e => {
  if (e.target && e.target.id === 'btnCopiarBlog') {
    const contenido = document.getElementById('editBlogHtml').value.trim();
    if (!contenido) {
      alert('No hay contenido para copiar.');
      return;
    }
    navigator.clipboard.writeText(contenido)
      .then(() => alert('✅ Contenido HTML copiado al portapapeles.'))
      .catch(err => alert('❌ Error al copiar: ' + err));
  }
});






//upd 8-7 v3