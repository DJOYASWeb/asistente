// blog-admin.js

let datosTabla = [];
let filaAEliminar = null;

async function cargarDatosDesdeFirestore() {
  const tbody = document.querySelector('#tablaDatos tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">🔄 Cargando datos...</td></tr>';

  try {
    const snapshot = await firebase.firestore().collection('blogs').orderBy('fecha', 'desc').get();
    datosTabla = snapshot.docs.map(doc => doc.data());
    renderizarTabla();
  } catch (error) {
    console.error('❌ Error al cargar:', error);
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
      <td class="celda-indicadores">
        <div class="alinear">
          <button class="btn p-0 mx-1" onclick="editarFila(${index})">✏️</button>
          <button class="btn btn-sm p-0" onclick="confirmarEliminarFila(this)">🗑️</button>
        </div>
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
  ['nuevoId', 'nuevoNombre', 'nuevoEstado', 'nuevoBlog', 'nuevoMeta', 'nuevaFecha', 'nuevaCategoria']
    .forEach(id => document.getElementById(id).value = '');
}

async function agregarNuevoDato() {
  const id = document.getElementById('nuevoId').value.trim();
  const nombre = document.getElementById('nuevoNombre').value.trim();
  const estado = document.getElementById('nuevoEstado').value.trim();
  const blog = document.getElementById('nuevoBlog').value.trim();
  const meta = document.getElementById('nuevoMeta').value.trim();
  const fecha = document.getElementById('nuevaFecha').value.trim();
  const categoria = document.getElementById('nuevaCategoria').value.trim();

  if (!id || !nombre || !estado || !blog || !meta || !fecha || !categoria) {
    alert('⚠️ Completa todos los campos.');
    return;
  }

  const nuevoDato = { id, nombre, estado, blog, meta, fecha, categoria, creadoEn: firebase.firestore.FieldValue.serverTimestamp() };

  try {
    await firebase.firestore().collection('blogs').doc(id).set(nuevoDato);
    datosTabla.push(nuevoDato);
    renderizarTabla();
    cerrarModalAgregarDato();
    limpiarFormulario();
  } catch (error) {
    console.error('❌ Error al guardar:', error);
    alert('Error al guardar en Firestore.');
  }
}

function editarFila(index) {
  const dato = datosTabla[index];
  const modal = document.createElement('div');
  modal.id = 'modalEditarDato';
  modal.className = 'modal-editar-blog';
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999;';

  modal.innerHTML = `
    <div class="contenido-modal" style="background:white; padding:4rem; border-radius:16px; width:90%; max-width:60%; margin:auto; position:relative;">
      <button class="btn-close position-absolute end-0 top-0 m-4" onclick="cerrarModalEditarDato()"></button>
      <h5 class="mb-4">✏️ Editar Blog</h5>
      <input type="hidden" id="editIndex" value="${index}">

      <div class="row">
        <div class="col-lg-6 col-12">
          <h6>ID de Blog</h6>
          <input type="text" id="editId" class="form-control mb-2" value="${dato.id}" readonly>
          <h6>Nombre de Blog</h6>
          <input type="text" id="editNombre" class="form-control mb-2" value="${dato.nombre}">
          <h6>Estado</h6>
          <select id="editEstado" class="form-control mb-2">
            <option ${dato.estado === 'transcrito' ? 'selected' : ''}>transcrito</option>
            <option ${dato.estado === 'pendiente' ? 'selected' : ''}>pendiente</option>
            <option ${dato.estado === 'reescribir' ? 'selected' : ''}>reescribir</option>
          </select>
          <h6>Fecha</h6>
          <input type="date" id="editFecha" class="form-control mb-2" value="${dato.fecha}">
          <h6>Categoría</h6>
          <input type="text" id="editCategoria" class="form-control mb-2" value="${dato.categoria}">
        </div>
        <div class="col-lg-6 col-12">
          <h6>Cuerpo de Blog</h6>
          <textarea id="editBlog" class="form-control mb-2">${dato.blog}</textarea>
          <h6>Meta descripción</h6>
          <textarea id="editMeta" class="form-control mb-2">${dato.meta}</textarea>
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

async function guardarEdicionFila() {
  const modal = document.querySelector('.modal-editar-blog');
  const index = modal.querySelector('#editIndex').value;
  const id = modal.querySelector('#editId').value;
  const nombre = modal.querySelector('#editNombre').value.trim();
  const estado = modal.querySelector('#editEstado').value;
  const blog = modal.querySelector('#editBlog').value.trim();
  const meta = modal.querySelector('#editMeta').value.trim();
  const fecha = modal.querySelector('#editFecha').value;
  const categoria = modal.querySelector('#editCategoria').value;

  if (!id || !nombre || !estado || !blog || !meta || !fecha || !categoria) {
    alert('⚠️ Completa todos los campos.');
    return;
  }

  try {
    await firebase.firestore().collection('blogs').doc(id).update({ nombre, estado, blog, meta, fecha, categoria });
    datosTabla[index] = { id, nombre, estado, blog, meta, fecha, categoria };
    renderizarTabla();
    cerrarModalEditarDato();
  } catch (error) {
    console.error('❌ Error al actualizar:', error);
    alert('Error al actualizar.');
  }
}

function confirmarEliminarFila(boton) {
  filaAEliminar = boton.closest('tr');
  document.getElementById('modalConfirmarEliminar').style.display = 'flex';
}

function eliminarFilaConfirmado() {
  if (!filaAEliminar) return;
  const id = filaAEliminar.querySelector('.celda-id').textContent;

  firebase.firestore().collection('blogs').doc(id).delete()
    .then(() => {
      filaAEliminar.remove();
      cerrarModalEliminar();
      showIosModal('✅ Eliminado', 'El blog fue eliminado exitosamente.');
    })
    .catch(err => {
      console.error('❌ Error al eliminar:', err);
      showIosModal('❌ Error', 'No se pudo eliminar el blog.');
    });
}

function cerrarModalEliminar() {
  document.getElementById('modalConfirmarEliminar').style.display = 'none';
}

function filtrarTabla() {
  const texto = document.getElementById('filtroTexto').value.toLowerCase();
  const filas = document.querySelectorAll('#tablaDatos tbody tr');

  filas.forEach(fila => {
    const contenido = fila.textContent.toLowerCase();
    fila.style.display = contenido.includes(texto) ? '' : 'none';
  });
}
