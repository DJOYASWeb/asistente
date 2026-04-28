// ═══════════════════════════════════════════════
//  web.js  —  Redactor Web con tabs laterales
// ═══════════════════════════════════════════════

let webProyectoActualId  = null;
let webTabActual         = 'maquetas';
let editorWebCodeMirror  = null;
let webConfigBloques     = { bloques: [], snippets: [] };
let webEditandoTipo      = null;
let webEditandoIndex     = null;

// ─── Meta de cada tab ────────────────────────────
const WEB_TABS = {
  maquetas: {
    label:       'Maquetas',
    icon:        'fas fa-drafting-compass',
    badge:       'badge-maquetas',
    desc:        'Prototipos y estructuras visuales de páginas',
    coleccion:   'web_maquetas',
    modoEditor:  'htmlmixed',
  },
  sistema: {
    label:       'Sistema Gráfico',
    icon:        'fas fa-palette',
    badge:       'badge-sistema',
    desc:        'Tokens de color, tipografía y guías de estilo',
    coleccion:   'web_sistema',
    modoEditor:  'htmlmixed',
  },
  clases: {
    label:       'Clases',
    icon:        'fas fa-tags',
    badge:       'badge-clases',
    desc:        'Componentes y clases CSS reutilizables',
    coleccion:   'web_clases',
    modoEditor:  'css',
  },
  css: {
    label:       'CSS',
    icon:        'fab fa-css3-alt',
    badge:       'badge-css',
    desc:        'Hojas de estilo globales y variables CSS',
    coleccion:   'web_css',
    modoEditor:  'css',
  },
  js: {
    label:       'JavaScript',
    icon:        'fab fa-js',
    badge:       'badge-js',
    desc:        'Módulos y scripts del sitio',
    coleccion:   'web_js',
    modoEditor:  'javascript',
  },
};

// ─── 1. CAMBIAR TAB ──────────────────────────────
window.cambiarTabWeb = function(tab) {
  webTabActual = tab;
  const meta   = WEB_TABS[tab];

  // Activar botón lateral
  document.querySelectorAll('.web-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');

  // Actualizar badge y descripción del panel
  const badge = document.getElementById('web-tipo-badge');
  badge.className = 'tipo-label ' + meta.badge;
  badge.innerHTML = `<i class="${meta.icon}"></i>&nbsp;${meta.label}`;
  document.getElementById('web-tipo-desc').textContent = meta.desc;

  // Cargar proyectos del tab
  cargarProyectosWebTab(tab);
};

// ─── 2. CARGAR PROYECTOS DEL TAB ─────────────────
async function cargarProyectosWebTab(tab) {
  const grid     = document.getElementById('grid-proyectos-web');
  const meta     = WEB_TABS[tab];
  grid.innerHTML = '<div class="text-muted small p-2">Cargando...</div>';

  try {
    const snap = await db.collection(meta.coleccion)
      .orderBy('fechaActualizacion', 'desc')
      .get();

    let html = `
      <div class="web-proyecto-card nuevo" onclick="abrirEditorWeb('nuevo')">
        <i class="fas fa-plus"></i>
        <span>Nuevo</span>
      </div>`;

    snap.forEach(doc => {
      const d    = doc.data();
      const fecha = d.fechaActualizacion
        ? d.fechaActualizacion.toDate().toLocaleDateString('es-CL')
        : '—';
      const nombreSeguro = (d.nombre || 'Sin nombre').replace(/'/g, "\\'");
      const contenidoB64 = btoa(unescape(encodeURIComponent(d.codigo || '')));

      html += `
        <div class="web-proyecto-card" onclick="abrirEditorWeb('${doc.id}', '${nombreSeguro}', '${contenidoB64}')">
          <div>
            <div class="card-nombre">${d.nombre || 'Sin nombre'}</div>
            <span class="badge-tipo ${meta.badge}">${meta.label}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <span class="card-fecha">${fecha}</span>
            <i class="fas fa-edit text-secondary" style="font-size:0.8rem;"></i>
          </div>
        </div>`;
    });

    grid.innerHTML = html;

  } catch (err) {
    console.error('Error cargando proyectos web:', err);
    grid.innerHTML = '<div class="text-danger small p-2">Error al cargar.</div>';
  }
}

// ─── 3. ABRIR EDITOR ─────────────────────────────
window.abrirEditorWeb = function(id, nombre = '', contenidoB64 = '') {
  const meta = WEB_TABS[webTabActual];

  // Ocultar vista proyectos y cabecera
  document.getElementById('cabecera-principal-web').classList.add('d-none');
  document.getElementById('vista-proyectos-web').style.display = 'none';
  document.getElementById('vista-editor-web').classList.remove('d-none');

  webProyectoActualId = id === 'nuevo' ? null : id;

  const textarea = document.getElementById('codigo-web');

  if (!editorWebCodeMirror) {
    editorWebCodeMirror = CodeMirror.fromTextArea(textarea, {
      mode:          meta.modoEditor,
      theme:         'monokai',
      lineNumbers:   true,
      autoCloseTags: true,
      lineWrapping:  true,
    });
    editorWebCodeMirror.on('change', () => actualizarPreviewWeb());
  }

  // Ajustar modo al tipo de tab
  editorWebCodeMirror.setOption('mode', meta.modoEditor);
  document.getElementById('selector-modo-web').value = meta.modoEditor;

  // Contenido
  document.getElementById('input-titulo-web').value = id === 'nuevo' ? 'Nuevo archivo' : nombre;
  editorWebCodeMirror.setValue(id === 'nuevo' ? '' : decodeURIComponent(escape(atob(contenidoB64))));

  setTimeout(() => {
    editorWebCodeMirror.refresh();
    editorWebCodeMirror.focus();
    actualizarPreviewWeb();
  }, 100);

  renderizarBotoneraWeb();
};

// ─── 4. VOLVER A PROYECTOS ───────────────────────
window.volverAProyectosWeb = function() {
  // Salir de fullscreen si está activo
  const col = document.getElementById('columna-editor-web');
  if (col && col.classList.contains('editor-fullscreen-web')) toggleFullscreenWeb();

  document.getElementById('vista-editor-web').classList.add('d-none');
  document.getElementById('cabecera-principal-web').classList.remove('d-none');
  document.getElementById('vista-proyectos-web').style.display = 'flex';
};

// ─── 5. GUARDAR PROYECTO ─────────────────────────
window.guardarProyectoWeb = async function() {
  const meta    = WEB_TABS[webTabActual];
  const btn     = document.getElementById('btn-guardar-web');
  const nombre  = document.getElementById('input-titulo-web').value.trim() || 'Sin nombre';
  const codigo  = editorWebCodeMirror ? editorWebCodeMirror.getValue() : '';

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
  btn.disabled  = true;

  const datos = {
    nombre,
    codigo,
    tipo:               webTabActual,
    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    if (webProyectoActualId) {
      await db.collection(meta.coleccion).doc(webProyectoActualId).update(datos);
    } else {
      datos.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
      const ref           = await db.collection(meta.coleccion).add(datos);
      webProyectoActualId = ref.id;
    }

    btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
    btn.classList.replace('btn-primary', 'btn-success');

    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
      btn.classList.replace('btn-success', 'btn-primary');
      btn.disabled  = false;
    }, 2000);

  } catch (err) {
    console.error('Error guardando:', err);
    alert('Error al guardar. Revisa la consola.');
    btn.disabled = false;
  }
};

// ─── 6. PREVIEW ──────────────────────────────────
window.actualizarPreviewWeb = function() {
  const iframe = document.getElementById('preview-iframe-web');
  if (!iframe || !editorWebCodeMirror) return;
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(editorWebCodeMirror.getValue()); doc.close();
};

window.cambiarVistaPreviewWeb = function(tipo) {
  const iframe   = document.getElementById('preview-iframe-web');
  const btnPC    = document.getElementById('btn-pc-web');
  const btnTab   = document.getElementById('btn-tablet-web');
  const btnMov   = document.getElementById('btn-movil-web');

  [btnPC, btnTab, btnMov].forEach(b => b.classList.remove('active'));

  if (tipo === 'movil') {
    iframe.style.width = '375px'; btnMov.classList.add('active');
  } else if (tipo === 'tablet') {
    iframe.style.width = '768px'; btnTab.classList.add('active');
  } else {
    iframe.style.width = '100%';  btnPC.classList.add('active');
  }
};

window.abrirEnNuevaVentanaWeb = function() {
  if (!editorWebCodeMirror) return;
  const blob = new Blob([editorWebCodeMirror.getValue()], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
};

// ─── 7. FULLSCREEN / COPIAR / MODO ───────────────
window.toggleFullscreenWeb = function() {
  const col = document.getElementById('columna-editor-web');
  const btn = document.getElementById('btn-fullscreen-web');
  col.classList.toggle('editor-fullscreen-web');
  const full = col.classList.contains('editor-fullscreen-web');
  btn.innerHTML = full
    ? '<i class="fas fa-compress"></i> Achicar'
    : '<i class="fas fa-expand"></i> Expandir';
  btn.classList.toggle('btn-danger', full);
  btn.classList.toggle('btn-outline-secondary', !full);
  setTimeout(() => editorWebCodeMirror && editorWebCodeMirror.refresh(), 200);
};

window.copiarCodigoWeb = function() {
  if (!editorWebCodeMirror) return;
  navigator.clipboard.writeText(editorWebCodeMirror.getValue())
    .then(() => alert('¡Código copiado!'));
};

window.cambiarModoEditorWeb = function(modo) {
  if (editorWebCodeMirror) editorWebCodeMirror.setOption('mode', modo);
};

// ─── 8. CONFIGURACIÓN DE BLOQUES ─────────────────
window.cargarConfiguracionWebSnippets = async function() {
  try {
    const doc = await db.collection('configuraciones').doc('editor_web').get();
    webConfigBloques = doc.exists
      ? doc.data()
      : { bloques: [], snippets: [] };
    renderizarBotoneraWeb();
  } catch (err) {
    console.error('Error cargando config web:', err);
  }
};

window.renderizarBotoneraWeb = function() {
  const tbBloques  = document.getElementById('toolbar-bloques-web');
  const tbSnippets = document.getElementById('toolbar-snippets-web');
  if (!tbBloques || !tbSnippets) return;

  let hB = `<span class="text-muted small fw-bold mt-1 w-100">Bloques Rápidos:</span>`;
  (webConfigBloques.bloques || []).forEach(b => {
    const c = btoa(unescape(encodeURIComponent(b.codigo)));
    hB += `<button class="btn btn-sm btn-dark" onclick="inyectarCodigoWeb('${c}')">
              <i class="fas fa-layer-group"></i> ${b.nombre}
           </button>`;
  });
  tbBloques.innerHTML = hB;

  let hS = `<span class="text-muted small fw-bold mt-1 w-100">Snippets:</span>`;
  (webConfigBloques.snippets || []).forEach(s => {
    const c = btoa(unescape(encodeURIComponent(s.codigo)));
    hS += `<button class="btn btn-sm btn-outline-info" onclick="inyectarCodigoWeb('${c}')">
              { } ${s.nombre}
           </button>`;
  });
  tbSnippets.innerHTML = hS;
};

window.inyectarCodigoWeb = function(b64) {
  if (!editorWebCodeMirror) return;
  editorWebCodeMirror.replaceSelection(decodeURIComponent(escape(atob(b64))));
  editorWebCodeMirror.focus();
};

// ─── 9. VISTA CONFIGURACIÓN ──────────────────────
window.abrirVistaConfiguracionWeb = function() {
  renderizarListaConfiguracionWeb();
  document.getElementById('cabecera-principal-web').classList.add('d-none');
  document.getElementById('vista-proyectos-web').style.display = 'none';
  document.getElementById('vista-configuracion-web').classList.remove('d-none');
};

window.volverDesdeConfiguracionWeb = function() {
  document.getElementById('vista-configuracion-web').classList.add('d-none');
  document.getElementById('cabecera-principal-web').classList.remove('d-none');
  document.getElementById('vista-proyectos-web').style.display = 'flex';
};

window.renderizarListaConfiguracionWeb = function() {
  const lista = document.getElementById('lista-configuracion-web');
  const esc   = s => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html    = '';

  html += `<h6 class="fw-bold text-primary mt-2">Bloques HTML</h6>`;
  (webConfigBloques.bloques || []).forEach((b, i) => {
    html += itemConfigWeb('bloques', i, b.nombre, esc(b.codigo));
  });

  html += `<h6 class="fw-bold text-info mt-4">Snippets CSS / JS</h6>`;
  (webConfigBloques.snippets || []).forEach((s, i) => {
    html += itemConfigWeb('snippets', i, s.nombre, esc(s.codigo));
  });

  lista.innerHTML = html;
};

function itemConfigWeb(tipo, i, nombre, codigoEsc) {
  return `
  <div class="list-group-item d-flex justify-content-between align-items-center bg-white mb-2 border rounded shadow-sm">
    <div>
      <strong>${nombre}</strong><br>
      <span class="text-muted small" style="font-family:monospace;">${codigoEsc.substring(0,60)}...</span>
    </div>
    <div>
      <button class="btn btn-sm btn-outline-primary me-2" onclick="abrirModalEdicionWeb('${tipo}', ${i})">
        <i class="fas fa-edit"></i>
      </button>
      <button class="btn btn-sm btn-outline-danger" onclick="eliminarSnippetWeb('${tipo}', ${i})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </div>`;
}

window.abrirModalEdicionWeb = function(tipo = null, index = null) {
  webEditandoTipo  = tipo;
  webEditandoIndex = index;
  const titulo     = document.getElementById('tituloModalWeb');

  if (index !== null) {
    titulo.innerHTML = '<i class="fas fa-pen"></i> Editar Bloque';
    document.getElementById('web-config-tipo').value   = tipo;
    document.getElementById('web-config-nombre').value = webConfigBloques[tipo][index].nombre;
    document.getElementById('web-config-codigo').value = webConfigBloques[tipo][index].codigo;
  } else {
    titulo.innerHTML = '<i class="fas fa-plus"></i> Nuevo Bloque';
    document.getElementById('web-config-tipo').value   = 'bloques';
    document.getElementById('web-config-nombre').value = '';
    document.getElementById('web-config-codigo').value = '';
  }

  document.getElementById('modalEdicionWeb').style.display = 'block';
};

window.cerrarModalEdicionWeb = function() {
  document.getElementById('modalEdicionWeb').style.display = 'none';
};

window.guardarSnippetModalWeb = function() {
  const tipo   = document.getElementById('web-config-tipo').value;
  const nombre = document.getElementById('web-config-nombre').value.trim();
  const codigo = document.getElementById('web-config-codigo').value;

  if (!nombre || !codigo) { alert('Completa nombre y código.'); return; }

  if (!webConfigBloques[tipo]) webConfigBloques[tipo] = [];

  if (webEditandoIndex !== null) {
    if (webEditandoTipo !== tipo) {
      webConfigBloques[webEditandoTipo].splice(webEditandoIndex, 1);
      webConfigBloques[tipo].push({ nombre, codigo });
    } else {
      webConfigBloques[tipo][webEditandoIndex] = { nombre, codigo };
    }
  } else {
    webConfigBloques[tipo].push({ nombre, codigo });
  }

  renderizarListaConfiguracionWeb();
  cerrarModalEdicionWeb();
};

window.eliminarSnippetWeb = function(tipo, index) {
  if (confirm('¿Eliminar este bloque?')) {
    webConfigBloques[tipo].splice(index, 1);
    renderizarListaConfiguracionWeb();
  }
};

window.guardarConfiguracionWebFirebase = async function() {
  try {
    await db.collection('configuraciones').doc('editor_web').set(webConfigBloques);
    alert('¡Configuración guardada!');
    renderizarBotoneraWeb();
    volverDesdeConfiguracionWeb();
  } catch (err) {
    console.error('Error:', err);
    alert('Error al guardar.');
  }
};

// ─── INICIALIZACIÓN ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracionWebSnippets();
  cambiarTabWeb('maquetas'); // carga el tab por defecto
});

// v1