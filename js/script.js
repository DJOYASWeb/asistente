// LOGIN INICIO
   const firebaseConfig = {
    apiKey: "AIzaSyD6xqVEHb5eGrFr4cEu6y-OHxcpXjvybv4",
    authDomain: "djoyas-asistente.firebaseapp.com",
    projectId: "djoyas-asistente",
    storageBucket: "djoyas-asistente.firebasestorage.app",
    messagingSenderId: "990292345351",
    appId: "1:990292345351:web:72ae605299387fa31c20a2",
    measurementId: "G-9ZTSMFYFE1"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  function isEmailValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

function togglePassword() {
  const passwordInput = document.getElementById("password");
  const eyeIcon = document.getElementById("eyeIcon");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    eyeIcon.classList.remove("fa-eye");
    eyeIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    eyeIcon.classList.remove("fa-eye-slash");
    eyeIcon.classList.add("fa-eye");
  }
}

  function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const messageDiv = document.getElementById("message");

    // Limpiar mensajes anteriores
    messageDiv.textContent = "";
    messageDiv.className = "";

    // Validaciones antes de enviar
    if (email === "" || password === "") {
      messageDiv.textContent = "Completa todos los campos.";
      messageDiv.className = "error";
      return;
    }

    if (!isEmailValid(email)) {
      messageDiv.textContent = "El correo no tiene un formato válido.";
      messageDiv.className = "error";
      return;
    }

    firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        messageDiv.textContent = "Inicio de sesión exitoso.";
        messageDiv.className = "success";
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      })
      .catch((error) => {
        const errorCode = error.code;
        let userMessage = "Ha ocurrido un error.";

        if (errorCode === 'auth/wrong-password' || error.message.includes("INVALID_LOGIN_CREDENTIALS")) {
          userMessage = "Contraseña incorrecta.";
        } else if (errorCode === 'auth/user-not-found') {
          userMessage = "El usuario no existe.";
        } else if (errorCode === 'auth/invalid-email') {
          userMessage = "El correo no es válido.";
        }

        messageDiv.textContent = userMessage;
        messageDiv.className = "error";
      });
  } 
// LOGIN FIN



// DASHBOARD INICIO

function toggleSidebar() {
      document.getElementById("sidebar").classList.toggle("collapsed");
    }

    function toggleMobileSidebar() {
      document.getElementById("sidebar").classList.toggle("active");
      document.getElementById("overlay").classList.toggle("show");
    }

    function closeMobileSidebar() {
      document.getElementById("sidebar").classList.remove("active");
      document.getElementById("overlay").classList.remove("show");
    }

    function toggleDropdown() {
      document.getElementById("dropdown").classList.toggle("show");
    }

    function toggleTheme() {
      const body = document.body;
      const icon = document.getElementById("theme-icon");
      const label = document.querySelector(".switch-label");
      const isDark = body.getAttribute("data-theme") === "dark";
      body.setAttribute("data-theme", isDark ? "light" : "dark");
      icon.textContent = isDark ? "🌙" : "☀️";
      label.textContent = isDark ? "Modo oscuro" : "Modo claro";
    }

    function logout() {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "login.html";
    }

    window.onclick = function (e) {
      if (!e.target.closest('.profile-section')) {
        const dropdown = document.getElementById("dropdown");
        if (dropdown && dropdown.classList.contains("show")) {
          dropdown.classList.remove("show");
        }
      }
    }

// DASHBOARD FIN

// INSPIRA INICIO

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

function showTab(tab) {
  const tabs = ['contenidos', 'recursos', 'ingreso', 'crear', 'redactar', 'calendario'];
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

function mostrarContenido() {
  const selector = document.getElementById("contenidoSelector").value;
  document.getElementById("contenidoTarjetas").classList.toggle("d-none", selector !== "tarjetas");
  document.getElementById("contenidoInfluencers").classList.toggle("d-none", selector !== "influencers");
}

function mostrarPopup() {
  const popup = document.getElementById('popupSuccess');
  popup.style.display = 'block';
  popup.style.opacity = '1';
  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => popup.style.display = 'none', 300);
  }, 3000);
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
    showIosModal("✅ Éxito", "El contenido fue guardado correctamente.");
  } catch (err) {
    console.error("❌ Error al guardar entrada:", err);
    showIosModal("❌ Error", "No se pudo guardar. Intenta de nuevo.");
  }
}


async function abrirModalEntradas() {
document.getElementById('modalEntradas').style.display = 'block';
const contenedor = document.getElementById('contenedorEntradasFirestore');
contenedor.innerHTML = "<p class='text-muted'>Cargando entradas...</p>";

try {
  const snapshot = await db.collection("inspira").orderBy("timestamp", "desc").get();
  if (snapshot.empty) {
    contenedor.innerHTML = "<p class='text-muted'>No hay entradas disponibles.</p>";
    return;
  }

  contenedor.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const card = document.createElement("div");
    card.className = "ios-card mb-3";
    card.innerHTML = `
      <h6 class="mb-1">${data.titulo}</h6>
      <p class="mb-1 text-muted">${data.descripcion}</p>
      ${data.imagen ? `<img src="${data.imagen}" alt="Imagen" class="img-fluid mb-2" style="border-radius:var(--radius); max-height:200px; object-fit:cover;">` : ""}
      <small><strong>Duración:</strong> ${data.duracion || "N/A"} | 
      <strong>Temática:</strong> ${data.tematica || "-"} | 
      <strong>Categoría:</strong> ${data.categoria || "-"}
      <strong>Fecha:</strong> ${data.fecha || "-"} | 
      <strong>ID:</strong> ${data.id || "-"}
      <strong>Autor:</strong> ${data.autor || "-"} | 
    `;
    contenedor.appendChild(card);
  });
} catch (err) {
  contenedor.innerHTML = "<p class='text-danger'>Error al cargar las entradas.</p>";
}
}

function cerrarModalEntradas() {
document.getElementById('modalEntradas').style.display = 'none';
}


let cacheEntradas = [];

async function abrirModalEntradas() {
document.getElementById('modalEntradas').style.display = 'block';
const contenedor = document.getElementById('contenedorEntradasFirestore');
contenedor.innerHTML = "<p class='text-muted'>Cargando entradas...</p>";

try {
const snapshot = await db.collection("inspira").orderBy("timestamp", "desc").get();
cacheEntradas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
renderizarEntradas(cacheEntradas);
} catch (err) {
contenedor.innerHTML = "<p class='text-danger'>Error al cargar las entradas.</p>";
}
}

function cerrarModalEntradas() {
document.getElementById('modalEntradas').style.display = 'none';
document.getElementById('busquedaNombre').value = "";
document.getElementById('filtroCategoria').value = "";
}

function filtrarEntradas() {
const texto = document.getElementById('busquedaNombre').value.toLowerCase();
const categoria = document.getElementById('filtroCategoria').value;
const filtradas = cacheEntradas.filter(ent =>
(!texto || ent.titulo.toLowerCase().includes(texto)) &&
(!categoria || ent.categoria === categoria)
);
renderizarEntradas(filtradas);
}

function renderizarEntradas(entradas) {
const contenedor = document.getElementById('contenedorEntradasFirestore');
contenedor.innerHTML = "";

if (entradas.length === 0) {
contenedor.innerHTML = "<p class='text-muted'>No hay coincidencias.</p>";
return;
}

entradas.forEach(ent => {
const card = document.createElement("div");
card.className = "ios-card mb-3";
card.innerHTML = `
  <div class="row" id="view-${ent.id}">
    <div class="col-lg-6 col-12">
    <h6>${ent.titulo}</h6>
    <p class="text-muted">${ent.descripcion}</p>
    ${ent.imagen ? `<img src="${ent.imagen}" class="img-fluid mb-2" style="border-radius:var(--radius); max-height:200px; object-fit:cover;">` : ""}  
    </div>
    <div class="col-lg-2 col-6">
    <strong>ID:</strong> ${ent.id}</small><br>   
    <strong>Duración:</strong> ${ent.duracion || "N/A"}<br>
    <strong>Fecha:</strong> ${ent.fecha || "-"}<br>
    </div>
    <div class="col-lg-2 col-6">
    <strong>Autor:</strong> ${ent.autor || "-"}<br>
    <strong>Temática:</strong> ${ent.tematica || "-"}<br>
    <strong>Categoría:</strong> ${ent.categoria || "-"}<br>   
    </div>
    <div class="col-lg-2 col-12">
    <button class="btn btn-sm btn-outline-primary mt-2" onclick="editarEntrada('${ent.id}')">✏️ Editar</button>  
    </div>

  </div>
<div id="edit-${ent.id}" class="d-none">
<div class="row m-1">
<div class="col-lg-6 col-12">
<div class="flex-input my-2">
<h6 class="m-2 col-lg-2 col-12">Titulo</h6>
<input type="text" class="form-control mb-1" id="editTitulo-${ent.id}" value="${ent.titulo}">
</div>
<div class="flex-input my-2">
<h6 class="m-2 col-lg-2 col-12">Descripcion</h6>
<textarea class="form-control mb-1" id="editDescripcion-${ent.id}">${ent.descripcion}</textarea>
  </div>
  <div class="flex-input my-2">
    <h6 class="m-2 col-lg-2 col-12">Imagen</h6>
    <input type="text" class="form-control mb-1" id="editImagen-${ent.id}" value="${ent.imagen}">
  </div>
  <div class="flex-input my-2">
    <h6 class="m-2 col-lg-2 col-12">Url</h6>
    <input type="text" class="form-control mb-1" id="editLink-${ent.id}" value="${ent.link || ""}">
  </div>
  </div>
  <div class="col-lg-3 col-12">
          <div class="flex-input my-2">
      <h6 class="m-2 col-lg-3 col-12">ID</h6>
      <input type="date" class="form-control mb-1" id="editid-${ent.id}" value="${ent.id || ""}">  
    </div>
    <div class="flex-input my-2">
      <h6 class="m-2 col-lg-3 col-12">Fecha</h6>
      <input type="date" class="form-control mb-1" id="editFecha-${ent.id}" value="${ent.fecha || ""}">  
    </div>
    <div class="flex-input my-2">
      <h6 class="m-2 col-lg-3 col-12">Duracion</h6>
      <input type="text" class="form-control mb-1" id="editDuracion-${ent.id}" value="${ent.duracion}">
    </div>
  </div>

  <div class="col-lg-3 col-12">
    <div class="flex-input my-2">
      <h6 class="m-2 col-lg-3 col-12">Autor</h6>
       <input type="text" class="form-control mb-1" id="editAutor-${ent.id}" value="${ent.autor}">
     </div>
  <div class="flex-input my-2">
      <h6 class="m-2 col-lg-3 col-12">Tematica</h6>
       <input type="text" class="form-control mb-1" id="editTematica-${ent.id}" value="${ent.tematica}">
     </div>
  <div class="flex-input my-2">
      <h6 class="m-2 col-lg-3 col-12">Categoria</h6>
       <input type="text" class="form-control mb-1" id="editCategoria-${ent.id}" value="${ent.categoria}">
     </div>
  </div>

</div>
<button class="btn btn-sm btn-success mt-2" onclick="guardarEdicion('${ent.id}')">💾 Guardar cambios</button>
<button class="btn btn-sm btn-outline-secondary mt-2" onclick="cancelarEdicion('${ent.id}')">Cancelar</button>
</div>


`;
contenedor.appendChild(card);
});
}

function editarEntrada(id) {
document.getElementById(`view-${id}`).classList.add('d-none');
document.getElementById(`edit-${id}`).classList.remove('d-none');
}

function cancelarEdicion(id) {
document.getElementById(`edit-${id}`).classList.add('d-none');
document.getElementById(`view-${id}`).classList.remove('d-none');
}

async function guardarEdicion(id) {
const docRef = db.collection("inspira").doc(id);
const updated = {
titulo: document.getElementById(`editTitulo-${id}`).value,
descripcion: document.getElementById(`editDescripcion-${id}`).value,
autor: document.getElementById(`editAutor-${id}`).value,
imagen: document.getElementById(`editImagen-${id}`).value,
duracion: document.getElementById(`editDuracion-${id}`).value,
tematica: document.getElementById(`editTematica-${id}`).value,
categoria: document.getElementById(`editCategoria-${id}`).value,
fecha: document.getElementById(`editFecha-${id}`).value,
link: document.getElementById(`editLink-${id}`).value
};

try {
await docRef.update(updated);
mostrarPopup(); 
abrirModalEntradas();
} catch (err) {
alert("Error al actualizar: " + err.message);
}
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

//  FUNCIONALIDAD COMPLETA: incluye soporte especial para INFLUENCER con inputs dinámicos y render modal

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
const htmlInputs = `
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
  <button class="btn btn-primary mt-2" onclick="generarHTMLInfluencer()">✨ Generar HTML</button>
`;

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
const fechaFormato = fechaObj.toLocaleDateString("es-ES", {
  day: "2-digit", month: "short", year: "numeric"
});

if (etiquetas.destacados) {
  const htmlDestacado = `<section class="card contenido" 
data-title="${data.titulo}" 
data-subtitle="${data.descripcion}" 
data-img="${data.imagen}" 
data-date="${fechaFormato}" 
data-category="${data.categoria}" 
data-duration="${data.duracion}" 
data-autor="${data.autor}" 
data-link="${data.link}">
<div class="img-text-portada">
<img src="${data.imagen}" alt="Imagen" draggable="false">
<div class="overlay-gradient"></div>
<div class="text">
  <img id="marca-image" src="/img/cms/paginas internas/DJOYAS INSPIRA/logo-inspira-1.png" alt="Marca">
  <h2>${data.titulo}</h2>
  <span>${data.categoria}</span>
</div>
</div>
</section>`;

  const cardMini = document.createElement("div");
  cardMini.className = "col-md-6 col-lg-4 mb-3";
  cardMini.innerHTML = `
    <div class="ios-card p-3 h-100 d-flex flex-column justify-content-between" style="cursor:pointer; background: linear-gradient(135deg, #ffffff, #f8f9fa);">
      <div>
        <h6 class="text-primary">🔹 DESTACADO</h6>
        <strong>${data.titulo}</strong>
        <p class="text-muted small mb-0 text-truncate">${data.descripcion}</p>
      </div>
      <button class="btn btn-sm btn-outline-secondary mt-2 ver-codigo-btn" data-html="${htmlDestacado.replace(/"/g, '&quot;')}">Ver código</button>
    </div>`;
  lista.appendChild(cardMini);
}

if (etiquetas.carrusel) {
  const htmlCarrusel = `<li class="card" 
data-title="${data.titulo}" 
data-subtitle="${data.descripcion}" 
data-img="${data.imagen}" 
data-date="${fechaFormato}" 
data-category="${data.categoria}" 
data-duration="${data.duracion}" 
data-link="${data.link}" 
data-autor="${data.autor}" 
data-section="${data.categoria}">
<div class="img-text-overlay">
<img src="${data.imagen}" alt="Imagen" draggable="false">
<div class="overlay-gradient"></div>
<div class="text">
  <h2>${data.titulo}</h2>
  <span>${data.tematica}</span>
</div>
</div>
</li>`;

  const cardMini = document.createElement("div");
  cardMini.className = "col-md-6 col-lg-4 mb-3";
  cardMini.innerHTML = `
    <div class="ios-card p-3 h-100 d-flex flex-column justify-content-between" style="cursor:pointer; background: linear-gradient(135deg, #fff0f5, #fafafa);">
      <div>
        <h6 class="text-danger">🎠 CARRUSEL</h6>
        <strong>${data.titulo}</strong>
        <p class="text-muted small mb-0 text-truncate">${data.descripcion}</p>
      </div>
      <button class="btn btn-sm btn-outline-secondary mt-2 ver-codigo-btn" data-html="${htmlCarrusel.replace(/"/g, '&quot;')}">Ver código</button>
    </div>`;
  lista.appendChild(cardMini);
}

if (etiquetas.popular) {
  const htmlPopular = `<li class="card" 
data-title="${data.titulo}" 
data-subtitle="${data.descripcion}" 
data-img="${data.imagen}" 
data-date="${fechaFormato}" 
data-category="${data.categoria}" 
data-duration="${data.duracion}" 
data-link="${data.link}" 
data-autor="${data.autor}" 
data-section="${data.tematica || data.categoria}">
<div class="img-text-overlay">
<img src="${data.imagen}" alt="Imagen" draggable="false">
</div>
<div class="ranking">
<span>1</span>
<h3>${data.titulo}</h3>
</div>
</li>`;

  const cardMini = document.createElement("div");
  cardMini.className = "col-md-6 col-lg-4 mb-3";
  cardMini.innerHTML = `
    <div class="ios-card p-3 h-100 d-flex flex-column justify-content-between" style="cursor:pointer; background: linear-gradient(135deg, #fdf3e6, #ffffff);">
      <div>
        <h6 class="text-warning">🔥 POPULAR</h6>
        <strong>${data.titulo}</strong>
        <p class="text-muted small mb-0 text-truncate">${data.descripcion}</p>
      </div>
      <button class="btn btn-sm btn-outline-secondary mt-2 ver-codigo-btn" data-html="${htmlPopular.replace(/"/g, '&quot;')}">Ver código</button>
    </div>`;
  lista.appendChild(cardMini);
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



//  DELEGACIÓN para mostrar el modal correctamente

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
position:fixed;
top:0; left:0;
width:100%;
height:100%;
background:rgba(0,0,0,0.6);
z-index:9999;
display:flex;
align-items:center;
justify-content:center;
`;

const inner = document.createElement("div");
inner.style.cssText = `
background:white;
max-width:800px;
padding:2rem;
border-radius:16px;
position:relative;
width:90%;
max-height:90vh;
overflow:auto;
`;

const btn = document.createElement("button");
btn.className = "btn-close position-absolute end-0 top-0 m-3";
btn.onclick = () => document.getElementById('modalCodigoHTML').remove();

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

window.addEventListener('load', cargarContenidos);

function showIosModal(title, message) {
  document.getElementById('iosModalTitle').textContent = title;
  document.getElementById('iosModalMessage').textContent = message;
  const modal = document.getElementById('iosModal');
  modal.style.display = 'flex';
}

function closeIosModal() {
  const modal = document.getElementById('iosModal');
  modal.style.display = 'none';
}

function refrescarContenidos() {
  cargarContenidos();
  showIosModal("🔄 Refrescado", "Se actualizaron los contenidos desde la base de datos.");
}


// INSPIRA FIN

// TAREAS INICIO
let noteGrid;
noteGrid = document.getElementById('noteGrid');
if (noteGrid) {
  loadNotes();
}
const filtroFecha = document.getElementById('filtroFecha');
let historial = [];
let rehacerHistorial = [];

function guardarEstado() {
  const estadoActual = localStorage.getItem('tareasNotas');
  if (estadoActual) historial.push(estadoActual);
  if (historial.length > 50) historial.shift();
  rehacerHistorial = [];
}

function deshacer() {
  if (historial.length === 0) return;
  const estadoAnterior = historial.pop();
  const actual = localStorage.getItem('tareasNotas');
  if (actual) rehacerHistorial.push(actual);
  localStorage.setItem('tareasNotas', estadoAnterior);
  loadNotes();
}

function rehacer() {
  if (rehacerHistorial.length === 0) return;
  const siguiente = rehacerHistorial.pop();
  localStorage.setItem('tareasNotas', siguiente);
  loadNotes();
}

function saveNotes() {
  guardarEstado();
  const notes = [...document.querySelectorAll('.note')].map(note => ({
    title: note.querySelector('.note-title').value,
    date: note.querySelector('.note-date').value,
    tasks: [...note.querySelectorAll('.task')].map(task => ({
      text: task.querySelector('span').textContent,
      checked: task.querySelector('input[type="checkbox"]').checked
    }))
  }));
  localStorage.setItem('tareasNotas', JSON.stringify(notes));
}

function loadNotes() {
  if (!noteGrid) return; // ✅ Seguridad extra

  const data = JSON.parse(localStorage.getItem('tareasNotas') || '[]');
  noteGrid.innerHTML = '';
  data.forEach(note => createNote(note));
}


function addNote() {
  createNote();
}

function createNote(data = {}) {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-lg-3 mb-3';

  const noteId = 'note_' + Date.now();

  const note = document.createElement('div');
  note.className = 'card note p-3';
  note.setAttribute('id', noteId);

  note.innerHTML = `
    <div class="d-flex align-items-center justify-content-between mb-1">
      <input type="text" class="form-control note-title border-0 fw-bold fs-6 me-2" placeholder="Título..." value="${data.title || ''}" oninput="saveNotes()" />
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary position-relative overflow-hidden">
          <i class="fas fa-calendar-alt"></i>
          <input type="date" class="note-date position-absolute top-0 start-0 opacity-0"
                 style="width: 100%; height: 100%; cursor: pointer;"
                 value="${data.date || ''}" onchange="actualizarFecha(this)">
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteNote(this)">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>

    <small class="text-muted fecha-visual ms-1 mb-2">${data.date ? `📅 ${data.date}` : ''}</small>
    <hr style="py-2">
    <div class="tasks mb-2">
      ${(data.tasks || []).map(t => `
        <div class="task d-flex align-items-center mb-1">
          <input type="checkbox" class="form-check-input me-2" ${t.checked ? 'checked' : ''} onchange="toggleComplete(this)">
          <span class="flex-grow-1 ${t.checked ? 'text-decoration-line-through text-muted' : ''}" ondblclick="editarTarea(this)">${t.text}</span>
          <button class="btn btn-sm btn-outline-secondary ms-2" onclick="removeTask(this)">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join('')}
    </div>

    <div class="input-group input-group-sm mb-2">
      <input type="text" class="form-control" placeholder="Nueva tarea..." />
      <button class="btn btn-outline-primary" onclick="addTask(this)">+</button>
    </div>

    <div class="dropdown">
      <button class="btn btn-sm btn-light" onclick="deshacer()" title="Deshacer"><i class="fas fa-arrow-left"></i></button>
      <button class="btn btn-sm btn-light dropdown-toggle" data-bs-toggle="dropdown">
        <i class="fas fa-bell"></i>
      </button>
      <div class="dropdown-menu p-3" style="min-width: 250px">
        <label>Fecha:</label>
        <input type="date" class="form-control mb-2" id="fecha-${noteId}">
        <label>Hora:</label>
        <input type="time" class="form-control mb-2" id="hora-${noteId}">
        <div class="form-check mb-2">
          <input type="checkbox" class="form-check-input" id="repetir-${noteId}">
          <label class="form-check-label" for="repetir-${noteId}">Repetir</label>
        </div>
        <button class="btn btn-primary w-100" onclick="programarRecordatorio('${noteId}')">Programar</button>
      </div>
    </div>

    <span class="badge bg-warning mt-2 d-none" id="etiqueta-${noteId}">Recordatorio activado</span>


  `;

  col.appendChild(note);
  noteGrid.appendChild(col);
  saveNotes();
}

function programarRecordatorio(noteId) {
  const fecha = document.getElementById(`fecha-${noteId}`).value;
  const hora = document.getElementById(`hora-${noteId}`).value;
  const repetir = document.getElementById(`repetir-${noteId}`).checked;
  const nota = document.getElementById(noteId);
  const titulo = nota.querySelector('.note-title').value || 'Nota sin título';

  const fechaHora = new Date(`${fecha}T${hora}`);
  const ahora = new Date();

  const diff = fechaHora - ahora;
  if (diff <= 0) return alert('Elige una hora futura');

  document.getElementById(`etiqueta-${noteId}`).classList.remove('d-none');
  document.getElementById(`etiqueta-${noteId}`).textContent = `⏰ ${hora} del ${fecha}`;

  setTimeout(() => {
    mostrarNotificacion(titulo, fechaHora.toLocaleTimeString(), noteId);
    if (repetir) {
      // Reprogramar para el día siguiente a la misma hora
      programarRecordatorio(noteId);
    }
  }, diff);
}

function mostrarNotificacion(titulo, hora, noteId) {
  const toast = document.createElement('div');
  toast.className = 'toast align-items-center text-bg-dark border-0 show position-fixed bottom-0 end-0 m-3';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        🔔 <strong>${titulo}</strong><br>Recordatorio para las ${hora}
      </div>
      <button class="btn btn-warning btn-sm m-2" onclick="verNota('${noteId}')">Ver nota</button>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 10000);
}

function verNota(id) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('border', 'border-warning');
    setTimeout(() => target.classList.remove('border', 'border-warning'), 2000);
  }
}

function addTask(button) {
  const note = button.closest('.note');
  const input = note.querySelector('.input-group input');
  const tasks = note.querySelector('.tasks');
  const taskText = input.value.trim();
  if (!taskText) return;

  const taskEl = document.createElement('div');
  taskEl.className = 'task d-flex align-items-center mb-1';
  taskEl.innerHTML = `
    <input type="checkbox" class="form-check-input me-2" onchange="toggleComplete(this)">
    <span class="flex-grow-1" ondblclick="editarTarea(this)">${taskText}</span>
    <button class="btn btn-sm btn-outline-secondary ms-2" onclick="removeTask(this)">
      <i class="fas fa-times"></i>
    </button>
  `;
  tasks.appendChild(taskEl);
  input.value = "";
  saveNotes();
}

function removeTask(btn) {
  btn.parentElement.remove();
  saveNotes();
}

function toggleComplete(checkbox) {
  const span = checkbox.nextElementSibling;
  span.classList.toggle('text-decoration-line-through', checkbox.checked);
  span.classList.toggle('text-muted', checkbox.checked);
  saveNotes();
}

function deleteNote(btn) {
  btn.closest('.col-12').remove();
  saveNotes();
}

function filtrarPorFecha() {
  const filtro = filtroFecha.value;
  const cards = document.querySelectorAll('.note');
  cards.forEach(note => {
    const fecha = note.querySelector('.note-date').value;
    note.closest('.col-12').style.display = (!filtro || filtro === fecha) ? '' : 'none';
  });
}

function filtrarPorTexto() {
  const texto = document.getElementById('busquedaTexto').value.toLowerCase();
  const notas = document.querySelectorAll('.note');
  notas.forEach(nota => {
    const titulo = nota.querySelector('.note-title')?.value.toLowerCase() || '';
    nota.closest('.col-12').style.display = titulo.includes(texto) ? '' : 'none';
  });
}

function actualizarFecha(input) {
  const small = input.closest('.note').querySelector('.fecha-visual');
  small.textContent = input.value ? `📅 ${input.value}` : '';
  saveNotes();
}

function editarTarea(span) {
  const textoOriginal = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = textoOriginal;
  input.className = 'form-control form-control-sm';
  input.style.flex = '1';

  span.replaceWith(input);
  input.focus();

  input.addEventListener('blur', () => {
    guardarTextoEditado(input, textoOriginal);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    }
  });
}

function guardarTextoEditado(input, textoOriginal) {
  const nuevoTexto = input.value.trim() || textoOriginal;
  const span = document.createElement('span');
  span.textContent = nuevoTexto;
  span.style.flex = '1';
  span.addEventListener('dblclick', () => editarTarea(span));
  if (input.previousElementSibling?.checked) {
    span.classList.add('text-decoration-line-through', 'text-muted');
  }
  input.replaceWith(span);
  saveNotes();
}

window.addEventListener('DOMContentLoaded', loadNotes);

// TAREAS FIN



// BLOG CREADOR
let navegacionBlogs = [];

function cargarNavegacionSelects() {
  fetch('./data/navegacion.json')
    .then(res => res.json())
    .then(data => {
      navegacionBlogs = data;

      const selectAnterior = document.getElementById("selectAnterior");
      const selectSiguiente = document.getElementById("selectSiguiente");

      data.forEach((blog, index) => {
        const optionA = document.createElement("option");
        optionA.value = index;
        optionA.textContent = blog.titulo;
        selectAnterior.appendChild(optionA);

        const optionS = document.createElement("option");
        optionS.value = index;
        optionS.textContent = blog.titulo;
        selectSiguiente.appendChild(optionS);
      });
    });
}



  let blogs = [];

  function llenarSelects() {
    fetch('./data/blogs.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        blogs = data;
        const selects = [select1, select2, select3];
        selects.forEach(select => {
          select.innerHTML = "";
          blogs.forEach((blog, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = blog.titulo;
            select.appendChild(option);
          });
        });
      })
     }

  window.onload = llenarSelects;


    function generarHTML() {
      const titulo = document.getElementById("titulo").value;
      const fecha = document.getElementById("fecha").value;
      const autor = document.getElementById("autor").value;
      const categoria = document.getElementById("categoria").value;
      const imagen = document.getElementById("imagen").value;
      const altImagen = document.getElementById("altImagen").value;
      const cuerpo = document.getElementById("cuerpo").value;

      if (!titulo || !fecha || !autor || !categoria || !imagen || !cuerpo) {
        alert("Por favor completa todos los campos obligatorios antes de generar el HTML.");
        return;
      }

const blogAnterior = navegacionBlogs[parseInt(document.getElementById("selectAnterior").value)];
const blogSiguiente = navegacionBlogs[parseInt(document.getElementById("selectSiguiente").value)];

const tituloAnterior = blogAnterior.titulo;
const urlAnterior = blogAnterior.url;
const categoriaAnterior = blogAnterior.categoria;

const tituloSiguiente = blogSiguiente.titulo;
const urlSiguiente = blogSiguiente.url;
const categoriaSiguiente = blogSiguiente.categoria;

      const i1 = parseInt(select1.value);
      const i2 = parseInt(select2.value);
      const i3 = parseInt(select3.value);
      const destacados = [blogs[i1], blogs[i2], blogs[i3]];

      const destacadosHTML = destacados.map(blog => `
<div class="row card-recomendados">
  <div class="col-5 portada-recomendados">
    <a href="${blog.url}">
      <img src="${blog.img}">
    </a>   
  </div>
  <div class="col-7">
    <a href="${blog.url}">
      <h3 class="recomendados pt-2">${blog.titulo}</h3>
    </a>
    <div class="etiquetas">
      <a class="etiqueta-tag" href="${blog.url.split('/').slice(0, 6).join('/')}">${blog.categoria}</a>
    </div>
  </div>
</div>
<hr>`).join('\n');

      const slug = categoria.toLowerCase().replace(/\s+/g, '-');
      const slugAnterior = categoriaAnterior.toLowerCase().replace(/\s+/g, '-');
      const slugSiguiente = categoriaSiguiente.toLowerCase().replace(/\s+/g, '-');

      const html = `
<div class="blog container">
  <div class="row division">
    <div class="col-12 col-md-12 col-lg-8 bloque-contenido px-3">

<section class="header-blog">
  <h1 class="titulo-blog">${titulo}</h1>
  <div class="info-blog">
    <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${slug}">${categoria}</a>
    <a class="ml-2">${fecha}</a>
    <span class="ml-2">Autora: <a href="#"><u>${autor}</u></a></span>
  </div>
  <div class="portada-blog">
    <img src="${imagen}" class="caja-img" alt="${altImagen}">
  </div>
</section>

<section class="contenido-blog">
  <p>${cuerpo}</p>
</section>

<hr>
<section class="rrss-blog row container py-3">
  <div class="col-6"><a>Sofia de DJOYAS, </a><a>${fecha}</a></div>
  <div class="col-6 iconos-blog">
    <a href="https://www.youtube.com/@distribuidoradejoyaschile9639"><i class="fa fa-youtube icono-contenido mx-1"></i></a>
    <a href="https://www.instagram.com/distribuidoradejoyas.cl/"><i class="fa fa-instagram icono-contenido mx-1"></i></a>
    <a href="https://cl.pinterest.com/distribuidoradejoyasCL/"><i class="fa fa-pinterest icono-contenido mx-1"></i></a>
    <a href="https://www.facebook.com/distribuidoradejoyaschile"><i class="fa fa-facebook icono-contenido mx-1"></i></a>
  </div>
</section>

<section class="navegacion-articulos row mt-5">
  <div class="col-lg-6 col-md-6 col-12">
    <div class="bloque">
      <a href="${urlAnterior}">
        <p class="etiqueta-blog"><i class="fa fa-angle-left mx-2"></i>Blog anterior</p>
      </a>
      <hr>
      <div class="row card-recomendados">
        <div class="col-auto">
          <h3 class="recomendados pt-2"><a href="${urlAnterior}">${tituloAnterior}</a></h3>
          <div class="etiquetas">
            <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${slugAnterior}">${categoriaAnterior}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="col-lg-6 col-md-6 col-12">
    <div class="bloque2">
      <a href="${urlSiguiente}">
        <p class="etiqueta-blog">Blog siguiente <i class="fa fa-angle-right mx-2"></i></p>
      </a>
      <hr>
      <div class="row card-recomendados">
        <div class="col-auto">
          <h3 class="recomendados pt-2"><a href="${urlSiguiente}">${tituloSiguiente}</a></h3>
          <div class="etiquetas">
            <a class="etiqueta-tag" href="https://distribuidoradejoyas.cl/blog/${slugSiguiente}">${categoriaSiguiente}</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

</div>
<div class="col-12 col-md-12 col-lg-4 bloque-lateral">

<!-- Inicio blog destacados -->
<section class="destacados">
  <div class="caja">
    <h2 class="titulo-card">Blog más vistos</h2>
    <hr>
${destacadosHTML}
  </div>
</section>
<!-- Fin blog destacados -->
<!-- Contenido publicidad -->
<section class="publicidad-blog mt-5"><a  href="https://distribuidoradejoyas.cl/djoyas-inspira.24"><img src="/img/cms/paginas internas/blogs/inspira-blog.jpg" class="caja-img" alt="portada de blog"></a>
</section>


<!-- Etiquetas de contenido -->
 <section class="contenidos">
<div class="caja mt-5">
<h2 class="titulo-card">Consejos, Tendencias y Mucho Más</h2>
<ul class="list-group list-group-flush">
<li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/emprendimiento"><h3 class="etiqueta-blog">Emprendimiento </h3></a><i class="fa fa-angle-right"></i></li>
  <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/sabias-que"><h3 class="etiqueta-blog">Sabias que? </h3></a><i class="fa fa-angle-right"></i></li>
  <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/beneficios"><h3 class="etiqueta-blog">Beneficios</h3></a><i class="fa fa-angle-right"></i></li>
  <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/cuidado-y-mantenimiento"><h3 class="etiqueta-blog">Cuidado y Mantenimiento</h3></a><i class="fa fa-angle-right"></i>
  <li class="list-group-item"><a href="https://distribuidoradejoyas.cl/blog/innovacion"><h3 class="etiqueta-blog">Innovación</h3></a><i class="fa fa-angle-right"></i>
</ul></div></section></div></div>


<!-- Newsletter Blog -->
<section class="newsletter-blog my-3">
<div class="row">
<div class="col-12 col-lg-9 cuerpo-newsletter">
<h2>Estás buscando ese impulso extra para tu emprendimiento?</h2>
<p class="">Suscríbete y recibe todas las novedades de productos, noticias, tips y consejos para hacer crecer tu emprendimiento.</p>

<form action="//distribuidoradejoyas.cl/?fc=module&amp;module=iqitemailsubscriptionconf&amp;controller=subscription" method="post" class="elementor-newsletter-form">
    <div class="row"><div class="col-12"><div class="input-group "><input name="email" type="email" class="form-control elementor-newsletter-input" placeholder="Ingresa tu correo electrónico" aria-label="correo electronico" aria-describedby="button-addon2">
                <div class="input-group-append">
                    <button class="btn-newsletter" name="submitNewsletter" type="submit" id="button-addon2">Suscribirse</button></div></div>
            <input type="hidden" name="action" value="0">
            <div class="mt-2 text-muted"></div>
        </div></div></form></div>
<div class="col-12 col-lg-3  mt-4 cuerpo-newsletter">
<img src="/img/cms/paginas internas/blogs/bloques usuarias.png" width="200px">
<p>Más de 25K + Clientas reciben nuestros correos</p>
</div></div></section>
</div>

`.trim();

      document.getElementById("resultado").textContent = html;
    }

    function copiarHTML() {
      const resultado = document.getElementById("resultado").textContent;
      navigator.clipboard.writeText(resultado)
        .then(() => alert("Código copiado al portapapeles"))
        .catch(err => alert("Error al copiar: " + err));
    }

    window.onload = function () {
  llenarSelects();
  cargarNavegacionSelects(); // este es nuevo
};
// BLOG CREADOR FIN




// BLOG REDACTOR
function slugify(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function aplicarNegritaUltimaFraseConDosPuntos(texto) {
  const match = texto.match(/^(.*?:)(\s*)(.*)$/);
  if (match) {
    return `<b>${match[1]} </b>${match[3]}`;
  }
  return texto;
}

function convertirHTML() {
  const input = document.getElementById("inputTexto").value.trim();
  const lineas = input.split(/\n/);
  let html = '<section class="blog-container">\n';
  let contenido = '';
  let secciones = [];
  let bloqueIndice = '';
  let buffer = [];
  let enLista = false;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    if (enLista) {
      contenido += '<ul class="texto-blog">\n';
      buffer.forEach(line => {
        const limpio = line.replace(/^\s*-?\s*/, '- ');
        contenido += `<li>${aplicarNegritaUltimaFraseConDosPuntos(limpio)}</li>\n`;
      });
      contenido += '</ul>\n';
    } else {
      buffer.forEach(line => {
        contenido += `<p class="texto-blog">${aplicarNegritaUltimaFraseConDosPuntos(line)}</p>\n`;
      });
    }
    buffer = [];
    enLista = false;
  };

  lineas.forEach(linea => {
    linea = linea.trim();
    if (!linea) {
      flushBuffer();
      return;
    }

    const h2Match = linea.match(/^(\d+)\.\s+(.*)/);
const h3Match = linea.match(/^(\d+\.\d+)\s+(.*)/);

if (h3Match) {
  flushBuffer();
  const id = slugify(h3Match[2]);
  contenido += `<h3 id="${id}" class="blog-h3">${h3Match[1]} ${h3Match[2]}</h3>\n`;
  return;
}

if (h2Match) {
  flushBuffer();
  const id = slugify(h2Match[2]);
  const tituloCompleto = `${h2Match[1]}. ${h2Match[2]}`;
  secciones.push({ id, titulo: tituloCompleto });
  contenido += `<h2 id="${id}" class="blog-h2"><span class="blog-h2">${h2Match[1]}. </span>${h2Match[2]}</h2>\n`;
  return;
}


    if (/¿Qué joyas usar\?|Consejos de estilo/i.test(linea)) {
      flushBuffer();
      contenido += `<p class="texto-blog"><strong>${linea}</strong></p>\n`;
      return;
    }

    if (/^-\s*[^\s]/.test(linea)) {
      if (!enLista) flushBuffer();
      enLista = true;
      buffer.push(linea);
    } else {
      flushBuffer();
      buffer.push(linea);
    }
  });

  flushBuffer();

  if (secciones.length > 0) {
    bloqueIndice += '<section class="indice">\n<h2 class="blog-h3">Índice de Contenidos</h2>\n<ul class="texto-blog">\n';
    secciones.forEach(sec => {
      bloqueIndice += `<li><a href="#${sec.id}">${sec.titulo}</a></li>\n`;
    });
    bloqueIndice += '</ul>\n</section>\n';
  }

  const contenidoPartido = contenido.split('</p>\n');
  if (contenidoPartido.length >= 2) {
    contenido = contenidoPartido.slice(0, 2).join('</p>\n') + '</p>\n' + bloqueIndice + contenidoPartido.slice(2).join('</p>\n');
  }

  html += contenido + '</section>';
  document.getElementById("resultadoHTML").textContent = html;
}

function copiarResultado() {
  const resultado = document.getElementById("resultadoHTML").textContent;
  navigator.clipboard.writeText(resultado)
    .then(() => alert("✅ HTML copiado al portapapeles"))
    .catch(err => alert("❌ Error al copiar: " + err));
}
// BLOG REDACTOR FIN
//ingreso de blogs a la base de datos


let datosTabla = [];

// Modal Agregar
function abrirModalAgregarDato() {
  document.getElementById('modalAgregarDato').style.display = 'flex';
}

function cerrarModalAgregarDato() {
  document.getElementById('modalAgregarDato').style.display = 'none';
}

function limpiarFormulario() {
  document.getElementById('nuevoId').value = '';
  document.getElementById('nuevoNombre').value = '';
  document.getElementById('nuevoEstado').value = '';
  document.getElementById('nuevoBlog').value = '';
  document.getElementById('nuevoMeta').value = '';
  document.getElementById('nuevaFecha').value = '';
  document.getElementById('nuevaCategoria').value = '';
}

async function agregarNuevoDato() {
  const id = document.getElementById('nuevoId')?.value.trim();
  const nombre = document.getElementById('nuevoNombre')?.value.trim();
  const estado = document.getElementById('nuevoEstado')?.value.trim();
  const blog = document.getElementById('nuevoBlog')?.value.trim();
  const meta = document.getElementById('nuevoMeta')?.value.trim();
  const fecha = document.getElementById('nuevaFecha')?.value.trim();
  const categoria = document.getElementById('nuevaCategoria')?.value.trim();

  if (!id || !nombre || !estado || !blog || !meta || !fecha || !categoria) {
    alert('⚠️ Completa todos los campos antes de guardar.');
    console.warn('Campos incompletos:', {id, nombre, estado, blog, meta, fecha, categoria});
    return;
  }

  const nuevoDato = { 
    id, nombre, estado, blog, meta, fecha, categoria,
    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await firebase.firestore().collection('blogs').doc(id).set(nuevoDato);
    datosTabla.push(nuevoDato);
    renderizarTabla();
    cerrarModalAgregarDato();
    limpiarFormulario();
    console.log('✅ Blog guardado:', nuevoDato);
  } catch (error) {
    console.error('❌ Error al guardar en Firestore:', error);
    alert('Error al guardar en Firestore.');
  }
}




// Renderizar tabla
function renderizarTabla() {
  const tbody = document.querySelector('#tablaDatos tbody');
  tbody.innerHTML = '';

  datosTabla.forEach((dato, index) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td class="celda-id">${dato.id || ''}</td>
      <td class="celda-nombre" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dato.nombre || ''}</td>
      <td class="celda-estado">${dato.estado || ''}</td>
      <td class="celda-blog" style="max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dato.blog || ''}</td>
      <td class="celda-meta" style="max-width: 50px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dato.meta || ''}</td>
      <td class="celda-fecha">${dato.fecha || ''}</td>
      <td class="celda-categoria">${dato.categoria || ''}</td>
      <td class="celda-indicadores">
      <div class="alinear">
        <button class="btn p-0 mx-1" onclick="editarFila(${index})">✏️</button>
<button class="btn btn-sm p-0" onclick="confirmarEliminarFila(this)">🗑️</button>
</div>
      </td>
    `;
    tbody.appendChild(fila);
  });
  
}



// Modal Editar
function editarFila(index) {
  const dato = datosTabla[index];

  const modal = document.createElement('div');
  modal.id = 'modalEditarDato';
  modal.className = 'modal-editar-blog'; 
  modal.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background:rgba(0,0,0,0.6); z-index:9999;
  `;

  modal.innerHTML = `
    <div class="contenido-modal" style="background:white; padding:4rem; border-radius:16px; width:90%; max-width:60%; position:relative; margin:auto;">
      <button class="btn-close position-absolute end-0 top-0 m-4" onclick="this.closest('.modal-editar-blog').remove()"></button>
      <h5 class="mb-4">✏️ Editar Blog</h5>
      <input type="hidden" id="editIndex" value="${index}">

      <div class="row">
      <div class="col-lg-6 col-12">
        <h6 class="mt-3">ID de Blog</h6>
      <input type="text" id="editId" class="form-control mb-2" value="${dato.id}" readonly>
      <h6 class="mt-3">Nombre de Blog</h6>
      <input type="text" id="editNombre" class="form-control mb-2" value="${dato.nombre}">
      <h6 class="mt-3">Estado de Blog</h6>
      <select id="editEstado" class="form-control mb-2">
        <option ${dato.estado === 'transcrito' ? 'selected' : ''}>transcrito</option>
        <option ${dato.estado === 'pendiente' ? 'selected' : ''}>pendiente</option>
        <option ${dato.estado === 'reescribir' ? 'selected' : ''}>reescribir</option>
      </select>

      <h6 class="mt-3">Fecha</h6>
      <input type="date" id="editFecha" class="form-control mb-2" value="${dato.fecha}">
      <h6 class="mt-3">Categoría</h6>
      <select id="editCategoria" class="form-control mb-2">
        <option ${dato.categoria === 'Tips' ? 'selected' : ''}>Tips</option>
        <option ${dato.categoria === 'Emprendimiento' ? 'selected' : ''}>Emprendimiento</option>
        <option ${dato.categoria === 'Sabías que?' ? 'selected' : ''}>Sabías que?</option>
        <option ${dato.categoria === 'Beneficios' ? 'selected' : ''}>Beneficios</option>
        <option ${dato.categoria === 'Tendencias' ? 'selected' : ''}>Tendencias</option>
        <option ${dato.categoria === 'Cuidado y Mantenimiento' ? 'selected' : ''}>Cuidado y Mantenimiento</option>
        <option ${dato.categoria === 'Sustentable' ? 'selected' : ''}>Sustentable</option>
        <option ${dato.categoria === 'Innovación' ? 'selected' : ''}>Innovación</option>
      </select>
        </div>
      <div class="col-lg-6 col-12">
      <h6 class="mt-3">Cuerpo de Blog</h6>
      <textarea id="editBlog" class="form-control mb-2">${dato.blog}</textarea>
      <h6 class="mt-3">Meta descripción</h6>
      <textarea id="editMeta" class="form-control mb-2">${dato.meta}</textarea>
        </div> 
      </div>


      

      <button class="btn btn-primary w-100 mt-4" onclick="guardarEdicionFila()">Guardar cambios</button>
    </div>
  `;

  document.body.appendChild(modal);
}

function cerrarModalEditarDato() {
  const modalEditar = document.getElementById('modalEditarDato');
  if (modalEditar) {
    modalEditar.remove();
  }
}

async function guardarEdicionFila() {
  const modal = document.querySelector('.modal-editar-blog');

  const index = modal.querySelector('#editIndex')?.value;
  const id = modal.querySelector('#editId')?.value;
  const nombre = modal.querySelector('#editNombre')?.value.trim();
  const estado = modal.querySelector('#editEstado')?.value;
  const blog = modal.querySelector('#editBlog')?.value.trim();
  const meta = modal.querySelector('#editMeta')?.value.trim();
  const fecha = modal.querySelector('#editFecha')?.value;
  const categoria = modal.querySelector('#editCategoria')?.value;

  console.log({ id, nombre, estado, blog, meta, fecha, categoria }); // Para verificar en consola

  if (!id || !nombre || !estado || !blog || !meta || !fecha || !categoria) {
    alert('⚠️ Completa todos los campos antes de guardar.');
    return;
  }

  try {
    await firebase.firestore().collection('blogs').doc(id).update({
      nombre,
      estado,
      blog,
      meta,
      fecha,
      categoria
    });

    datosTabla[index] = { id, nombre, estado, blog, meta, fecha, categoria };
    renderizarTabla();
    modal.remove();
    console.log('✅ Blog actualizado correctamente:', id);
  } catch (error) {
    console.error('❌ Error al actualizar en Firestore:', error);
    alert('Error al actualizar.');
  }
}


// Modal Eliminar
let filaAEliminar = null;

// Abre modal de eliminar
function confirmarEliminarFila(boton) {
  filaAEliminar = boton.closest('tr');

  const modal = document.getElementById('modalConfirmarEliminar');
  modal.style.display = 'flex'; // Mostrar modal
}

// Confirmar eliminación
function eliminarFilaConfirmado() {
  if (filaAEliminar) {
    const idFila = filaAEliminar.querySelector('.celda-id')?.textContent;
    
    // Eliminar también de Firestore
    firebase.firestore().collection('blogs').doc(idFila).delete()
      .then(() => {
        filaAEliminar.remove();  // Elimina la fila de la tabla
        cerrarModalEliminar();   // Cierra el modal
        showIosModal('✅ Eliminado', 'El blog fue eliminado exitosamente.');
      })
      .catch(error => {
        console.error('❌ Error eliminando en Firestore:', error);
        showIosModal('❌ Error', 'No se pudo eliminar. Revisa la consola.');
      });
  }
}

// Cierra modal eliminar
function cerrarModalEliminar() {
  document.getElementById('modalConfirmarEliminar').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {

  // Activar DataTables cuando los datos estén listos
  setTimeout(() => {
    $('#tablaDatos').DataTable({
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
      },
      order: [[4, 'desc']], // Ordenar por fecha por defecto (columna 5)
      pageLength: 10, // Mostrar 10 resultados por página
      lengthMenu: [5, 10, 25, 50, 100],
      dom: 'lrtip',
    });
  }, 1500); // Un pequeño delay para asegurar que ya cargaron los datos
});

// Filtro de búsqueda en vivo
function filtrarTabla() {
  const texto = document.getElementById('filtroTexto').value.toLowerCase();
  const filas = document.querySelectorAll('#tablaDatos tbody tr');

  filas.forEach(fila => {
    const contenidoFila = fila.textContent.toLowerCase();
    fila.style.display = contenidoFila.includes(texto) ? '' : 'none';
  });
}

// Cargar datos al iniciar
async function cargarDatosDesdeFirestore() {
  const tbody = document.querySelector('#tablaDatos tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">🔄 Cargando datos...</td></tr>';

  try {
    const snapshot = await firebase.firestore().collection('blogs').orderBy('fecha', 'desc').get();
    datosTabla = snapshot.docs.map(doc => doc.data());
    renderizarTabla();
  } catch (error) {
    console.error('❌ Error al cargar:', error);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar.</td></tr>';
  }
}

//fin ingreso de blogss


//scripts generales de modal Cerrar cualquier modal al presionar ESC
// 🚀 Cerrar modales al presionar ESCAPE, de forma segura
window.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    // Cerrar modal Agregar
    const modalAgregar = document.getElementById('modalAgregarDato');
    if (modalAgregar && modalAgregar.style.display === 'flex') {
      cerrarModalAgregarDato();
    }

    // Cerrar modal Confirmar Eliminar
    const modalEliminar = document.getElementById('modalConfirmarEliminar');
    if (modalEliminar && modalEliminar.style.display === 'flex') {
      cerrarModalEliminar();
    }
    // Cerrar modal de editar
    const modalEditar = document.getElementById('modalEditarDato');
    if (modalEditar) {
      cerrarModalEditarDato();
    }

    // Cerrar iOS Modal de mensajes
    const iosModal = document.getElementById('iosModal');
    if (iosModal && iosModal.style.display === 'flex') {
      closeIosModal();
    }
  }
});

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    console.log("✅ Usuario autenticado:", user.email);
    cargarDatosDesdeFirestore(); // ✅ Solo aquí cargas los datos
  } else {
    console.warn("⛔ No hay usuario autenticado.");
    // Si quieres, puedes redirigir al login:
    // window.location.href = "login.html";
  }
});

noteGrid = document.getElementById('noteGrid');
if (noteGrid) {
  loadNotes();
}