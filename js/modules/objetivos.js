// ============================================================
// DATOS: Pilares, objetivos y tareas
// ============================================================
const PILARES = [
  {
    id: 'pos',
    pilar: 'Posicionamiento estratégico',
    objetivo: 'Principal Ecommerce de Joyas por mayor',
    color: '#4361ee',
    icono: 'fa-rocket',
    tareas: [
      { id: 'ux1',   categoria: 'UX / UI',               tarea: 'Desarrollo de Plan de UX e UI',                                              plazo: 'Mensual', revision: 'Mensual'  },
      { id: 'ux2',   categoria: 'UX / UI',               tarea: 'Implementación y medición de UX en la web (Hot Jar o Clarity)',               plazo: 'Q2',      revision: '—'        },
      { id: 'plat1', categoria: 'Plataforma',             tarea: 'Actualización de Prestashop 8',                                              plazo: 'Q2/Q3',   revision: '—'        },
      { id: 'seo1',  categoria: 'SEO',                   tarea: 'Mejoras de SEO y SEO técnico',                                               plazo: 'Q2/Q3',   revision: '—'        },
      { id: 'seo2',  categoria: 'SEO',                   tarea: 'Ser el resultado principal para "Joyas de plata por mayor"',                  plazo: 'Mensual', revision: '—'        },
      { id: 'pag1',  categoria: 'Nuevas páginas',         tarea: 'Desarrollo de página para empresas y regalos corporativos',                  plazo: 'Q2',      revision: 'Una vez'  },
      { id: 'pag2',  categoria: 'Nuevas páginas',         tarea: 'Landing de Fondos concursables del Gobierno',                               plazo: 'Q2',      revision: 'Una vez'  },
    ]
  },
  {
    id: 'efi1',
    pilar: 'Eficiencia de procesos',
    objetivo: 'Ciberseguridad y Gobierno de Datos',
    color: '#f4a261',
    icono: 'fa-shield-halved',
    tareas: [
      { id: 'acc1',  categoria: 'Accesos y herramientas', tarea: 'Orden en los accesos a información y herramientas por medio de correos corporativos', plazo: 'Q2/Q3', revision: 'Una vez'  },
      { id: 'her1',  categoria: 'Herramientas',           tarea: 'Uso de herramientas del ecosistema de Google como empresa',                           plazo: 'Q1',    revision: 'Una vez'  },
      { id: 'seg1',  categoria: 'Seguridad',              tarea: 'Identificar vulnerabilidades de información y fortalecer ciberseguridad',             plazo: 'Anual', revision: 'Mensual'  },
    ]
  },
  {
    id: 'fid',
    pilar: 'Programa de Fidelización',
    objetivo: 'Integración y gestión de clientas',
    color: '#9b59b6',
    icono: 'fa-heart',
    tareas: [
      { id: 'dat1',  categoria: 'Datos de clientas',      tarea: 'Integración completa de información en línea de las clientas',                        plazo: 'Q2',    revision: 'Una vez'  },
    ]
  },
  {
    id: 'imp',
    pilar: 'Impacto organizacional',
    objetivo: 'Productividad del equipo',
    color: '#1abc9c',
    icono: 'fa-users',
    tareas: [
      { id: 'int1',  categoria: 'Herramientas internas',  tarea: 'Implementación de Claude como IA principal de la empresa, contratando el programa empresa', plazo: 'Q1', revision: 'Una vez' },
    ]
  },
  {
    id: 'rent',
    pilar: 'Eficiencia de procesos',
    objetivo: 'Rentabilidad',
    color: '#e74c3c',
    icono: 'fa-chart-line',
    tareas: [
      { id: 'fin1',  categoria: 'Medición financiera',    tarea: 'Medición de gastos de Ecommerce',                                                       plazo: 'Anual', revision: 'Mensual' },
    ]
  },
];

// ============================================================
// ESTADO GLOBAL
// ============================================================
let progreso = {};       // { tareaId: { estado, tareas: [{id, texto, completada}] } }
let estadoModal = {};    // copia temporal mientras el modal está abierto
let currentTareaId = null;
let userId = null;

// ============================================================
// INIT
// ============================================================
firebase.auth().onAuthStateChanged(user => {
  if (!user) return;
  userId = user.uid;
  cargarProgreso();
});

async function cargarProgreso() {
  try {
    const doc = await firebase.firestore()
      .collection('objetivos_progreso')
      .doc(userId)
      .get();
    if (doc.exists) progreso = doc.data().tareas || {};
  } catch (e) {
    console.error('Error cargando progreso:', e);
  }
  renderPage();
}

async function guardarEnFirestore() {
  try {
    await firebase.firestore()
      .collection('objetivos_progreso')
      .doc(userId)
      .set({ tareas: progreso }, { merge: true });
  } catch (e) {
    console.error('Error guardando:', e);
    mostrarToast('Error al guardar', 'error');
  }
}

// ============================================================
// HELPERS
// ============================================================
function getDatos(id) {
  return progreso[id] || { estado: 'pendiente', tareas: [] };
}

function calcProgreso(id) {
  const sub = getDatos(id).tareas || [];
  if (!sub.length) return { pct: 0, comp: 0, total: 0 };
  const comp = sub.filter(t => t.completada).length;
  return { pct: Math.round((comp / sub.length) * 100), comp, total: sub.length };
}

function todasLasTareas() {
  return PILARES.flatMap(p => p.tareas);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
function renderPage() {
  renderStats();
  renderPilares();
}

function renderStats() {
  const tareas      = todasLasTareas();
  const total       = tareas.length;
  const completadas = tareas.filter(t => getDatos(t.id).estado === 'completado').length;
  const enProgreso  = tareas.filter(t => getDatos(t.id).estado === 'en_progreso').length;

  const sumaAvance  = tareas.reduce((s, t) => s + calcProgreso(t.id).pct, 0);
  const avance      = total ? Math.round(sumaAvance / total) : 0;

  document.getElementById('statTotal').textContent       = total;
  document.getElementById('statCompletadas').textContent = completadas;
  document.getElementById('statEnProgreso').textContent  = enProgreso;
  document.getElementById('statAvance').textContent      = avance + '%';
  document.getElementById('barAvanceGlobal').style.width = avance + '%';
}

function renderPilares() {
  document.getElementById('pilaresContainer').innerHTML =
    PILARES.map(renderPilarCard).join('');
}

function renderPilarCard(pilar) {
  const total       = pilar.tareas.length;
  const completadas = pilar.tareas.filter(t => getDatos(t.id).estado === 'completado').length;
  const pct         = total ? Math.round((completadas / total) * 100) : 0;

  const filas = pilar.tareas.map(t => {
    const d   = getDatos(t.id);
    const prg = calcProgreso(t.id);
    const vencida = esVencida(t.plazo) && d.estado !== 'completado';

    return `
      <tr class="${vencida ? 'table-warning' : ''}">
        <td><span class="badge" style="background:#f0f0f0;color:#333;font-weight:500">${t.categoria}</span></td>
        <td class="fw-medium">
          ${t.tarea}
          ${vencida ? ' <i class="fas fa-circle-exclamation text-warning" title="Plazo vencido"></i>' : ''}
        </td>
        <td>${badgePlazo(t.plazo)}</td>
        <td>${badgeEstado(d.estado)}</td>
        <td style="min-width:150px">
          <div class="d-flex align-items-center gap-2">
            <div class="progress flex-grow-1" style="height:7px">
              <div class="progress-bar ${colorBarra(prg.pct)}" style="width:${prg.pct}%"></div>
            </div>
            <span class="small text-muted" style="white-space:nowrap">
              ${prg.total ? prg.comp + '/' + prg.total : '—'}
            </span>
          </div>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="abrirModalDetalle('${t.id}')" title="Ver tareas">
            <i class="fas fa-pen-to-square"></i>
          </button>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="ios-card mb-4">
      <div class="d-flex align-items-start gap-3 mb-3">
        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
             style="width:42px;height:42px;background:${pilar.color}22">
          <i class="fas ${pilar.icono}" style="color:${pilar.color}"></i>
        </div>
        <div class="flex-grow-1">
          <div class="small text-muted mb-1">${pilar.pilar}</div>
          <h6 class="fw-semibold mb-0">${pilar.objetivo}</h6>
        </div>
        <div class="text-end flex-shrink-0">
          <span class="badge bg-secondary mb-1">${completadas}/${total} completados</span>
          <div class="progress" style="height:4px;min-width:90px">
            <div class="progress-bar bg-success" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0 small">
          <thead class="table-light">
            <tr>
              <th>Categoría</th>
              <th>Objetivo</th>
              <th>Plazo</th>
              <th>Estado</th>
              <th>Progreso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>`;
}

// ============================================================
// BADGES
// ============================================================
function badgeEstado(estado) {
  const cfg = {
    pendiente:   { color: 'secondary', label: '⏳ Pendiente'   },
    en_progreso: { color: 'primary',   label: '🔄 En progreso' },
    completado:  { color: 'success',   label: '✅ Completado'  },
    bloqueado:   { color: 'danger',    label: '🚫 Bloqueado'   },
  };
  const c = cfg[estado] || cfg.pendiente;
  return `<span class="badge bg-${c.color}">${c.label}</span>`;
}

function badgePlazo(plazo) {
  const map = { 'Mensual': 'info', 'Q1': 'warning', 'Q2': 'warning', 'Q3': 'warning',
                'Q2/Q3': 'warning', 'Anual': 'secondary', 'Una vez': 'light' };
  const bg  = map[plazo] || 'secondary';
  const txt = plazo === 'Una vez' ? ' text-dark' : '';
  return `<span class="badge bg-${bg}${txt}">${plazo}</span>`;
}

function colorBarra(pct) {
  if (pct >= 100) return 'bg-success';
  if (pct >= 60)  return 'bg-info';
  if (pct >= 25)  return 'bg-warning';
  return 'bg-secondary';
}

function esVencida(plazo) {
  const mes = new Date().getMonth() + 1;
  if (plazo === 'Q1' && mes > 3) return true;
  if (plazo === 'Q2' && mes > 6) return true;
  if (plazo === 'Q3' && mes > 9) return true;
  return false;
}

// ============================================================
// MODAL DETALLE
// ============================================================
function abrirModalDetalle(tareaId) {
  currentTareaId = tareaId;
  const def = todasLasTareas().find(t => t.id === tareaId);
  const d   = getDatos(tareaId);

  // Copia profunda para edición temporal
  estadoModal = {
    estado:      d.estado,
    tareas:      (d.tareas      || []).map(t => ({ ...t })),
    comentarios: (d.comentarios || []).map(c => ({ ...c })),
  };

  document.getElementById('modalTituloTarea').textContent    = def.tarea;
  document.getElementById('modalSubtituloTarea').textContent = `${def.categoria}  ·  Plazo: ${def.plazo}  ·  Revisión: ${def.revision}`;
  document.getElementById('modalEstado').value               = d.estado;

  renderTareasModal();
  renderComentariosModal();
  document.getElementById('nuevaTareaInput').value      = '';
  document.getElementById('nuevoComentarioInput').value = '';
  document.getElementById('modalDetalleObjetivo').style.display = 'flex';
}

function cerrarModalDetalle() {
  document.getElementById('modalDetalleObjetivo').style.display = 'none';
  currentTareaId = null;
}

function renderTareasModal() {
  const lista   = estadoModal.tareas;
  const comp    = lista.filter(t => t.completada).length;
  const total   = lista.length;
  const pct     = total ? Math.round((comp / total) * 100) : 0;

  document.getElementById('modalProgTexto').textContent  = `${comp} de ${total} tareas`;
  document.getElementById('modalProgBar').style.width    = pct + '%';
  document.getElementById('tareasCountBadge').textContent = total;

  const container = document.getElementById('tareasListaModal');

  if (!lista.length) {
    container.innerHTML = '<p class="text-muted small fst-italic mb-0">Sin tareas aún. Agrega la primera abajo.</p>';
    return;
  }

  container.innerHTML = lista.map(t => `
    <div class="d-flex align-items-center gap-2 mb-2 px-3 py-2 rounded"
         style="background:var(--surface-2)">
      <input type="checkbox" class="form-check-input flex-shrink-0" id="chk_${t.id}"
             ${t.completada ? 'checked' : ''}
             onchange="toggleTareaModal('${t.id}')">
      <label class="form-check-label flex-grow-1 mb-0 ${t.completada ? 'text-decoration-line-through text-muted' : ''}"
             for="chk_${t.id}" style="cursor:pointer">${t.texto}</label>
      <button class="btn btn-sm btn-link text-danger p-0 ms-1 flex-shrink-0"
              onclick="eliminarTareaModal('${t.id}')" title="Eliminar">
        <i class="fas fa-times"></i>
      </button>
    </div>`).join('');
}

function toggleTareaModal(tareaId) {
  const item = estadoModal.tareas.find(t => t.id === tareaId);
  if (item) {
    item.completada = !item.completada;
    actualizarEstadoAuto();
    renderTareasModal();
  }
}

function actualizarEstadoAuto() {
  const lista = estadoModal.tareas;
  if (!lista.length) return;
  if (estadoModal.estado === 'bloqueado') return; // no sobrescribir si está bloqueado
  const comp  = lista.filter(t => t.completada).length;
  if (comp === lista.length) {
    estadoModal.estado = 'completado';
  } else if (comp > 0) {
    estadoModal.estado = 'en_progreso';
  } else {
    estadoModal.estado = 'pendiente';
  }
  document.getElementById('modalEstado').value = estadoModal.estado;
}

function agregarTareaModal() {
  const input = document.getElementById('nuevaTareaInput');
  const texto = input.value.trim();
  if (!texto) return;
  estadoModal.tareas.push({ id: genId(), texto, completada: false });
  actualizarEstadoAuto();
  renderTareasModal();
  input.value = '';
  input.focus();
}

function eliminarTareaModal(tareaId) {
  estadoModal.tareas = estadoModal.tareas.filter(t => t.id !== tareaId);
  actualizarEstadoAuto();
  renderTareasModal();
}

// ============================================================
// COMENTARIOS
// ============================================================
function renderComentariosModal() {
  const lista = estadoModal.comentarios;
  document.getElementById('comentariosCountBadge').textContent = lista.length;

  const container = document.getElementById('comentariosListaModal');
  if (!lista.length) {
    container.innerHTML = '<p class="text-muted small fst-italic">Sin comentarios aún.</p>';
    return;
  }

  container.innerHTML = [...lista].reverse().map(c => `
    <div class="mb-3 p-3 rounded" style="background:var(--surface-2,#f8f9fa);position:relative">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
        <span class="small text-muted"><i class="fas fa-clock me-1"></i>${formatFecha(c.fecha)}</span>
        <button class="btn btn-sm btn-link text-danger p-0 flex-shrink-0" style="line-height:1"
                onclick="eliminarComentario('${c.id}')" title="Eliminar">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <p class="mb-0 small" style="white-space:pre-wrap">${c.texto}</p>
    </div>`).join('');
}

function agregarComentarioModal() {
  const input = document.getElementById('nuevoComentarioInput');
  const texto = input.value.trim();
  if (!texto) return;
  estadoModal.comentarios.push({ id: genId(), texto, fecha: new Date().toISOString() });
  renderComentariosModal();
  input.value = '';
  input.focus();
}

function eliminarComentario(comentarioId) {
  estadoModal.comentarios = estadoModal.comentarios.filter(c => c.id !== comentarioId);
  renderComentariosModal();
}

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

async function guardarModalDetalle() {
  estadoModal.estado = document.getElementById('modalEstado').value;
  progreso[currentTareaId] = { ...estadoModal };
  await guardarEnFirestore();
  renderPage();
  cerrarModalDetalle();
  mostrarToast('Guardado correctamente', 'success');
}

// ============================================================
// MODAL RESUMEN
// ============================================================
function abrirResumen() {
  const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  const sep   = '─'.repeat(55);
  let txt = `REPORTE DE OBJETIVOS ESTRATÉGICOS\n${fecha}\n${sep}\n\n`;

  for (const pilar of PILARES) {
    const completadas = pilar.tareas.filter(t => getDatos(t.id).estado === 'completado').length;
    txt += `▌ ${pilar.pilar.toUpperCase()}\n`;
    txt += `  Objetivo: ${pilar.objetivo}\n`;
    txt += `  Avance: ${completadas}/${pilar.tareas.length} completados\n\n`;

    for (const tarea of pilar.tareas) {
      const d   = getDatos(tarea.id);
      const prg = calcProgreso(tarea.id);
      const icons  = { completado: '✅', en_progreso: '🔄', pendiente: '⏳', bloqueado: '🚫' };
      const labels = { completado: 'Completado', en_progreso: 'En progreso', pendiente: 'Pendiente', bloqueado: 'Bloqueado' };

      txt += `  ${icons[d.estado] || '⏳'} ${labels[d.estado] || 'Pendiente'} — ${tarea.tarea}\n`;
      txt += `     Categoría: ${tarea.categoria}  |  Plazo: ${tarea.plazo}  |  Revisión: ${tarea.revision}\n`;

      if (prg.total) {
        txt += `     Tareas: ${prg.comp}/${prg.total} completadas (${prg.pct}%)\n`;
        (d.tareas || []).forEach(sub => {
          txt += `       ${sub.completada ? '☑' : '☐'} ${sub.texto}\n`;
        });
      } else {
        txt += `     Sin tareas registradas.\n`;
      }

      const comentarios = d.comentarios || [];
      if (comentarios.length) {
        const ultimo = comentarios[comentarios.length - 1];
        txt += `     Último comentario (${formatFecha(ultimo.fecha)}): ${ultimo.texto}\n`;
      }
      txt += '\n';
    }
    txt += `${sep}\n\n`;
  }

  const todas    = todasLasTareas();
  const total    = todas.length;
  const comp     = todas.filter(t => getDatos(t.id).estado === 'completado').length;
  const prog     = todas.filter(t => getDatos(t.id).estado === 'en_progreso').length;
  const avGlobal = total ? Math.round(todas.reduce((s, t) => s + calcProgreso(t.id).pct, 0) / total) : 0;

  txt += `RESUMEN EJECUTIVO\n${sep}\n`;
  txt += `Objetivos totales:  ${total}\n`;
  txt += `Completados:        ${comp}\n`;
  txt += `En progreso:        ${prog}\n`;
  txt += `Pendientes:         ${total - comp - prog}\n`;
  txt += `Avance global:      ${avGlobal}%\n`;

  document.getElementById('resumenTexto').value = txt;
  document.getElementById('modalResumenObjetivos').style.display = 'flex';
}

function cerrarModalResumen() {
  document.getElementById('modalResumenObjetivos').style.display = 'none';
}

function copiarResumen() {
  const el = document.getElementById('resumenTexto');
  el.select();
  document.execCommand('copy');
  mostrarToast('Copiado al portapapeles', 'success');
}

// ============================================================
// CERRAR CON ESC
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  cerrarModalDetalle();
  cerrarModalResumen();
});

// ============================================================
// TOAST
// ============================================================
function mostrarToast(msg, tipo = 'info') {
  const colors = { success: '#198754', error: '#dc3545', info: '#0d6efd' };
  const el = document.createElement('div');
  el.className = 'toast show align-items-center text-white border-0 mb-2';
  el.style.cssText = `background:${colors[tipo] || colors.info};min-width:220px;border-radius:8px`;
  el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div></div>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
