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
 <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/9.6.11/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.6.11/firebase-firestore-compat.js"></script>
  <script>
    // Tab ingresar
    const firebaseConfig = {
      apiKey: "AIzaSyD6xqVEHb5eGrFr4cEu6y-OHxcpXjvybv4",
      authDomain: "djoyas-asistente.firebaseapp.com",
      projectId: "djoyas-asistente",
      storageBucket: "djoyas-asistente.appspot.com",
      messagingSenderId: "990292345351",
      appId: "1:990292345351:web:72ae605299387fa31c20a2",
      measurementId: "G-9ZTSMFYFE1"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    function showTab(tab) {
      ['contenidos', 'recursos', 'ingreso'].forEach(t => {
        document.getElementById(t).classList.toggle('d-none', t !== tab);
        document.getElementById(`btn${capitalize(t)}`).classList.toggle('active', t === tab);
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
        document.getElementById('jsonOutput').textContent = JSON.stringify(nuevaEntrada, null, 2);
        document.getElementById('formInspira').reset();
        mostrarPopup();
      } catch (err) {
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
          <strong>Categoría:</strong> ${data.categoria || "-"}</small><br>
          <small><strong>Fecha:</strong> ${data.fecha || "-"} | 
          <strong>ID:</strong> ${data.id || "-"}</small>
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
        <strong>Temática:</strong> ${ent.tematica || "-"}<br>
        <strong>Categoría:</strong> ${ent.categoria || "-"}<br>   
        </div>
        <div class="col-lg-2 col-12">
        <button class="btn btn-sm btn-outline-primary mt-2" onclick="editarEntrada('${ent.id}')">✏️ Editar</button>  
        </div>

      </div>
      <div id="edit-${ent.id}" class="d-none">
        <input type="text" class="form-control mb-1" id="editTitulo-${ent.id}" value="${ent.titulo}">
        <textarea class="form-control mb-1" id="editDescripcion-${ent.id}">${ent.descripcion}</textarea>
        <input type="text" class="form-control mb-1" id="editImagen-${ent.id}" value="${ent.imagen}">
        <input type="text" class="form-control mb-1" id="editDuracion-${ent.id}" value="${ent.duracion}">
        <input type="text" class="form-control mb-1" id="editTematica-${ent.id}" value="${ent.tematica}">
        <input type="text" class="form-control mb-1" id="editCategoria-${ent.id}" value="${ent.categoria}">
        <input type="date" class="form-control mb-1" id="editFecha-${ent.id}" value="${ent.fecha || ""}">
        <input type="text" class="form-control mb-1" id="editLink-${ent.id}" value="${ent.link || ""}">
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
  data-autor="${data.autor || 'Autor desconocido'}" 
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
  data-autor="${data.autor || 'Autor desconocido'}" 
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
// INSPIRA FIN

// TAREAS INICIO
// TAREAS FIN

// BLOG INICIO
// BLOG FIN
