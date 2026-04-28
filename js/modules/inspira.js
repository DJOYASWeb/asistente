let db;
let cacheEntradas = [];

window.addEventListener('load', () => {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      db = firebase.firestore();
      cargarContenidos();
    } else {
      showIosModal("Acceso denegado", "Debes iniciar sesión para ver Inspira.");
    }
  });
});

function showTab(tab) {
  const tabs = ['contenidos', 'recursos', 'ingreso'];
  tabs.forEach(t => {
    const section = document.getElementById(t);
    const btn     = document.getElementById(`btn${capitalize(t)}`);
    if (section) section.classList.toggle('d-none', t !== tab);
    if (btn)     btn.classList.toggle('active', t === tab);
  });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function killLegacyModal() {
  const legacy = document.getElementById("modalCodigoHTML");
  if (legacy) legacy.remove();
}

function showIosModal(title, message) {
  document.getElementById('iosModalTitle').textContent   = title;
  document.getElementById('iosModalMessage').textContent = message;
  document.getElementById('iosModal').style.display      = 'flex';
}

function closeIosModal() {
  document.getElementById('iosModal').style.display = 'none';
}

function refrescarContenidos() {
  cargarContenidos();
  mostrarNotificacion("Contenidos actualizados correctamente", "exito");
}

function refrescarRecursos() {
  cargarRecursos();
  mostrarNotificacion("Recursos actualizados correctamente", "exito");
}

async function cargarContenidos() {
  const select = document.getElementById('contenidoSelect');
  if (select) select.innerHTML = '<option value="">Selecciona un contenido</option>';

  try {
    const snapshot = await db.collection("inspira").get();
    const docs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      docs.push({ idNum: Number(data.id || doc.id), docId: doc.id, data });
    });
    docs.sort((a, b) => b.idNum - a.idNum);

    window.datosInspira = docs.map(item => ({ id: item.docId, ...item.data, tipo: 'inspira' }));

    if (window.renderizarCalendario) {
      console.log("Inspira: Enviando " + window.datosInspira.length + " items al calendario.");
      window.renderizarCalendario();
    }

    if (select) {
      docs.forEach(({ docId, data }) => {
        const option = document.createElement("option");
        option.value       = docId;
        option.textContent = `${Number(data.id || docId)} - ${data.titulo}`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error(error);
    mostrarNotificacion("Error al cargar contenidos", "error");
    if (select) select.innerHTML = '<option>Error al cargar</option>';
  }
}

async function guardarInspira(e) {
  e.preventDefault();

  const nuevaEntrada = {
    id:          Number(document.getElementById('inspiraId').value),
    titulo:      document.getElementById('inspiraTitulo').value,
    autor:       document.getElementById('inspiraAutor').value,
    descripcion: document.getElementById('inspiraDescripcion').value,
    imagen:      document.getElementById('inspiraImagen').value,
    duracion:    document.getElementById('inspiraDuracion').value + ' ' + document.getElementById('inspiraUnidad').value,
    tematica:    document.getElementById('inspiraTematica').value,
    categoria:   document.getElementById('inspiraCategoria').value,
    fecha:       document.getElementById('inspiraFecha').value,
    link:        document.getElementById('inspiraLink').value,
    timestamp:   new Date().toISOString()
  };

  try {
    await db.collection("inspira").doc(String(nuevaEntrada.id)).set(nuevaEntrada);
    document.getElementById('formInspira').reset();
    cerrarModalAgregarRecurso();
    cargarContenidos();
    cargarRecursos();
    mostrarNotificacion("El contenido fue guardado correctamente", "exito");
  } catch (err) {
    mostrarNotificacion("No se pudo guardar. Intenta de nuevo", "error");
  }
}

async function generarBloqueContenido() {
  const select      = document.getElementById("contenidoSelect");
  const id          = select.value;
  const isInfluencer = document.getElementById("checkInfluencer").checked;

  if (!id && !isInfluencer) {
    mostrarNotificacion("Debes seleccionar un contenido o marcar Influencer", "alerta");
    return;
  }

  const etiquetas = {
    destacados: document.getElementById("checkDestacados").checked,
    carrusel:   document.getElementById("checkCarrusel").checked,
    popular:    document.getElementById("checkPopular").checked,
    influencer: isInfluencer
  };

  const contenedor = document.getElementById("bloqueGenerado");
  const lista      = document.createElement("div");
  lista.className  = "row";
  contenedor.innerHTML = '<h6><i class="fa-solid fa-puzzle-piece me-1"></i> Contenidos generados:</h6>';
  contenedor.appendChild(lista);

  if (isInfluencer) {
    const cardMini = document.createElement("div");
    cardMini.className = "col-md-6 col-lg-4 mb-3";
    cardMini.innerHTML = `
      <div class="ios-card p-3 h-100 d-flex flex-column justify-content-between">
        <div>
          <h6 class="text-info"><i class="fa-solid fa-star me-1"></i> INFLUENCER</h6>
          <strong>Formulario personalizado</strong>
          <p class="text-muted small">Completa los datos a medida</p>
        </div>
        <button class="btn btn-sm btn-secondary mt-2" onclick="mostrarModalFormularioInfluencer()">
          <i class="fa-solid fa-pen me-1"></i> Abrir editor
        </button>
      </div>`;
    lista.appendChild(cardMini);
    contenedor.classList.remove("d-none");
    return;
  }

  try {
    const doc = await db.collection("inspira").doc(id).get();
    if (!doc.exists) return mostrarNotificacion("Contenido no encontrado", "alerta");
    const data = doc.data();

    const fechaObj    = new Date(data.fecha);
    const fechaFormato = fechaObj.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

    const plantillas = {
      destacados: {
        html: `<section class="card contenido" data-title="${data.titulo}" data-subtitle="${data.descripcion}" data-img="${data.imagen}" data-date="${fechaFormato}" data-category="${data.categoria}" data-duration="${data.duracion}" data-autor="${data.autor}" data-link="${data.link}">
          <div class="img-text-portada">
            <img src="${data.imagen}" alt="Imagen" draggable="false">
            <div class="overlay-gradient"></div>
            <div class="text">
              <img id="marca-image" src="/img/cms/paginas internas/DJOYAS INSPIRA/logo-inspira-1.png" alt="Marca">
              <h2>${data.titulo}</h2>
              <span>${data.categoria}</span>
            </div>
          </div>
        </section>`,
        clase: "text-primary",
        label: '<i class="fa-solid fa-diamond me-1"></i> DESTACADO',
      },
      carrusel: {
        html: `<li class="card" data-title="${data.titulo}" data-subtitle="${data.descripcion}" data-img="${data.imagen}" data-date="${fechaFormato}" data-category="${data.categoria}" data-duration="${data.duracion}" data-link="${data.link}" data-autor="${data.autor}" data-section="${data.categoria}">
          <div class="img-text-overlay">
            <img src="${data.imagen}" alt="Imagen" draggable="false">
            <div class="overlay-gradient"></div>
            <div class="text">
              <h2>${data.titulo}</h2>
              <span>${data.tematica}</span>
            </div>
          </div>
        </li>`,
        clase: "text-danger",
        label: '<i class="fa-solid fa-film me-1"></i> CARRUSEL',
      },
      popular: {
        html: `<li class="card" data-title="${data.titulo}" data-subtitle="${data.descripcion}" data-img="${data.imagen}" data-date="${fechaFormato}" data-category="${data.categoria}" data-duration="${data.duracion}" data-link="${data.link}" data-autor="${data.autor}" data-section="${data.tematica || data.categoria}">
          <div class="img-text-overlay">
            <img src="${data.imagen}" alt="Imagen" draggable="false">
          </div>
          <div class="ranking">
            <span>1</span>
            <h3>${data.titulo}</h3>
          </div>
        </li>`,
        clase: "text-warning",
        label: '<i class="fa-solid fa-fire me-1"></i> POPULAR',
      }
    };

    for (const key in etiquetas) {
      if (etiquetas[key] && plantillas[key]) {
        const plantilla = plantillas[key];
        const cardMini  = document.createElement("div");
        cardMini.className = "col-md-6 col-lg-4 mb-3";
        cardMini.innerHTML = `
          <div class="ios-card p-3 h-100 d-flex flex-column justify-content-between">
            <div>
              <h6 class="${plantilla.clase}">${plantilla.label}</h6>
              <strong>${data.titulo}</strong>
              <p class="text-muted small mb-0 text-truncate">${data.descripcion}</p>
            </div>
            <button class="btn btn-sm btn-secondary mt-2 ver-codigo-btn" data-html="${plantilla.html.replace(/"/g, '&quot;')}">
              <i class="fa-solid fa-code me-1"></i> Ver código
            </button>
          </div>`;
        lista.appendChild(cardMini);
      }
    }

    contenedor.classList.remove("d-none");
  } catch (err) {
    mostrarNotificacion("Error al generar el contenido: " + (err?.message || "desconocido"), "error");
  }
}

function generarContenidoSemanal() {
  const hoy = new Date();
  const isoDow = ((hoy.getDay() + 6) % 7) + 1;
  const diasHastaViernes = 5 - isoDow;
  const viernes = new Date(hoy);
  viernes.setDate(hoy.getDate() + diasHastaViernes);

  const yyyy      = viernes.getFullYear();
  const mm        = String(viernes.getMonth() + 1).padStart(2, '0');
  const dd        = String(viernes.getDate()).padStart(2, '0');
  const viernesStr = `${yyyy}-${mm}-${dd}`;

  db.collection("inspira").get().then((qs) => {
    const items = [];
    const byId  = new Map();

    qs.forEach((doc) => {
      const data  = doc.data();
      const idNum = Number(data.id || doc.id);
      items.push({ idNum, docId: doc.id, data });
      byId.set(idNum, { docId: doc.id, data });
    });

    const candidato = items.find(it => it.data.fecha === viernesStr);
    if (!candidato) {
      mostrarNotificacion("No hay contenido con fecha del viernes de esta semana", "alerta");
      return;
    }

    const destacado = candidato;
    const previo    = byId.get(destacado.idNum - 1);

    const fechaObj     = new Date(destacado.data.fecha);
    const fechaFormato  = fechaObj.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

    const htmlDestacado = `<section class="card contenido" data-title="${destacado.data.titulo}" data-subtitle="${destacado.data.descripcion}" data-img="${destacado.data.imagen}" data-date="${fechaFormato}" data-category="${destacado.data.categoria}" data-duration="${destacado.data.duracion}" data-autor="${destacado.data.autor}" data-link="${destacado.data.link}">
      <div class="img-text-portada">
        <img src="${destacado.data.imagen}" alt="Imagen" draggable="false">
        <div class="overlay-gradient"></div>
        <div class="text">
          <img id="marca-image" src="/img/cms/paginas internas/DJOYAS INSPIRA/logo-inspira-1.png" alt="Marca">
          <h2>${destacado.data.titulo}</h2>
          <span>${destacado.data.categoria}</span>
        </div>
      </div>
    </section>`;

    let tarjetaCarrusel = "";
    if (previo && previo.data) {
      const fechaPrev    = new Date(previo.data.fecha);
      const fechaPrevFmt = fechaPrev.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
      tarjetaCarrusel = `<li class="card" data-title="${previo.data.titulo}" data-subtitle="${previo.data.descripcion}" data-img="${previo.data.imagen}" data-date="${fechaPrevFmt}" data-category="${previo.data.categoria}" data-duration="${previo.data.duracion}" data-link="${previo.data.link}" data-autor="${previo.data.autor}" data-section="${previo.data.categoria}">
        <div class="img-text-overlay">
          <img src="${previo.data.imagen}" alt="Imagen" draggable="false">
          <div class="overlay-gradient"></div>
          <div class="text">
            <h2>${previo.data.titulo}</h2>
            <span>${previo.data.tematica}</span>
          </div>
        </div>
      </li>`;
    } else {
      mostrarNotificacion(`No se encontró contenido previo para ID ${destacado.idNum}`, "alerta");
    }

    const contenedor = document.getElementById("bloqueGenerado");
    const lista      = document.createElement("div");
    lista.className  = "row";
    contenedor.innerHTML = '<h6><i class="fa-solid fa-calendar-week me-1"></i> Contenido semanal:</h6>';
    contenedor.appendChild(lista);

    const cardDest = document.createElement("div");
    cardDest.className = "col-md-6 col-lg-4 mb-3";
    cardDest.innerHTML = `
      <div class="ios-card p-3 h-100 d-flex flex-column justify-content-between">
        <div>
          <h6 class="text-primary"><i class="fa-solid fa-diamond me-1"></i> DESTACADO (ID ${destacado.idNum})</h6>
          <strong>${destacado.data.titulo}</strong>
          <p class="text-muted small mb-0 text-truncate">${destacado.data.descripcion}</p>
        </div>
        <button class="btn btn-sm btn-secondary mt-2 ver-codigo-btn" data-html="${htmlDestacado.replace(/"/g, '&quot;')}">
          <i class="fa-solid fa-code me-1"></i> Ver código
        </button>
      </div>`;
    lista.appendChild(cardDest);

    if (tarjetaCarrusel) {
      const cardCar = document.createElement("div");
      cardCar.className = "col-md-6 col-lg-4 mb-3";
      cardCar.innerHTML = `
        <div class="ios-card p-3 h-100 d-flex flex-column justify-content-between">
          <div>
            <h6 class="text-danger"><i class="fa-solid fa-film me-1"></i> CARRUSEL (ID ${destacado.idNum - 1})</h6>
            <strong>${previo.data.titulo}</strong>
            <p class="text-muted small mb-0 text-truncate">${previo.data.descripcion}</p>
          </div>
          <button class="btn btn-sm btn-secondary mt-2 ver-codigo-btn" data-html="${tarjetaCarrusel.replace(/"/g, '&quot;')}">
            <i class="fa-solid fa-code me-1"></i> Ver código
          </button>
        </div>`;
      lista.appendChild(cardCar);
    }

    contenedor.classList.remove("d-none");
    mostrarNotificacion("Contenido semanal generado", "exito");
  }).catch(() => {
    mostrarNotificacion("Error al generar contenido semanal", "error");
  });
}

function mostrarModalFormularioInfluencer() {
  const body = `
    <h5 class="mb-3"><i class="fa-solid fa-star me-2"></i>Crear tarjeta de Influencer</h5>
    <div class="mb-3">
      <label>Nombre de usuario</label>
      <input type="text" class="form-control" id="influencerNombre" placeholder="@ejemplo">
    </div>
    <div class="mb-3">
      <label>Foto (URL)</label>
      <input type="text" class="form-control" id="influencerImagen" placeholder="/img/...">
    </div>
    <div class="mb-3">
      <label>Categoría</label>
      <input type="text" class="form-control" id="influencerCategoria" placeholder="Ej: Marketing">
    </div>
    <button class="btn btn-primary mt-2" onclick="generarHTMLInfluencer()">
      <i class="fa-solid fa-wand-sparkles me-1"></i> Generar HTML
    </button>
  `;
  abrirModalBase(body);
}

function generarHTMLInfluencer() {
  const nombre    = document.getElementById("influencerNombre").value.trim();
  const img       = document.getElementById("influencerImagen").value.trim();
  const categoria = document.getElementById("influencerCategoria").value.trim();
  const username  = nombre.replace(/^@/, '');
  const link      = `https://www.instagram.com/${username}/`;

  const html = `<li class="card persona no-modal">
    <a href="${link}" target="_blank">
      <img class="avatar" src="${img}" alt="Influencer ${nombre}" />
    </a>
    <h3><a href="${link}" target="_blank">${nombre}</a></h3>
    <span>${categoria}</span>
  </li>`;

  cerrarModalBase();
  mostrarModalHTML(html);
}

function decodeHtmlEntities(str = "") {
  return String(str)
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&amp;/g,  "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'");
}

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('ver-codigo-btn') || e.target.closest('.ver-codigo-btn')) {
    const btn          = e.target.closest('.ver-codigo-btn') || e.target;
    const contenidoAttr = btn.getAttribute('data-html') || "";
    const contenidoHTML = decodeHtmlEntities(contenidoAttr);
    mostrarModalHTML(contenidoHTML);
  }
});

function mostrarModalHTML(contenidoHTML) {
  const body = `
    <h5 class="mb-3"><i class="fa-solid fa-code me-2"></i>Código HTML generado</h5>
    <textarea id="modalContenido" class="form-control inspira" rows="16"
      style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:14px;"></textarea>
    <div class="d-flex justify-content-end mt-3">
      <button class="btn btn-primary" onclick="copiarAlPortapapeles()">
        <i class="fa-solid fa-copy me-1"></i> Copiar HTML
      </button>
    </div>
  `;
  abrirModalBase(body);
  const ta = document.getElementById('modalContenido');
  if (ta) ta.value = contenidoHTML;
}

function cargarRecursos() {
  const tbody = document.getElementById("tablaRecursos");
  tbody.innerHTML = "";

  db.collection("inspira").get().then((querySnapshot) => {
    const rows = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      rows.push({ idNum: Number(data.id || doc.id), docId: doc.id, data });
    });
    rows.sort((a, b) => b.idNum - a.idNum);

    rows.forEach(({ docId, data }) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.id || docId}</td>
        <td>${data.titulo  || "-"}</td>
        <td>${data.fecha   || "-"}</td>
        <td>${data.tematica || "-"}</td>
        <td>${data.autor   || "-"}</td>
        <td>
          <div style="display:flex;align-items:center;gap:4px;">
            <button class="btn btn-icon" onclick="editarRecurso('${docId}')" title="Editar">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-icon" onclick="eliminarRecurso('${docId}')" title="Eliminar">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

window.showTab = function(tab) {
  const tabs    = document.querySelectorAll(".tab-section");
  const buttons = document.querySelectorAll(".tab-btn");

  tabs.forEach((el) => el.classList.add("d-none"));
  buttons.forEach((btn) => btn.classList.remove("active"));

  const currentTab = document.getElementById(tab);
  const currentBtn = document.getElementById("btn" + capitalize(tab));

  if (currentTab) currentTab.classList.remove("d-none");
  if (currentBtn) currentBtn.classList.add("active");

  if (tab.toLowerCase() === "recursos") {
    mostrarNotificacion("Pestaña Recursos activada", "exito");
    cargarRecursos();
  }
};

let idActualInspira = "";

function editarRecurso(id) {
  db.collection("inspira").doc(id).get().then(doc => {
    const data = doc.data();
    idActualInspira = id;
    document.getElementById("editInspiraId").value      = data.id || id;
    document.getElementById("editInspiraTitulo").value  = data.titulo     || "";
    document.getElementById("editInspiraFecha").value   = data.fecha      || "";
    document.getElementById("editInspiraTematica").value = data.tematica  || "";
    document.getElementById("editInspiraAutor").value   = data.autor      || "";
    document.getElementById("editLink").value           = data.link       || "";
    document.getElementById("editDuracion").value       = data.duracion   || "";
    document.getElementById("editCategoria").value      = data.categoria  || "";
    document.getElementById("editImagen").value         = data.imagen     || "";
    document.getElementById("editDescripcion").value    = data.descripcion || "";
    document.getElementById("modalEditarInspiraOverlay").style.display = "flex";
  });
}

function cerrarModalEditarInspira() {
  document.getElementById("modalEditarInspiraOverlay").style.display = "none";
}

function guardarEdicionInspira() {
  const titulo      = document.getElementById("editInspiraTitulo").value.trim();
  const fecha       = document.getElementById("editInspiraFecha").value.trim();
  const tematica    = document.getElementById("editInspiraTematica").value.trim();
  const autor       = document.getElementById("editInspiraAutor").value.trim();
  const link        = document.getElementById("editLink").value.trim();
  const duracion    = document.getElementById("editDuracion").value.trim();
  const categoria   = document.getElementById("editCategoria").value.trim();
  const imagen      = document.getElementById("editImagen").value.trim();
  const descripcion = document.getElementById("editDescripcion").value.trim();

  db.collection("inspira").doc(idActualInspira).update({
    titulo, fecha, tematica, autor, link, duracion, categoria, imagen, descripcion
  }).then(() => {
    cerrarModalEditarInspira();
    cargarRecursos();
    mostrarNotificacion("Contenido editado correctamente", "exito");
  }).catch(err => {
    console.error(err);
    mostrarNotificacion("Error al guardar los cambios", "error");
  });
}

function eliminarRecurso(id) {
  idActualInspira = id;
  document.getElementById("modalConfirmarEliminarInspira").style.display = "flex";
}

function cerrarModalEliminarInspira() {
  document.getElementById("modalConfirmarEliminarInspira").style.display = "none";
}

function eliminarInspiraConfirmado() {
  db.collection("inspira").doc(idActualInspira).delete().then(() => {
    cerrarModalEliminarInspira();
    cargarRecursos();
    mostrarNotificacion("Entrada eliminada correctamente", "exito");
  }).catch(err => {
    console.error(err);
    mostrarNotificacion("Error al eliminar la entrada", "error");
  });
}

function abrirModalAgregarRecurso() {
  const modal = document.getElementById("modalAgregarRecurso");
  if (modal) modal.style.display = "flex";
}

function cerrarModalAgregarRecurso() {
  const modal = document.getElementById("modalAgregarRecurso");
  if (modal) modal.style.display = "none";
}

function abrirModalBase(contenidoHTML) {
  document.getElementById("modalBaseBody").innerHTML = contenidoHTML;
  document.getElementById("modalBase").style.display = "flex";
}

function cerrarModalBase() {
  document.getElementById("modalBase").style.display      = "none";
  document.getElementById("modalBaseBody").innerHTML = "";
}

const modalBase = document.getElementById("modalBase");
if (modalBase) {
  modalBase.addEventListener("click", (e) => {
    if (e.target.id === "modalBase") cerrarModalBase();
  });
}

function copiarAlPortapapeles() {
  const ta = document.getElementById('modalContenido');
  if (!ta) { mostrarNotificacion("No se encontró el contenido a copiar", "error"); return; }
  ta.select();
  document.execCommand('copy');
  mostrarNotificacion("Código copiado al portapapeles", "exito");
}

// upd v.1.6