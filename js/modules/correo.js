// Variable global para saber si estamos editando o creando uno nuevo
let proyectoActualId = null;

// --- 1. CARGAR PROYECTOS DESDE FIREBASE ---
window.cargarProyectosCorreo = async function() {
  const contenedor = document.getElementById('vista-proyectos');
  
  try {
    // Consultamos la colección "correos_brevo" ordenada por fecha
    const snapshot = await db.collection("correos_brevo").orderBy("fechaActualizacion", "desc").get();
    
    // El primer botón siempre será el de "Nuevo Proyecto"
    let html = `
    <div class="col-12 col-md-4 col-lg-3 mb-4">
      <div class="ios-card d-flex flex-column align-items-center justify-content-center h-100 shadow-sm" style="min-height: 200px; cursor: pointer; border: 2px dashed #007bff; background-color: rgba(0, 123, 255, 0.05);" onclick="abrirEditorCorreo('nuevo')">
        <i class="fas fa-plus fa-3x mb-2 text-primary"></i>
        <h5 class="text-primary mt-2">Nuevo Proyecto</h5>
      </div>
    </div>`;

    // Recorremos los guardados en Firebase
    snapshot.forEach(doc => {
      const data = doc.data();
      const fecha = data.fechaActualizacion ? data.fechaActualizacion.toDate().toLocaleDateString() : 'Reciente';
      
      // Limpiamos los textos para que no rompan el HTML al pasarlos por parámetro
      const nombreSeguro = data.nombre ? data.nombre.replace(/'/g, "\\'") : 'Sin nombre';
      // Codificamos el HTML en Base64 para pasarlo seguro por el onclick
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
    console.error("Error cargando plantillas de correo:", error);
  }
};

// --- 2. ABRIR EL EDITOR ---
window.abrirEditorCorreo = function(id, nombre = '', contenidoB64 = '') {
  document.getElementById('vista-proyectos').classList.add('d-none');
  document.getElementById('vista-editor').classList.remove('d-none');
  
  const textarea = document.getElementById('codigo-html');
  const inputTitulo = document.getElementById('input-titulo-proyecto');

  // Si es nuevo, el ID queda nulo. Si es uno existente, guardamos su ID.
  proyectoActualId = id === 'nuevo' ? null : id;

  if (id === 'nuevo') {
    inputTitulo.value = 'Nueva Campaña Brevo';
    textarea.value = '';
  } else {
    inputTitulo.value = nombre;
    // Decodificamos el Base64 a texto HTML normal
    textarea.value = decodeURIComponent(escape(atob(contenidoB64)));
  }
  
  setTimeout(() => {
    window.actualizarPreview();
  }, 50);
};

// --- 3. GUARDAR EN FIREBASE ---
window.guardarProyectoCorreo = async function() {
  const inputTitulo = document.getElementById('input-titulo-proyecto');
  const textarea = document.getElementById('codigo-html');
  const btnGuardar = document.getElementById('btn-guardar-correo');
  
  const nombre = inputTitulo.value.trim() || 'Campaña sin nombre';
  const codigo = textarea.value;
  
  // Estado de carga en el botón
  btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  btnGuardar.disabled = true;

  const datos = {
    nombre: nombre,
    codigo: codigo,
    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (proyectoActualId) {
      // Actualizar proyecto existente
      await db.collection("correos_brevo").doc(proyectoActualId).update(datos);
    } else {
      // Crear proyecto nuevo
      datos.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await db.collection("correos_brevo").add(datos);
      proyectoActualId = docRef.id; // Lo guardamos por si vuelve a darle a "Guardar" sin salir
    }
    
    // Feedback visual de éxito
    btnGuardar.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
    btnGuardar.classList.replace('btn-primary', 'btn-success');
    
    // Refrescamos la lista de proyectos en segundo plano
    window.cargarProyectosCorreo();

    // Restauramos el botón después de 2 segundos
    setTimeout(() => {
      btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Plantilla';
      btnGuardar.classList.replace('btn-success', 'btn-primary');
      btnGuardar.disabled = false;
    }, 2000);

  } catch (error) {
    console.error("Error al guardar en Firebase:", error);
    alert("Hubo un error al guardar. Revisa la consola.");
    btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Plantilla';
    btnGuardar.disabled = false;
  }
};

// --- 4. FUNCIONES DE VISTA Y UTILIDADES ---
window.volverAProyectos = function() {
  document.getElementById('vista-editor').classList.add('d-none');
  document.getElementById('vista-proyectos').classList.remove('d-none');
};

window.actualizarPreview = function() {
  const codigoHtml = document.getElementById('codigo-html');
  const iframe = document.getElementById('preview-iframe');
  
  if (!codigoHtml || !iframe) return;

  const codigo = codigoHtml.value;
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
  const textarea = document.getElementById('codigo-html');
  textarea.select();
  document.execCommand('copy');
  alert("¡Código copiado al portapapeles listo para Brevo!");
};

// --- INICIALIZACIÓN ---
document.addEventListener("DOMContentLoaded", () => {
  const codigoHtml = document.getElementById('codigo-html');
  
  // Escuchar escritura
  if (codigoHtml) {
    codigoHtml.addEventListener('input', window.actualizarPreview);
  }

  // Cargar los proyectos guardados apenas entra a la página
  window.cargarProyectosCorreo();
});