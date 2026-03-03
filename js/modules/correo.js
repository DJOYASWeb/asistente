// --- LÓGICA DE NAVEGACIÓN ---

function abrirEditorCorreo(nombreProyecto) {
  // Ocultar cuadrícula, mostrar editor
  document.getElementById('vista-proyectos').classList.add('d-none');
  document.getElementById('vista-editor').classList.remove('d-none');
  
  const textarea = document.getElementById('codigo-html');

  if (nombreProyecto === 'nuevo') {
    document.getElementById('titulo-proyecto').innerText = 'Nuevo Proyecto';
    textarea.value = ''; // Limpiar textarea
  } else {
    document.getElementById('titulo-proyecto').innerText = nombreProyecto;
    // Aquí a futuro cargarás el HTML desde Firebase. Por ahora un texto de prueba:
    textarea.value = '<div style="text-align:center; padding: 20px; font-family: Arial;">\n  <h1 style="color:#d9534f;">' + nombreProyecto + '</h1>\n  <p>Este es un texto de prueba para Brevo.</p>\n</div>';
  }
  actualizarPreview();
}

function volverAProyectos() {
  // Ocultar editor, mostrar cuadrícula
  document.getElementById('vista-editor').classList.add('d-none');
  document.getElementById('vista-proyectos').classList.remove('d-none');
}

// --- LÓGICA DE PREVISUALIZACIÓN EN TIEMPO REAL ---

const codigoHtml = document.getElementById('codigo-html');

// Escuchar cada vez que escribes en el textarea
codigoHtml.addEventListener('input', actualizarPreview);

function actualizarPreview() {
  const codigo = codigoHtml.value;
  const iframe = document.getElementById('preview-iframe');
  
  // Inyectar el código dentro del iframe
  const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
  frameDoc.open();
  frameDoc.write(codigo);
  frameDoc.close();
}

// --- LÓGICA DEL TIPO DE VISTA (WEB / MÓVIL) ---

function cambiarVistaPreview(tipo) {
  const iframe = document.getElementById('preview-iframe');
  const btnWeb = document.getElementById('btn-vista-web');
  const btnMovil = document.getElementById('btn-vista-movil');

  if (tipo === 'movil') {
    // Reducir el ancho para simular un celular (aprox 375px)
    iframe.style.width = '375px'; 
    btnMovil.classList.add('active');
    btnWeb.classList.remove('active');
  } else {
    // Ancho completo para simular PC
    iframe.style.width = '100%'; 
    btnWeb.classList.add('active');
    btnMovil.classList.remove('active');
  }
}

// Utilidad para copiar rápido el código para llevarlo a Brevo
function copiarCodigo() {
  const textarea = document.getElementById('codigo-html');
  textarea.select();
  document.execCommand('copy');
  alert("¡Código copiado al portapapeles!");
}