let db;
let cacheEntradas = [];

window.addEventListener('load', () => {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      db = firebase.firestore();
      cargarContenidos();
    } else {
      showIosModal("⚠️ Acceso denegado", "Debes iniciar sesión para ver Inspira.");
    }
  });
});

function showTab(tab) {
  const tabs = ['contenidos', 'recursos', 'ingreso'];
  tabs.forEach(t => {
    const section = document.getElementById(t);
    const btn = document.getElementById(`btn${capitalize(t)}`);
    if (section) section.classList.toggle('d-none', t !== tab);
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function showIosModal(title, message) {
  document.getElementById('iosModalTitle').textContent = title;
  document.getElementById('iosModalMessage').textContent = message;
  document.getElementById('iosModal').style.display = 'flex';
}

function closeIosModal() {
  document.getElementById('iosModal').style.display = 'none';
}

function refrescarContenidos() {
  cargarContenidos();
  mostrarNotificacion("Contenidos actualizados correctamente", "exito");
}

async function cargarContenidos() {
  const select = document.getElementById('contenidoSelect');
  select.innerHTML = '<option value="">Selecciona un contenido</option>';
  try {
    const snapshot = await db.collection("inspira").get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = `${data.titulo} (${data.tematica || 'sin temática'})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar contenidos:", error);
    select.innerHTML = '<option>Error al cargar</option>';
  }
}

async function guardarInspira(e) {
  e.preventDefault();

  const nuevaEntrada = {
    id: document.getElementById('inspiraId').value,
    titulo: document.getElementById('inspiraTitulo').value,
    autor: document.getElementById('inspiraAutor').value,
    descripcion: document.getElementById('inspiraDescripcion').value,
    imagen: document.getElementById('inspiraImagen').value,
    duracion: document.getElementById('inspiraDuracion').value + ' ' + document.getElementById('inspiraUnidad').value,
    tematica: document.getElementById('inspiraTematica').value,
    categoria: document.getElementById('inspiraCategoria').value,
    fecha: document.getElementById('inspiraFecha').value,
    link: document.getElementById('inspiraLink').value,
    timestamp: new Date().toISOString()
  };

  try {
    await db.collection("inspira").doc(nuevaEntrada.id).set(nuevaEntrada);
    document.getElementById('formInspira').reset();
    cerrarModalAgregarRecurso(); // 👈 aquí cerramos el modal
    mostrarNotificacion("El contenido fue guardado correctamente", "exito");
  } catch (err) {
    console.error("❌ Error al guardar entrada:", err);
    mostrarNotificacion("No se pudo guardar. Intenta de nuevo", "error");
  }
}


async function generarBloqueContenido() {
  const select = document.getElementById("contenidoSelect");
  const id = select.value;
  const isInfluencer = document.getElementById("checkInfluencer").checked;

  if (!id && !isInfluencer) return alert("Debes seleccionar un contenido o marcar Influencer");

  const etiquetas = {
    destacados: document.getElementById("checkDestacados").checked,
    carrusel: document.getElementById("checkCarrusel").checked,
    popular: document.getElementById("checkPopular").checked,
    influencer: isInfluencer
  };

  const contenedor = document.getElementById("bloqueGenerado");
  const lista = document.createElement("div");
  lista.className = "row";
  contenedor.innerHTML = '<h6>🧩 Contenidos generados:</h6>';
  contenedor.appendChild(lista);

  if (isInfluencer) {
    const cardMini = document.createElement("div");
    cardMini.className = "col-md-6 col-lg-4 mb-3";
    cardMini.innerHTML = `
      <div class="ios-card p-3 h-100 d-flex flex-column justify-content-between" style="cursor:pointer; background: linear-gradient(135deg, #ecf5ff, #ffffff);">
        <div>
          <h6 class="text-info">🌟 INFLUENCER</h6>
          <strong>Formulario personalizado</strong>
          <p class="text-muted small">Completa los datos a medida</p>
        </div>
        <button class="btn btn-sm btn-outline-secondary mt-2" onclick="mostrarModalFormularioInfluencer()">Abrir editor</button>
      </div>`;
    lista.appendChild(cardMini);
    contenedor.classList.remove("d-none");
    return;
  }

  try {
    const doc = await db.collection("inspira").doc(id).get();
    if (!doc.exists) return alert("Contenido no encontrado");
    const data = doc.data();

    const fechaObj = new Date(data.fecha);
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
        label: "🔹 DESTACADO",
        fondo: "#ffffff, #f8f9fa"
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
        label: "🎠 CARRUSEL",
        fondo: "#fff0f5, #fafafa"
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
        label: "🔥 POPULAR",
        fondo: "#fdf3e6, #ffffff"
      }
    };

    for (const key in etiquetas) {
      if (etiquetas[key] && plantillas[key]) {
        const plantilla = plantillas[key];
        const cardMini = document.createElement("div");
        cardMini.className = "col-md-6 col-lg-4 mb-3";
        cardMini.innerHTML = `
          <div class="ios-card p-3 h-100 d-flex flex-column justify-content-between" style="cursor:pointer; background: linear-gradient(135deg, ${plantilla.fondo});">
            <div>
              <h6 class="${plantilla.clase}">${plantilla.label}</h6>
              <strong>${data.titulo}</strong>
              <p class="text-muted small mb-0 text-truncate">${data.descripcion}</p>
            </div>
            <button class="btn btn-sm btn-outline-secondary mt-2 ver-codigo-btn" data-html="${plantilla.html.replace(/"/g, '&quot;')}">Ver código</button>
          </div>`;
        lista.appendChild(cardMini);
      }
    }

    contenedor.classList.remove("d-none");
  } catch (err) {
    alert("Error al generar el contenido: " + err.message);
  }
}

function mostrarModalFormularioInfluencer() {
  const modal = document.createElement("div");
  modal.id = "modalCodigoHTML";
  modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;";

  modal.innerHTML = `
  <div style="background:white; max-width:600px; padding:2rem; border-radius:16px; position:relative; width:90%; max-height:90vh; overflow:auto;">
    <button class="btn-close position-absolute end-0 top-0 m-3" onclick="document.getElementById('modalCodigoHTML').remove()"></button>
    <h5 class="mb-3">💫 Crear tarjeta de Influencer</h5>
    <div id="formularioInfluencer"></div>
  </div>`;

  document.body.appendChild(modal);
  document.getElementById("formularioInfluencer").innerHTML = `
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
    <button class="btn btn-primary mt-2" onclick="generarHTMLInfluencer()">✨ Generar HTML</button>`;
}

function generarHTMLInfluencer() {
  const nombre = document.getElementById("influencerNombre").value.trim();
  const img = document.getElementById("influencerImagen").value.trim();
  const categoria = document.getElementById("influencerCategoria").value.trim();
  const username = nombre.replace(/^@/, '');
  const link = `https://www.instagram.com/${username}/`;

  const html = `<li class="card persona no-modal">
  <a href="${link}" target="_blank">
    <img class="avatar" src="${img}" alt="Influencer ${nombre}" />
  </a>
  <h3><a href="${link}" target="_blank">${nombre}</a></h3>
  <span>${categoria}</span>
</li>`;

  document.getElementById("modalCodigoHTML").remove();
  mostrarModalHTML(html);
}

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('ver-codigo-btn')) {
    const contenidoHTML = e.target.getAttribute('data-html').replace(/&quot;/g, '"');
    mostrarModalHTML(contenidoHTML);
  }
});

function mostrarModalHTML(contenidoHTML) {
  const modal = document.createElement("div");
  modal.id = "modalCodigoHTML";
  modal.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0.6); z-index:9999;
    display:flex; align-items:center; justify-content:center;`;

  const inner = document.createElement("div");
  inner.style.cssText = `
    background:white; max-width:800px; padding:2rem;
    border-radius:16px; position:relative;
    width:90%; max-height:90vh; overflow:auto;`;

  const btn = document.createElement("button");
  btn.className = "btn-close position-absolute end-0 top-0 m-3";
  btn.onclick = () => modal.remove();

  const titulo = document.createElement("h5");
  titulo.className = "mb-3";
  titulo.textContent = "📋 Código HTML generado";

  const pre = document.createElement("pre");
  pre.id = "modalContenido";
  pre.style = "white-space:pre-wrap; background:#f9f9f9; padding:1rem; border-radius:10px;";
  pre.textContent = contenidoHTML;

  const copiar = document.createElement("button");
  copiar.className = "btn btn-primary mt-3";
  copiar.textContent = "📎 Copiar HTML";
  copiar.onclick = copiarAlPortapapeles;

  inner.appendChild(btn);
  inner.appendChild(titulo);
  inner.appendChild(pre);
  inner.appendChild(copiar);
  modal.appendChild(inner);
  document.body.appendChild(modal);
}

function copiarAlPortapapeles() {
  const texto = document.getElementById("modalContenido").textContent;
  navigator.clipboard.writeText(texto).then(() => {
    alert("¡Código HTML copiado al portapapeles!");
  });
}










// Llenar la tabla de recursos
function cargarRecursos() {
  const tbody = document.getElementById("tablaRecursos");
  tbody.innerHTML = "";

  db.collection("inspira").get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      const data = doc.data();

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${data.id || doc.id}</td>
        <td>${data.titulo || "-"}</td>
        <td>${data.fecha || "-"}</td>
        <td>${data.tematica || "-"}</td>
        <td>${data.autor || "-"}</td>
        <td>
          <button class="btn btn-sm btn-primary me-2" onclick="editarRecurso('${doc.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarRecurso('${doc.id}')">Eliminar</button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  });
}


// Editar recurso
function editarRecurso(id) {
  alert(`Editar recurso con ID: ${id}`);
  // Aquí puedes abrir un modal y precargar los datos para editar
}

// Eliminar recurso
function eliminarRecurso(id) {
  if (!confirm("¿Estás segura/o de eliminar esta entrada?")) return;

  db.collection("inspira").doc(id).delete()
    .then(() => {
      alert("Entrada eliminada");
      cargarRecursos();
    })
    .catch((error) => {
      console.error("Error eliminando:", error);
      alert("Error al eliminar la entrada");
    });
}

// Si quieres, llama a esta función al mostrar el tab:
window.showTab = function(tab) {
  const tabs = document.querySelectorAll(".tab-section");
  const buttons = document.querySelectorAll(".tab-btn");

  tabs.forEach((el) => el.classList.add("d-none"));
  buttons.forEach((btn) => btn.classList.remove("active"));

  const currentTab = document.getElementById(tab);
  const currentBtn = document.getElementById("btn" + capitalize(tab));

  if (currentTab) currentTab.classList.remove("d-none");
  if (currentBtn) currentBtn.classList.add("active");

  if (tab.toLowerCase() === "recursos") {
    console.log("✅ Tab recursos activado");
    cargarRecursos();
  }
};




let idActualInspira = "";

function editarRecurso(id) {
  db.collection("inspira").doc(id).get().then(doc => {
    const data = doc.data();
    idActualInspira = id;
    document.getElementById("editInspiraId").value = data.id || id;
    document.getElementById("editInspiraTitulo").value = data.titulo || "";
    document.getElementById("editInspiraFecha").value = data.fecha || "";
    document.getElementById("editInspiraTematica").value = data.tematica || "";
    document.getElementById("editInspiraAutor").value = data.autor || "";
    document.getElementById("editLink").value = data.link || "";
document.getElementById("editDuracion").value = data.duracion || "";  
document.getElementById("editCategoria").value = data.categoria || "";   
document.getElementById("editImagen").value = data.imagen || "";     
document.getElementById("editDescripcion").value = data.descripcion || "";    
    document.getElementById("modalEditarInspiraOverlay").style.display = "flex";

  });
}

function cerrarModalEditarInspira() {
  document.getElementById("modalEditarInspiraOverlay").style.display = "none";
}

function guardarEdicionInspira() {
  const titulo = document.getElementById("editInspiraTitulo").value.trim();
  const fecha = document.getElementById("editInspiraFecha").value.trim();
  const tematica = document.getElementById("editInspiraTematica").value.trim();
  const autor = document.getElementById("editInspiraAutor").value.trim();
  const link = document.getElementById("editLink").value.trim();
  const duracion = document.getElementById("editDuracion").value.trim();
  const categoria = document.getElementById("editCategoria").value.trim();
  const imagen = document.getElementById("editImagen").value.trim();
  const descripcion = document.getElementById("editDescripcion").value.trim();

  db.collection("inspira").doc(idActualInspira).update({
    titulo,
    fecha,
    tematica,
    autor,
    link,
    duracion,
    categoria,
    imagen,
    descripcion
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






//upd v.2.9