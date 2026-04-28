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

  const btnVerTodo = document.getElementById('btn-ver-todo');
  if (btnVerTodo) btnVerTodo.style.display = (tab === 'css' || tab === 'js') ? 'inline-flex' : 'none';

  const wrapFiltro = document.getElementById('wrap-filtro-padre');
  if (wrapFiltro) wrapFiltro.style.display = tab === 'sistema' ? 'flex' : 'none';

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
        <div class="web-proyecto-card" data-tipo-padre="${d.tipoPadre || 'Otro'}" onclick="abrirEditorWeb('${doc.id}','${nombreSeguro}','${contenidoB64}','${d.tipoPadre || 'Otro'}')">
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
const [snapCSS, snapJS] = await Promise.all([
      db.collection('web_css').get(),
      db.collection('web_js').get(),
    ]);

    webBiblioteca.css = snapCSS.docs.map(d => ({ nombre: d.data().nombre, codigo: d.data().codigo || '' }));
    webBiblioteca.js  = snapJS.docs.map(d  => ({ nombre: d.data().nombre, codigo: d.data().codigo || '' }));

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
const cssCompleto = webBiblioteca.css
    .map(p => `/* === ${p.nombre} === */\n${p.codigo}`)
    .join('\n\n');

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
window.abrirEditorWeb = async function(id, nombre = '', contenidoB64 = '', tipoPadre = 'Otro') {
  const meta = WEB_TABS[webTabActual];

  // Ocultar vista proyectos
  document.getElementById('cabecera-principal-web').classList.add('d-none');
  document.getElementById('vista-proyectos-web').style.display = 'none';
  document.getElementById('vista-editor-web').classList.remove('d-none');

  // Mostrar / ocultar badge de biblioteca en el editor
  const badgeEd = document.getElementById('web-biblioteca-badge-editor');
  if (badgeEd) badgeEd.style.display = meta.usaBiblioteca ? 'inline-flex' : 'none';
  const wrapPadre = document.getElementById('wrap-tipo-padre');
  if (wrapPadre) wrapPadre.style.display = webTabActual === 'sistema' ? 'flex' : 'none';

  webProyectoActualId = id === 'nuevo' ? null : id;

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

  editorWebCM.setOption('mode', meta.modo);
  document.getElementById('selector-modo-web').value = meta.modo;

  const contenido = id === 'nuevo' ? '' : decodeURIComponent(escape(atob(contenidoB64)));
  editorWebCM.setValue(contenido);
  editorWebCM.clearHistory();

  // Modo del editor según tab
  editorWebCM.setOption('mode', meta.modo);
  document.getElementById('selector-modo-web').value = meta.modo;

  // Contenido
  document.getElementById('input-titulo-web').value = id === 'nuevo' ? 'Nuevo archivo' : nombre;

const selectPadre = document.getElementById('input-tipo-padre');
  if (selectPadre) selectPadre.value = tipoPadre;

  editorWebCM.setValue(id === 'nuevo' ? '' : decodeURIComponent(escape(atob(contenidoB64))));

  // Si usa biblioteca, cargarla (siempre fresca al abrir)
  if (meta.usaBiblioteca) await cargarBibliotecaWeb();

  inicializarMaquetaDesdecodigo();
  cambiarModoEdicion('codigo'); // siempre abre en modo código

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

const tipoPadre = webTabActual === 'sistema'
    ? (document.getElementById('input-tipo-padre')?.value || 'Otro')
    : null;

  const datos = {
    nombre,
    codigo,
    tipo:               webTabActual,
    tipoPadre,
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

    let hB = ``;
  (webConfigBloques.bloques || []).forEach(b => {
    const c = btoa(unescape(encodeURIComponent(b.codigo)));
    hB += `<button class="btn btn-sm btn-dark" onclick="inyectarCodigoWeb('${c}')">
             <i class="fas fa-layer-group"></i> ${b.nombre}
           </button>`;
  });
  tbB.innerHTML = hB;

    let hS = ``;
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


window.verTodoWeb = async function() {
  const meta = WEB_TABS[webTabActual];
  const snap = await db.collection(meta.coleccion).orderBy('fechaActualizacion','desc').get();

  let codigo = '';
  snap.forEach(doc => {
    const d = doc.data();
    codigo += `/* ═══════════════════════════════
   ${d.nombre || 'Sin nombre'}
═══════════════════════════════ */\n\n${d.codigo || ''}\n\n\n`;
  });

  // Crear modal si no existe
  if (!document.getElementById('modal-ver-todo')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modal-ver-todo" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; overflow-y:auto;">
        <div style="margin:3% auto; max-width:800px; background:#1e1e1e; border-radius:12px; box-shadow:0 4px 30px rgba(0,0,0,0.5);">
          <div class="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
            <h5 class="fw-bold m-0 text-white" id="modal-ver-todo-titulo"></h5>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-outline-light" onclick="copiarTodoVerTodo()"><i class="fas fa-copy"></i> Copiar todo</button>
              <button class="btn-close btn-close-white" onclick="document.getElementById('modal-ver-todo').style.display='none'"></button>
            </div>
          </div>
          <pre id="modal-ver-todo-codigo" style="margin:0; padding:1.5rem; color:#f8f8f2; font-family:monospace; font-size:.82rem; white-space:pre-wrap; word-break:break-word; max-height:75vh; overflow-y:auto;"></pre>
        </div>
      </div>`);
  }

  document.getElementById('modal-ver-todo-titulo').textContent = meta.label + ' — Código completo';
  document.getElementById('modal-ver-todo-codigo').textContent = codigo;
  document.getElementById('modal-ver-todo').style.display = 'block';
};

window.copiarTodoVerTodo = function() {
  const codigo = document.getElementById('modal-ver-todo-codigo').textContent;
  navigator.clipboard.writeText(codigo).then(() => alert('¡Código copiado!'));
};

window.filtrarPadreWeb = function(tipoPadre, btnEl) {
  document.querySelectorAll('#wrap-filtro-padre button').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');

  document.querySelectorAll('#grid-proyectos-web .web-proyecto-card:not(.nuevo)').forEach(card => {
    const cardTipo = card.dataset.tipoPadre;
    card.style.display = (!tipoPadre || cardTipo === tipoPadre) ? '' : 'none';
  });
};







// ═══════════════════════════════════════════
//  MAQUETADOR VISUAL — Sección > Fila > Col > Bloque
// ═══════════════════════════════════════════

let maqEstructura      = [];   // [{uid, filas:[{uid, cols:[{uid, bloques:[{uid,nombre,codigo}]}]}]}]
let maqSeleccionado    = null; // {seccionUid, filaUid, colUid, bloqueUid}
let maqDragBloque      = null; // datos del bloque siendo arrastrado desde panel izq
let maqDragBloqueCanvas = null; // {seccionUid, filaUid, colUid, bloqueUid}

const uid = () => Date.now() + Math.random().toString(36).slice(2);

// ── Cambiar entre modo Código y Visual ──────
window.cambiarModoEdicion = function(modo) {
  const btnCodigo   = document.getElementById('tab-modo-codigo');
  const btnVisual   = document.getElementById('tab-modo-visual');
  const filaEditor  = document.querySelector('#vista-editor-web .row');
  const vistaVisual = document.getElementById('modo-visual-web');

  if (modo === 'visual') {
    filaEditor.style.display  = 'none';
    vistaVisual.style.display = 'block';
    btnCodigo.className = 'btn btn-sm btn-outline-secondary';
    btnVisual.className = 'btn btn-sm btn-primary';
    cargarBloquesEnPanelIzquierdo();
    renderizarCanvas();
  } else {
    filaEditor.style.display  = '';
    vistaVisual.style.display = 'none';
    btnCodigo.className = 'btn btn-sm btn-primary';
    btnVisual.className = 'btn btn-sm btn-outline-secondary';
  }
};

// ── Panel izquierdo ──────────────────────────
window.cargarBloquesEnPanelIzquierdo = async function() {
  const panel = document.getElementById('lista-bloques-sistema');
  panel.innerHTML = '<p class="text-muted small px-2">Cargando...</p>';
  try {
    const snap   = await db.collection('web_sistema').orderBy('fechaActualizacion','desc').get();
    const grupos = {};
    snap.forEach(doc => {
      const d    = doc.data();
      const tipo = d.tipoPadre || 'Otro';
      if (!grupos[tipo]) grupos[tipo] = [];
      grupos[tipo].push({ id: doc.id, nombre: d.nombre, codigo: d.codigo || '' });
    });
    let html = '';
    for (const [tipo, items] of Object.entries(grupos)) {
      html += `<div class="bloque-grupo-label">${tipo}</div>`;
      items.forEach(item => {
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(item))));
        html += `<div class="bloque-sistema-item" draggable="true" ondragstart="iniciarDragBloque(event,'${b64}')">
          <i class="fas fa-grip-vertical" style="color:#555;font-size:.7rem;"></i>${item.nombre}
        </div>`;
      });
    }
    panel.innerHTML = html || '<p class="text-muted small px-2">Sin bloques</p>';
  } catch(e) {
    panel.innerHTML = '<p class="text-danger small px-2">Error</p>';
  }
};

window.iniciarDragBloque = function(event, b64) {
  maqDragBloque = JSON.parse(decodeURIComponent(escape(atob(b64))));
  maqDragBloqueCanvas = null;
  event.dataTransfer.effectAllowed = 'copy';
};

// ── Estructura ────────────────────────────────
window.agregarSeccion = function() {
  maqEstructura.push({
    uid:   uid(),
    filas: [ crearFila(1) ]
  });
  renderizarCanvas();
};

function crearFila(numCols) {
  const cols = [];
  for (let i = 0; i < numCols; i++) cols.push({ uid: uid(), bloques: [] });
  return { uid: uid(), cols };
}

window.renderizarCanvas = function() {
  const zona = document.getElementById('canvas-drop-zone');
  if (!zona) return;

  if (maqEstructura.length === 0) {
    zona.innerHTML = `<div style="text-align:center;color:#aaa;padding:3rem;border:2px dashed #ccc;border-radius:12px;font-size:.9rem;">Pulsa "+ Sección" para empezar</div>`;
    return;
  }

  zona.innerHTML = maqEstructura.map((sec, si) => `
    <div class="maq-seccion" data-sec="${sec.uid}">
      <div class="maq-seccion-toolbar">
        <span class="maq-seccion-label">Sección ${si+1}</span>
        <div style="display:flex;gap:4px;">
          <button class="btn-maq btn-maq-dark" onclick="agregarFilaEnSeccion('${sec.uid}',1)">+ Fila</button>
          <button class="btn-maq btn-maq-danger" onclick="eliminarSeccion('${sec.uid}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      ${sec.filas.map((fila, fi) => renderizarFila(sec.uid, fila, fi)).join('')}
    </div>`).join('');

  // Inyectar cada bloque en su iframe aislado
  document.querySelectorAll('.maq-bloque-iframe').forEach(iframe => {
    const bloqueUid = iframe.dataset.uid;
    let bloque = null;

    for (const sec of maqEstructura) {
      for (const fila of sec.filas) {
        for (const col of fila.cols) {
          const found = col.bloques.find(b => b.uid === bloqueUid);
          if (found) { bloque = found; break; }
        }
        if (bloque) break;
      }
      if (bloque) break;
    }

    if (!bloque) return;

    const cssB = webBiblioteca.css.map(p => p.codigo).join('\n');
    const jsB  = webBiblioteca.js.map(p => p.codigo).join('\n');

    const html = `<!DOCTYPE html>
<html><head>
<style>*{box-sizing:border-box;margin:0;padding:0;}${cssB}</style>
</head>
<body style="display:flex;align-items:center;justify-content:center;padding:8px;">
${bloque.codigo}
<script>${jsB}<\/script>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    iframe.src = URL.createObjectURL(blob);

    iframe.onload = () => {
      try {
        const h = iframe.contentDocument?.body?.scrollHeight;
        if (h) iframe.style.height = h + 'px';
      } catch(e) {}
    };
  });
};

function renderizarFila(secUid, fila, fi) {
  return `
    <div class="maq-fila" data-fila="${fila.uid}">
      <div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span class="maq-seccion-label">Fila ${fi+1} — ${fila.cols.length} col(s)</span>
        <div style="display:flex;gap:4px;">
          ${[1,2,3,4].map(n => `<button class="btn-maq ${fila.cols.length===n?'btn-maq-primary':'btn-maq-dark'}" onclick="cambiarColsFila('${secUid}','${fila.uid}',${n})">${n}</button>`).join('')}
          <button class="btn-maq btn-maq-danger" onclick="eliminarFila('${secUid}','${fila.uid}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div style="display:flex;gap:8px;width:100%;">
        ${fila.cols.map(col => renderizarCol(secUid, fila.uid, col)).join('')}
      </div>
    </div>`;
}

function renderizarCol(secUid, filaUid, col) {
  const bloquesHTML = col.bloques.length
    ? col.bloques.map((b, bi) => `
        <div class="maq-bloque ${maqSeleccionado?.bloqueUid===b.uid?'seleccionado':''}"
          draggable="true"
          onclick="seleccionarBloque('${secUid}','${filaUid}','${col.uid}','${b.uid}')"
          ondragstart="iniciarDragDesdeCanvas(event,'${secUid}','${filaUid}','${col.uid}','${b.uid}')"
          ondragover="event.preventDefault()"
          ondrop="soltarEnBloque(event,'${secUid}','${filaUid}','${col.uid}',${bi})">
          <div class="maq-bloque-toolbar">
            <button onclick="event.stopPropagation();subirBloque('${secUid}','${filaUid}','${col.uid}',${bi})" style="background:#4f46e5;color:#fff;"><i class="fas fa-chevron-up"></i></button>
            <button onclick="event.stopPropagation();bajarBloque('${secUid}','${filaUid}','${col.uid}',${bi})" style="background:#4f46e5;color:#fff;"><i class="fas fa-chevron-down"></i></button>
            <button onclick="event.stopPropagation();eliminarBloqueDeCol('${secUid}','${filaUid}','${col.uid}','${b.uid}')" style="background:#ef4444;color:#fff;"><i class="fas fa-times"></i></button>
          </div>
          <iframe class="maq-bloque-iframe" data-uid="${b.uid}" scrolling="no" style="width:100%;border:none;pointer-events:none;display:block;"></iframe>
        </div>`).join('')
    : `<div class="maq-col-placeholder">Arrastra un bloque aquí</div>`;

  return `
    <div class="maq-col" data-col="${col.uid}"
      ondragover="event.preventDefault();this.classList.add('drag-over')"
      ondragleave="this.classList.remove('drag-over')"
      ondrop="soltarEnCol(event,'${secUid}','${filaUid}','${col.uid}')">
      ${bloquesHTML}
    </div>`;
}

// ── Drop en columna (desde panel izq o canvas) ─
window.soltarEnCol = function(event, secUid, filaUid, colUid) {
  event.preventDefault();
  event.stopPropagation();
  event.target.closest('.maq-col')?.classList.remove('drag-over');

  if (maqDragBloque) {
    // viene del panel izquierdo
    const col = getCol(secUid, filaUid, colUid);
    if (col) col.bloques.push({ uid: uid(), nombre: maqDragBloque.nombre, codigo: maqDragBloque.codigo });
    maqDragBloque = null;
  } else if (maqDragBloqueCanvas) {
    // viene de otro lugar del canvas — mover
    const { secUid: oSec, filaUid: oFila, colUid: oCol, bloqueUid: oBloq } = maqDragBloqueCanvas;
    const colOrigen  = getCol(oSec, oFila, oCol);
    const colDestino = getCol(secUid, filaUid, colUid);
    if (!colOrigen || !colDestino) return;
    const idx    = colOrigen.bloques.findIndex(b => b.uid === oBloq);
    const [movido] = colOrigen.bloques.splice(idx, 1);
    colDestino.bloques.push(movido);
    maqDragBloqueCanvas = null;
  }
  renderizarCanvas();
};

// Drop entre bloques (reordenar dentro de columna)
window.soltarEnBloque = function(event, secUid, filaUid, colUid, indexDestino) {
  event.preventDefault();
  event.stopPropagation();
  if (!maqDragBloqueCanvas) return;
  const { secUid: oSec, filaUid: oFila, colUid: oCol, bloqueUid: oBloq } = maqDragBloqueCanvas;
  if (oCol !== colUid) return; // si viene de otra col, lo maneja soltarEnCol
  const col  = getCol(secUid, filaUid, colUid);
  const from = col.bloques.findIndex(b => b.uid === oBloq);
  const [movido] = col.bloques.splice(from, 1);
  col.bloques.splice(indexDestino, 0, movido);
  maqDragBloqueCanvas = null;
  renderizarCanvas();
};

window.iniciarDragDesdeCanvas = function(event, secUid, filaUid, colUid, bloqueUid) {
  maqDragBloqueCanvas = { secUid, filaUid, colUid, bloqueUid };
  maqDragBloque = null;
  event.dataTransfer.effectAllowed = 'move';
  event.stopPropagation();
};

// ── Seleccionar bloque → panel derecho ────────
window.seleccionarBloque = function(secUid, filaUid, colUid, bloqueUid) {
  maqSeleccionado = { secUid, filaUid, colUid, bloqueUid };
  const col    = getCol(secUid, filaUid, colUid);
  const bloque = col?.bloques.find(b => b.uid === bloqueUid);
  if (!bloque) return;
  document.getElementById('panel-bloque-nombre').textContent = bloque.nombre;
  document.getElementById('panel-bloque-codigo').value       = bloque.codigo;
  renderizarCanvas();
};

// ── Editar desde panel derecho ────────────────
window.actualizarBloqueSeleccionado = function() {
  if (!maqSeleccionado) return;
  const { secUid, filaUid, colUid, bloqueUid } = maqSeleccionado;
  const col    = getCol(secUid, filaUid, colUid);
  const bloque = col?.bloques.find(b => b.uid === bloqueUid);
  if (!bloque) return;
  bloque.codigo = document.getElementById('panel-bloque-codigo').value;
  renderizarCanvas();
};

window.eliminarBloqueSeleccionado = function() {
  if (!maqSeleccionado) return;
  const { secUid, filaUid, colUid, bloqueUid } = maqSeleccionado;
  eliminarBloqueDeCol(secUid, filaUid, colUid, bloqueUid);
  maqSeleccionado = null;
  document.getElementById('panel-bloque-nombre').textContent = 'Selecciona un bloque';
  document.getElementById('panel-bloque-codigo').value = '';
};

// ── Acciones estructura ───────────────────────
window.agregarFilaEnSeccion = function(secUid, numCols) {
  const sec = maqEstructura.find(s => s.uid === secUid);
  if (sec) sec.filas.push(crearFila(numCols));
  renderizarCanvas();
};

window.cambiarColsFila = function(secUid, filaUid, numCols) {
  const fila = getFila(secUid, filaUid);
  if (!fila) return;
  while (fila.cols.length < numCols) fila.cols.push({ uid: uid(), bloques: [] });
  while (fila.cols.length > numCols) {
    const col = fila.cols.pop();
    // mover bloques huérfanos a la primera columna
    if (col.bloques.length) fila.cols[0].bloques.push(...col.bloques);
  }
  renderizarCanvas();
};

window.eliminarSeccion = function(secUid) {
  if (!confirm('¿Eliminar esta sección y todo su contenido?')) return;
  maqEstructura = maqEstructura.filter(s => s.uid !== secUid);
  renderizarCanvas();
};

window.eliminarFila = function(secUid, filaUid) {
  const sec = maqEstructura.find(s => s.uid === secUid);
  if (!sec) return;
  sec.filas = sec.filas.filter(f => f.uid !== filaUid);
  renderizarCanvas();
};

window.eliminarBloqueDeCol = function(secUid, filaUid, colUid, bloqueUid) {
  const col = getCol(secUid, filaUid, colUid);
  if (!col) return;
  col.bloques = col.bloques.filter(b => b.uid !== bloqueUid);
  renderizarCanvas();
};

window.subirBloque = function(secUid, filaUid, colUid, index) {
  const col = getCol(secUid, filaUid, colUid);
  if (!col || index === 0) return;
  [col.bloques[index-1], col.bloques[index]] = [col.bloques[index], col.bloques[index-1]];
  renderizarCanvas();
};

window.bajarBloque = function(secUid, filaUid, colUid, index) {
  const col = getCol(secUid, filaUid, colUid);
  if (!col || index >= col.bloques.length - 1) return;
  [col.bloques[index+1], col.bloques[index]] = [col.bloques[index], col.bloques[index+1]];
  renderizarCanvas();
};

// ── Helpers ───────────────────────────────────
function getFila(secUid, filaUid) {
  return maqEstructura.find(s => s.uid === secUid)?.filas.find(f => f.uid === filaUid);
}

function getCol(secUid, filaUid, colUid) {
  return getFila(secUid, filaUid)?.cols.find(c => c.uid === colUid);
}

// ── Exportar a código ─────────────────────────
window.exportarVisualACodigo = function() {
  const cssCompleto = webBiblioteca.css.map(p => p.codigo).join('\n');
  const jsCompleto  = webBiblioteca.js.map(p => p.codigo).join('\n');

  const cuerpo = maqEstructura.map(sec => {
    const filasHTML = sec.filas.map(fila => {
      const colsHTML = fila.cols.map(col => {
        const bloquesHTML = col.bloques.map(b => b.codigo).join('\n');
        return `    <div style="flex:1;">\n${bloquesHTML}\n    </div>`;
      }).join('\n');
      return `  <div style="display:flex;gap:16px;">\n${colsHTML}\n  </div>`;
    }).join('\n');
    return `<section>\n${filasHTML}\n</section>`;
  }).join('\n\n');

  const htmlFinal = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>\n${cssCompleto}\n  </style>
</head>
<body style="margin:0;">\n\n${cuerpo}\n\n<script>\n${jsCompleto}\n<\/script>
</body>
</html>`;

  if (editorWebCM) editorWebCM.setValue(htmlFinal);
  cambiarModoEdicion('codigo');
};

// ── Reset al abrir proyecto ───────────────────
function inicializarMaquetaDesdecodigo() {
  maqEstructura   = [];
  maqSeleccionado = null;
}







// ─── INICIALIZACIÓN ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracionWebSnippets();
  cargarBibliotecaWeb();       // precarga la biblioteca al entrar
  cambiarTabWeb('maquetas');   // tab por defecto
});

// v2