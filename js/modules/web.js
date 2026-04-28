// ═══════════════════════════════════════════════════════
//  web.js  —  Redactor Web con biblioteca CSS/JS
// ═══════════════════════════════════════════════════════

let webProyectoActualId = null;
let webTabActual        = 'maquetas';
let editorWebCM         = null;           // instancia CodeMirror
let webConfigBloques    = { bloques: [], snippets: [] };
let webEditandoTipo     = null;
let webEditandoIndex    = null;

// Cache de la biblioteca (se carga una vez al abrir el editor)
let webBiblioteca = {
  clases : [],   // [{ nombre, codigo }]
  css    : [],
  js     : [],
};

// ─── Meta de cada tab ───────────────────────────────────
const WEB_TABS = {
  maquetas: {
    label:      'Maquetas',
    icon:       'fas fa-drafting-compass',
    badge:      'badge-maquetas',
    desc:       'Prototipos y estructuras visuales de páginas',
    coleccion:  'web_maquetas',
    modo:       'htmlmixed',
    usaBiblioteca: true,
  },
  sistema: {
    label:      'Sistema Gráfico',
    icon:       'fas fa-palette',
    badge:      'badge-sistema',
    desc:       'Tokens de color, tipografía y guías de estilo',
    coleccion:  'web_sistema',
    modo:       'htmlmixed',
    usaBiblioteca: true,
  },
  clases: {
    label:      'Clases',
    icon:       'fas fa-tags',
    badge:      'badge-clases',
    desc:       'Clases CSS reutilizables — forman parte de la biblioteca',
    coleccion:  'web_clases',
    modo:       'css',
    usaBiblioteca: false,
  },
  css: {
    label:      'CSS',
    icon:       'fab fa-css3-alt',
    badge:      'badge-css',
    desc:       'Estilos globales y variables CSS — forman parte de la biblioteca',
    coleccion:  'web_css',
    modo:       'css',
    usaBiblioteca: false,
  },
  js: {
    label:      'JavaScript',
    icon:       'fab fa-js',
    badge:      'badge-js',
    desc:       'Módulos y funciones JS — forman parte de la biblioteca',
    coleccion:  'web_js',
    modo:       'javascript',
    usaBiblioteca: false,
  },
};

// ─── 1. CAMBIAR TAB ─────────────────────────────────────
window.cambiarTabWeb = function(tab) {
  webTabActual = tab;
  const meta   = WEB_TABS[tab];

  document.querySelectorAll('.web-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');

  const badge     = document.getElementById('web-tipo-badge');
  badge.className = 'tipo-label ' + meta.badge;
  badge.innerHTML = `<i class="${meta.icon}"></i>&nbsp;${meta.label}`;
  document.getElementById('web-tipo-desc').textContent = meta.desc;

  // Indicador visual si el tab es biblioteca
  const ind = document.getElementById('web-biblioteca-ind');
  if (ind) {
    ind.style.display = meta.usaBiblioteca ? 'none' : 'inline-flex';
  }

  cargarProyectosWebTab(tab);
};

// ─── 2. CARGAR PROYECTOS ────────────────────────────────
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
      const d     = doc.data();
      const fecha = d.fechaActualizacion
        ? d.fechaActualizacion.toDate().toLocaleDateString('es-CL')
        : '—';
      const nombreSeguro  = (d.nombre || 'Sin nombre').replace(/'/g, "\\'");
      const contenidoB64  = btoa(unescape(encodeURIComponent(d.codigo || '')));

        html += `
        <div class="web-proyecto-card" onclick="abrirEditorWeb('${doc.id}','${nombreSeguro}','${contenidoB64}')">
            <div class="card-preview-wrap">
            <iframe class="card-preview-iframe" scrolling="no" sandbox="allow-scripts"></iframe>
            </div>
            <div class="card-footer-info">
            <div class="card-nombre">${d.nombre || 'Sin nombre'}</div>
            <div class="d-flex justify-content-between align-items-center mt-1">
                <span class="badge-tipo ${meta.badge}">${meta.label}</span>
                <span class="card-fecha">${fecha}</span>
            </div>
            </div>
        </div>`;
    });

    grid.innerHTML = html;
    // Renderizar miniaturas
document.querySelectorAll('.card-preview-iframe').forEach((iframe, i) => {
  const codigo = snap.docs[i]?.data().codigo || '';
  const html   = buildPreviewHTML(codigo);
  const blob   = new Blob([html], { type: 'text/html' });
  iframe.src   = URL.createObjectURL(blob);
});
  } catch (err) {
    console.error('Error cargando proyectos:', err);
    grid.innerHTML = '<div class="text-danger small p-2">Error al cargar.</div>';
  }
}

// ─── 3. CARGAR BIBLIOTECA (CSS + Clases + JS) ───────────
async function cargarBibliotecaWeb() {
  try {
    const [snapClases, snapCSS, snapJS] = await Promise.all([
      db.collection('web_clases').get(),
      db.collection('web_css').get(),
      db.collection('web_js').get(),
    ]);

    webBiblioteca.clases = snapClases.docs.map(d => ({ nombre: d.data().nombre, codigo: d.data().codigo || '' }));
    webBiblioteca.css    = snapCSS.docs.map(d    => ({ nombre: d.data().nombre, codigo: d.data().codigo || '' }));
    webBiblioteca.js     = snapJS.docs.map(d     => ({ nombre: d.data().nombre, codigo: d.data().codigo || '' }));

  } catch (err) {
    console.error('Error cargando biblioteca:', err);
  }
}

// Arma el HTML completo para el preview inyectando la biblioteca
function buildPreviewHTML(codigoUsuario) {
  const meta = WEB_TABS[webTabActual];

  // Si el tab NO usa biblioteca (clases/css/js), preview directo
  if (!meta.usaBiblioteca) {
    // Envolvemos en HTML básico para que CSS/JS se vea bien
    if (meta.modo === 'css') {
      return `<!DOCTYPE html><html><head><style>${codigoUsuario}</style></head>
<body style="padding:1rem;font-family:sans-serif;">
  <p style="color:#888;font-size:.8rem;">← Preview de estilos (agrega HTML aquí temporalmente si quieres ver el resultado)</p>
</body></html>`;
    }
    if (meta.modo === 'javascript') {
      return `<!DOCTYPE html><html><head></head>
<body style="padding:1rem;font-family:sans-serif;">
  <p style="color:#888;font-size:.8rem;">Console output:</p>
  <pre id="out" style="background:#111;color:#0f0;padding:1rem;border-radius:8px;font-size:.8rem;"></pre>
  <script>
    const _log = console.log.bind(console);
    console.log = (...a) => { document.getElementById('out').textContent += a.join(' ') + '\\n'; _log(...a); };
    try { ${codigoUsuario} } catch(e) { document.getElementById('out').textContent += '❌ ' + e.message; }
  <\/script>
</body></html>`;
    }
    return codigoUsuario;
  }

  // Para Maquetas / Sistema: inyecta toda la biblioteca
  const cssCompleto = [
    ...webBiblioteca.css.map(p => `/* === ${p.nombre} === */\n${p.codigo}`),
    ...webBiblioteca.clases.map(p => `/* === ${p.nombre} === */\n${p.codigo}`),
  ].join('\n\n');

  const jsCompleto = webBiblioteca.js
    .map(p => `/* === ${p.nombre} === */\n${p.codigo}`)
    .join('\n\n');

  // Si el usuario ya escribió un HTML completo (tiene <html>), inyectar dentro del head/body
  if (codigoUsuario.includes('<html')) {
    const conCSS = cssCompleto
      ? codigoUsuario.replace('</head>', `<style>\n${cssCompleto}\n</style>\n</head>`)
      : codigoUsuario;
    const conJS = jsCompleto
      ? conCSS.replace('</body>', `<script>\n${jsCompleto}\n<\/script>\n</body>`)
      : conCSS;
    return conJS;
  }

  // Si es solo un fragmento HTML, lo envolvemos
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${cssCompleto}
  </style>
</head>
<body style="margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding: 1rem; box-sizing:border-box; width:100%;">

${codigoUsuario}

<script>
${jsCompleto}
<\/script>
</body>
</html>`;
}

// ─── 4. PREVIEW ─────────────────────────────────────────
window.actualizarPreviewWeb = function() {
  const iframe = document.getElementById('preview-iframe-web');
  if (!iframe || !editorWebCM) return;
  const html  = buildPreviewHTML(editorWebCM.getValue());
  const doc   = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
};

window.cambiarVistaPreviewWeb = function(tipo) {
  const iframe = document.getElementById('preview-iframe-web');
  const btns   = {
    web:    document.getElementById('btn-pc-web'),
    tablet: document.getElementById('btn-tablet-web'),
    movil:  document.getElementById('btn-movil-web'),
  };
  Object.values(btns).forEach(b => b && b.classList.remove('active'));
  const anchos = { web: '100%', tablet: '768px', movil: '375px' };
  iframe.style.width = anchos[tipo] || '100%';
  if (btns[tipo]) btns[tipo].classList.add('active');
};

window.abrirEnNuevaVentanaWeb = function() {
  if (!editorWebCM) return;
  const html = buildPreviewHTML(editorWebCM.getValue());
  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
};

// ─── 5. ABRIR EDITOR ────────────────────────────────────
window.abrirEditorWeb = async function(id, nombre = '', contenidoB64 = '') {
  const meta = WEB_TABS[webTabActual];

  // Ocultar vista proyectos
  document.getElementById('cabecera-principal-web').classList.add('d-none');
  document.getElementById('vista-proyectos-web').style.display = 'none';
  document.getElementById('vista-editor-web').classList.remove('d-none');

  // Mostrar / ocultar badge de biblioteca en el editor
  const badgeEd = document.getElementById('web-biblioteca-badge-editor');
  if (badgeEd) badgeEd.style.display = meta.usaBiblioteca ? 'inline-flex' : 'none';

  webProyectoActualId = id === 'nuevo' ? null : id;

  // Inicializar CodeMirror si primera vez
  if (!editorWebCM) {
    editorWebCM = CodeMirror.fromTextArea(document.getElementById('codigo-web'), {
      mode:          meta.modo,
      theme:         'monokai',
      lineNumbers:   true,
      autoCloseTags: true,
      lineWrapping:  true,
    });
    editorWebCM.on('change', () => actualizarPreviewWeb());
  }

  // Modo del editor según tab
  editorWebCM.setOption('mode', meta.modo);
  document.getElementById('selector-modo-web').value = meta.modo;

  // Contenido
  document.getElementById('input-titulo-web').value = id === 'nuevo' ? 'Nuevo archivo' : nombre;
  editorWebCM.setValue(id === 'nuevo' ? '' : decodeURIComponent(escape(atob(contenidoB64))));

  // Si usa biblioteca, cargarla (siempre fresca al abrir)
  if (meta.usaBiblioteca) await cargarBibliotecaWeb();

  setTimeout(() => {
    editorWebCM.refresh();
    editorWebCM.focus();
    actualizarPreviewWeb();
  }, 100);

  renderizarBotoneraWeb();
};

// ─── 6. VOLVER ──────────────────────────────────────────
window.volverAProyectosWeb = function() {
  const col = document.getElementById('columna-editor-web');
  if (col && col.classList.contains('editor-fullscreen-web')) toggleFullscreenWeb();
  document.getElementById('vista-editor-web').classList.add('d-none');
  document.getElementById('cabecera-principal-web').classList.remove('d-none');
  document.getElementById('vista-proyectos-web').style.display = 'flex';
};

// ─── 7. GUARDAR ─────────────────────────────────────────
window.guardarProyectoWeb = async function() {
  const meta   = WEB_TABS[webTabActual];
  const btn    = document.getElementById('btn-guardar-web');
  const nombre = document.getElementById('input-titulo-web').value.trim() || 'Sin nombre';
  const codigo = editorWebCM ? editorWebCM.getValue() : '';

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

    // Si guardamos en la biblioteca, refrescar cache
    if (!meta.usaBiblioteca) await cargarBibliotecaWeb();

    btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
    btn.classList.replace('btn-primary', 'btn-success');
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
      btn.classList.replace('btn-success', 'btn-primary');
      btn.disabled  = false;
    }, 2000);

  } catch (err) {
    console.error('Error guardando:', err);
    alert('Error al guardar.');
    btn.disabled = false;
  }
};

// ─── 8. FULLSCREEN / COPIAR / MODO ──────────────────────
window.toggleFullscreenWeb = function() {
  const col  = document.getElementById('columna-editor-web');
  const btn  = document.getElementById('btn-fullscreen-web');
  const full = col.classList.toggle('editor-fullscreen-web');
  btn.innerHTML = full
    ? '<i class="fas fa-compress"></i> Achicar'
    : '<i class="fas fa-expand"></i> Expandir';
  btn.classList.toggle('btn-danger', full);
  btn.classList.toggle('btn-outline-secondary', !full);
  setTimeout(() => editorWebCM && editorWebCM.refresh(), 200);
};

window.copiarCodigoWeb = function() {
  if (!editorWebCM) return;
  navigator.clipboard.writeText(editorWebCM.getValue())
    .then(() => alert('¡Código copiado!'));
};

window.cambiarModoEditorWeb = function(modo) {
  if (editorWebCM) editorWebCM.setOption('mode', modo);
};

// ─── 9. BOTONERA DE BLOQUES RÁPIDOS ─────────────────────
window.cargarConfiguracionWebSnippets = async function() {
  try {
    const doc = await db.collection('configuraciones').doc('editor_web').get();
    webConfigBloques = doc.exists ? doc.data() : { bloques: [], snippets: [] };
    renderizarBotoneraWeb();
  } catch (err) {
    console.error('Error cargando config:', err);
  }
};

window.renderizarBotoneraWeb = function() {
  const tbB = document.getElementById('toolbar-bloques-web');
  const tbS = document.getElementById('toolbar-snippets-web');
  if (!tbB || !tbS) return;

  let hB = `<span class="text-muted small fw-bold mt-1 w-100">Bloques Rápidos:</span>`;
  (webConfigBloques.bloques || []).forEach(b => {
    const c = btoa(unescape(encodeURIComponent(b.codigo)));
    hB += `<button class="btn btn-sm btn-dark" onclick="inyectarCodigoWeb('${c}')">
             <i class="fas fa-layer-group"></i> ${b.nombre}
           </button>`;
  });
  tbB.innerHTML = hB;

  let hS = `<span class="text-muted small fw-bold mt-1 w-100">Snippets:</span>`;
  (webConfigBloques.snippets || []).forEach(s => {
    const c = btoa(unescape(encodeURIComponent(s.codigo)));
    hS += `<button class="btn btn-sm btn-outline-info" onclick="inyectarCodigoWeb('${c}')">
             { } ${s.nombre}
           </button>`;
  });
  tbS.innerHTML = hS;
};

window.inyectarCodigoWeb = function(b64) {
  if (!editorWebCM) return;
  editorWebCM.replaceSelection(decodeURIComponent(escape(atob(b64))));
  editorWebCM.focus();
};

// ─── 10. VISTA CONFIGURACIÓN ────────────────────────────
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
      <span class="text-muted small" style="font-family:monospace;">${codigoEsc.substring(0, 70)}...</span>
    </div>
    <div>
      <button class="btn btn-sm btn-outline-primary me-2" onclick="abrirModalEdicionWeb('${tipo}',${i})">
        <i class="fas fa-edit"></i>
      </button>
      <button class="btn btn-sm btn-outline-danger" onclick="eliminarSnippetWeb('${tipo}',${i})">
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
    alert('Error al guardar.');
  }
};

// ─── INICIALIZACIÓN ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracionWebSnippets();
  cargarBibliotecaWeb();       // precarga la biblioteca al entrar
  cambiarTabWeb('maquetas');   // tab por defecto
});

// v2