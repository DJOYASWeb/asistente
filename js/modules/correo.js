let proyectoActualId = null;
let editorCodeMirror = null;

// --- 1. CARGAR PROYECTOS DESDE FIREBASE ---
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

// --- 2. ABRIR EL EDITOR ---
window.abrirEditorCorreo = function(id, nombre = '', contenidoB64 = '') {
  document.getElementById('vista-proyectos').classList.add('d-none');
  document.getElementById('vista-editor').classList.remove('d-none');
  
  const inputTitulo = document.getElementById('input-titulo-proyecto');
  const textareaHtml = document.getElementById('codigo-html');
  proyectoActualId = id === 'nuevo' ? null : id;

  // Inicializar CodeMirror SOLO si no existe, y cuando el div ya está visible
  if (!editorCodeMirror) {
    editorCodeMirror = CodeMirror.fromTextArea(textareaHtml, {
      mode: "xml",
      theme: "monokai",
      lineNumbers: true,
      autoCloseTags: true,
      lineWrapping: true
    });
    
    // Evento para actualizar la vista previa al escribir
    editorCodeMirror.on('change', () => {
      window.actualizarPreview();
    });
  }

  // Setear el contenido según si es nuevo o guardado
  if (id === 'nuevo') {
    inputTitulo.value = 'Nueva Campaña Brevo';
    editorCodeMirror.setValue('');
  } else {
    inputTitulo.value = nombre;
    editorCodeMirror.setValue(decodeURIComponent(escape(atob(contenidoB64))));
  }
  
  // Forzar un refresh visual del editor
  setTimeout(() => {
    editorCodeMirror.refresh();
    editorCodeMirror.focus();
    window.actualizarPreview();
  }, 100);
};

// --- 3. GUARDAR EN FIREBASE ---
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
    btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Plantilla';
    btnGuardar.disabled = false;
  }
};

// --- 4. MOTOR DE INYECCIÓN DE BLOQUES ---
window.inyectarCodigo = function(tipo) {
  if(!editorCodeMirror) return;
  
  let snippet = "";
  
  switch(tipo) {
    case 'titulo':
      snippet = `\n<h2 style="color: #333333; font-family: Arial, sans-serif; text-align: center; margin: 20px 0;">¡Nuevas Joyas Disponibles!</h2>\n`;
      break;
    case 'boton':
      snippet = `\n<div style="text-align: center; margin: 20px 0;">\n  <a href="https://distribuidoradejoyas.cl" style="background-color: #d9534f; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-family: Arial, sans-serif; font-weight: bold; font-size: 16px;">Comprar Ahora</a>\n</div>\n`;
      break;
    case 'espacio':
      snippet = `\n<div style="height: 30px; line-height: 30px; font-size: 30px;">&nbsp;</div>\n`;
      break;
    case 'footer':
      snippet = `\n<div style="background-color: #f8f9fa; padding: 30px 20px; text-align: center; font-family: Arial, sans-serif; font-size: 12px; color: #777777;">\n  <p><strong>DJOYAS</strong> - Tu estilo en joyas de plata y enchapadas.</p>\n  <p>Enviado a {{ contact.EMAIL }} porque te suscribiste en nuestro sitio.</p>\n  <a href="{{ unsubscribe }}" style="color: #d9534f; text-decoration: underline;">Haz clic aquí para dejar de recibir estos correos</a>\n</div>\n`;
      break;
    case 'var_nombre':
      snippet = `{{ contact.FIRSTNAME }}`;
      break;
    case 'var_espejo':
      snippet = `{{ mirror }}`;
      break;
    case 'var_baja':
      snippet = `{{ unsubscribe }}`;
      break;
  }

  editorCodeMirror.replaceSelection(snippet);
  editorCodeMirror.focus();
};

// --- 5. FUNCIONES DE VISTA Y UTILIDADES ---
window.volverAProyectos = function() {
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
  // Solo cargamos los proyectos, CodeMirror se inicializa al abrir uno
  window.cargarProyectosCorreo();
});