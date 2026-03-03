let proyectoActualId = null;
let editorCodeMirror = null;
let configPersonalizada = { bloques: [], variables: [] };

// --- 0. CARGAR CONFIGURACIÓN DE SNIPPETS DESDE FIREBASE ---
window.cargarConfiguracionSnippets = async function() {
  try {
    const doc = await db.collection("configuraciones").doc("editor_correos").get();
    if (doc.exists) {
      configPersonalizada = doc.data();
    } else {
      // Si no existe, creamos unos por defecto
      configPersonalizada = {
        bloques: [
          { nombre: "Título", codigo: "<h2 style='text-align:center;'>Nuevo Título</h2>\n" },
          { nombre: "Espacio", codigo: "<div style='height: 30px;'>&nbsp;</div>\n" }
        ],
        variables: [
          { nombre: "Nombre", codigo: "{{ contact.FIRSTNAME }}" },
          { nombre: "Desuscribirse", codigo: "{{ unsubscribe }}" }
        ]
      };
    }
    renderizarBotonera();
  } catch (error) {
    console.error("Error cargando configuración:", error);
  }
};

window.renderizarBotonera = function() {
  const toolbarBloques = document.getElementById('toolbar-bloques');
  const toolbarVariables = document.getElementById('toolbar-variables');
  
  if(!toolbarBloques || !toolbarVariables) return;

  // Renderizar Bloques
  let htmlBloques = `<span class="text-muted small fw-bold mt-1 w-100">Bloques Rápidos:</span>`;
  configPersonalizada.bloques.forEach((b, index) => {
    // Codificamos en Base64 para pasarlo seguro al onclick
    const codeB64 = btoa(unescape(encodeURIComponent(b.codigo)));
    htmlBloques += `<button class="btn btn-sm btn-dark" onclick="inyectarCodigoPersonalizado('${codeB64}')"><i class="fas fa-layer-group"></i> ${b.nombre}</button>`;
  });
  toolbarBloques.innerHTML = htmlBloques;

  // Renderizar Variables
  let htmlVariables = `<span class="text-muted small fw-bold mt-1 w-100">Variables Brevo:</span>`;
  configPersonalizada.variables.forEach((v, index) => {
    const codeB64 = btoa(unescape(encodeURIComponent(v.codigo)));
    htmlVariables += `<button class="btn btn-sm btn-outline-success" onclick="inyectarCodigoPersonalizado('${codeB64}')">{ } ${v.nombre}</button>`;
  });
  toolbarVariables.innerHTML = htmlVariables;
};

// Función universal para inyectar desde los botones dinámicos
window.inyectarCodigoPersonalizado = function(codigoB64) {
  if(!editorCodeMirror) return;
  const codigo = decodeURIComponent(escape(atob(codigoB64)));
  editorCodeMirror.replaceSelection(codigo);
  editorCodeMirror.focus();
};

// --- 1. LÓGICA DEL MODAL DE CONFIGURACIÓN ---

window.renderizarListaModal = function() {
  const lista = document.getElementById('lista-configuracion');
  let html = '';

  html += `<h7 class="fw-bold text-primary mt-2 d-block">Bloques Rápidos</h7>`;
  configPersonalizada.bloques.forEach((b, i) => {
    html += `
    <div class="list-group-item d-flex justify-content-between align-items-center bg-light mb-1 border">
      <div><strong>${b.nombre}</strong> <span class="text-muted small">(${b.codigo.substring(0, 20)}...)</span></div>
      <button class="btn btn-sm btn-danger" onclick="eliminarSnippet('bloques', ${i})"><i class="fas fa-trash"></i></button>
    </div>`;
  });

  html += `<h7 class="fw-bold text-success mt-3 d-block">Variables</h7>`;
  configPersonalizada.variables.forEach((v, i) => {
    html += `
    <div class="list-group-item d-flex justify-content-between align-items-center bg-light mb-1 border">
      <div><strong>${v.nombre}</strong> <span class="text-muted small">(${v.codigo})</span></div>
      <button class="btn btn-sm btn-danger" onclick="eliminarSnippet('variables', ${i})"><i class="fas fa-trash"></i></button>
    </div>`;
  });

  lista.innerHTML = html;
};

window.agregarSnippet = function() {
  const tipo = document.getElementById('config-tipo').value; // "bloque" o "variable"
  const nombre = document.getElementById('config-nombre').value.trim();
  const codigo = document.getElementById('config-codigo').value;

  if(!nombre || !codigo) {
    alert("Por favor ingresa un nombre y el código.");
    return;
  }

  if (tipo === 'bloque') {
    configPersonalizada.bloques.push({ nombre, codigo });
  } else {
    configPersonalizada.variables.push({ nombre, codigo });
  }

  // Limpiar inputs
  document.getElementById('config-nombre').value = '';
  document.getElementById('config-codigo').value = '';
  
  renderizarListaModal();
};

window.eliminarSnippet = function(tipoLista, index) {
  if(confirm("¿Seguro que deseas eliminar este elemento?")) {
    configPersonalizada[tipoLista].splice(index, 1);
    renderizarListaModal();
  }
};


// --- 1. LÓGICA DEL MODAL DE CONFIGURACIÓN ---
window.abrirModalConfig = function() {
  renderizarListaModal();
  // Lo abrimos al estilo de tu modales.js
  document.getElementById('modalConfigSnippets').style.display = 'block';
};

window.cerrarModalConfig = function() {
  // Lo cerramos manualmente
  document.getElementById('modalConfigSnippets').style.display = 'none';
};

window.guardarConfiguracionEnFirebase = async function() {
  try {
    await db.collection("configuraciones").doc("editor_correos").set(configPersonalizada);
    alert("¡Configuración guardada exitosamente!");
    renderizarBotonera(); // Refrescar botones en el editor
    cerrarModalConfig();  // Cerramos el modal
  } catch (error) {
    console.error("Error guardando:", error);
    alert("Hubo un error al guardar.");
  }
};


// --- 2. PANTALLA COMPLETA (FULLSCREEN) ---
window.toggleFullscreen = function() {
  const colEditor = document.getElementById('columna-editor-codigo');
  const btn = document.getElementById('btn-fullscreen');
  
  colEditor.classList.toggle('editor-fullscreen');
  const isFull = colEditor.classList.contains('editor-fullscreen');

  if (isFull) {
    btn.innerHTML = '<i class="fas fa-compress"></i> Achicar';
    btn.classList.replace('btn-outline-secondary', 'btn-danger');
  } else {
    btn.innerHTML = '<i class="fas fa-expand"></i> Expandir';
    btn.classList.replace('btn-danger', 'btn-outline-secondary');
  }

  // Recalcular el tamaño del editor CodeMirror
  setTimeout(() => {
    if(editorCodeMirror) editorCodeMirror.refresh();
  }, 200);
};

// --- 3. CARGAR PROYECTOS DESDE FIREBASE ---
window.cargarProyectosCorreo = async function() {
  const contenedor = document.getElementById('vista-proyectos');
  if(!contenedor) return;

  try {
    const snapshot = await db.collection("correos_brevo").orderBy("fechaActualizacion", "desc").get();
    
    let html = `
    <div class="col-12 col-md-4 col-lg-3 mb-4">
      <div class="ios-card d-flex flex-column align-items-center justify-content-center h-100 shadow-sm" style="min-height: 200px; cursor: pointer; border: 2px dashed #007bff; background-color: rgba(0, 123, 255, 0.05);" onclick="abrirEditorCorreo('nuevo')">
        <i class="fas fa-plus fa-3x mb-2 text-primary"></i>
        <h5 class="text-primary mt-2">Nuevo Proyecto</h5>
      </div>
    </div>`;

    snapshot.forEach(doc => {
      const data = doc.data();
      const fecha = data.fechaActualizacion ? data.fechaActualizacion.toDate().toLocaleDateString() : 'Reciente';
      const nombreSeguro = data.nombre ? data.nombre.replace(/'/g, "\\'") : 'Sin nombre';
      const contenidoB64 = btoa(unescape(encodeURIComponent(data.codigo || '')));

      html += `
      <div class="col-12 col-md-4 col-lg-3 mb-4">
        <div class="ios-card d-flex flex-column justify-content-between h-100 shadow-sm" style="min-height: 200px; cursor: pointer;" onclick="abrirEditorCorreo('${doc.id}', '${nombreSeguro}', '${contenidoB64}')">
          <div>
            <h5 class="fw-bold">${data.nombre}</h5>
            <p class="text-muted" style="font-size: 0.85rem;">Última edición: ${fecha}</p>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="badge bg-success">Guardado</span>
            <i class="fas fa-edit text-secondary"></i>
          </div>
        </div>
      </div>`;
    });

    contenedor.innerHTML = html;
  } catch (error) {
    console.error("Error cargando plantillas:", error);
  }
};

// --- 4. ABRIR EL EDITOR ---
window.abrirEditorCorreo = function(id, nombre = '', contenidoB64 = '') {
  document.getElementById('vista-proyectos').classList.add('d-none');
  document.getElementById('vista-editor').classList.remove('d-none');
  
  const inputTitulo = document.getElementById('input-titulo-proyecto');
  const textareaHtml = document.getElementById('codigo-html');
  proyectoActualId = id === 'nuevo' ? null : id;

  if (!editorCodeMirror) {
    editorCodeMirror = CodeMirror.fromTextArea(textareaHtml, {
      mode: "xml",
      theme: "monokai",
      lineNumbers: true,
      autoCloseTags: true,
      lineWrapping: true
    });
    
    editorCodeMirror.on('change', () => {
      window.actualizarPreview();
    });
  }

  if (id === 'nuevo') {
    inputTitulo.value = 'Nueva Campaña Brevo';
    editorCodeMirror.setValue('');
  } else {
    inputTitulo.value = nombre;
    editorCodeMirror.setValue(decodeURIComponent(escape(atob(contenidoB64))));
  }
  
  setTimeout(() => {
    editorCodeMirror.refresh();
    editorCodeMirror.focus();
    window.actualizarPreview();
  }, 100);
};

// --- 5. GUARDAR PROYECTO EN FIREBASE ---
window.guardarProyectoCorreo = async function() {
  const inputTitulo = document.getElementById('input-titulo-proyecto');
  const btnGuardar = document.getElementById('btn-guardar-correo');
  
  const nombre = inputTitulo.value.trim() || 'Campaña sin nombre';
  const codigo = editorCodeMirror ? editorCodeMirror.getValue() : ''; 
  
  btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  btnGuardar.disabled = true;

  const datos = {
    nombre: nombre,
    codigo: codigo,
    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (proyectoActualId) {
      await db.collection("correos_brevo").doc(proyectoActualId).update(datos);
    } else {
      datos.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection("correos_brevo").add(datos);
      proyectoActualId = docRef.id; 
    }
    
    btnGuardar.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
    btnGuardar.classList.replace('btn-primary', 'btn-success');
    window.cargarProyectosCorreo();

    setTimeout(() => {
      btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Plantilla';
      btnGuardar.classList.replace('btn-success', 'btn-primary');
      btnGuardar.disabled = false;
    }, 2000);

  } catch (error) {
    console.error("Error al guardar:", error);
    alert("Hubo un error al guardar. Revisa la consola.");
    btnGuardar.disabled = false;
  }
};

// --- 6. FUNCIONES DE VISTA Y UTILIDADES ---
window.volverAProyectos = function() {
  // Si estaba en pantalla completa, lo achicamos al salir
  const colEditor = document.getElementById('columna-editor-codigo');
  if (colEditor.classList.contains('editor-fullscreen')) {
    window.toggleFullscreen();
  }

  document.getElementById('vista-editor').classList.add('d-none');
  document.getElementById('vista-proyectos').classList.remove('d-none');
};

window.actualizarPreview = function() {
  const iframe = document.getElementById('preview-iframe');
  if (!iframe || !editorCodeMirror) return;

  const codigo = editorCodeMirror.getValue();
  const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
  frameDoc.open();
  frameDoc.write(codigo);
  frameDoc.close();
};

window.cambiarVistaPreview = function(tipo) {
  const iframe = document.getElementById('preview-iframe');
  const btnWeb = document.getElementById('btn-vista-web');
  const btnMovil = document.getElementById('btn-vista-movil');

  if (tipo === 'movil') {
    iframe.style.width = '375px'; 
    btnMovil.classList.add('active');
    btnWeb.classList.remove('active');
  } else {
    iframe.style.width = '100%'; 
    btnWeb.classList.add('active');
    btnMovil.classList.remove('active');
  }
};

window.copiarCodigo = function() {
  if(!editorCodeMirror) return;
  navigator.clipboard.writeText(editorCodeMirror.getValue()).then(() => {
    alert("¡Código copiado al portapapeles listo para Brevo!");
  });
};

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
  window.cargarConfiguracionSnippets(); // Carga tus bloques personalizados
  window.cargarProyectosCorreo();       // Carga los proyectos guardados
});