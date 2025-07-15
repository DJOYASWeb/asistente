// ===============================================
// 📄 editor.js: Constructor Visual Interactivo (con validación y canvas flexible)
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
  inicializarConstructor();
  inicializarSecciones();
});

let elementoSeleccionado = null;

// ====================
// 🖋️ Constructor Visual
// ====================

function inicializarConstructor() {
  const vistaPrevia = document.getElementById("vistaPrevia");
  const dragBloques = document.getElementById("dragBloques");

  const secciones = obtenerSecciones();

  // Renderiza drag & drop
  dragBloques.innerHTML = "";
  secciones.forEach((seccion, i) => {
    const div = document.createElement("div");
    div.className = "bg-primary text-white p-2 text-center";
    div.draggable = true;
    div.textContent = seccion.nombre;
    div.dataset.index = i;

    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", i);
    });

    dragBloques.appendChild(div);
  });

  vistaPrevia.addEventListener("dragover", (e) => e.preventDefault());

  vistaPrevia.addEventListener("drop", (e) => {
    e.preventDefault();
    const index = e.dataTransfer.getData("text/plain");
    const seccion = secciones[index];

    if (!puedeInsertarse(e.target, obtenerTagPrincipal(seccion.html))) {
      mostrarMensaje("No puedes insertar este bloque aquí.");
      return;
    }

    const caja = crearCajaSeccion(seccion.html);
    e.target.appendChild(caja);
  });

  // Seleccionar elemento
  vistaPrevia.addEventListener("click", (e) => {
    e.stopPropagation();
    if (elementoSeleccionado) {
      elementoSeleccionado.classList.remove("seleccionado");
    }
    elementoSeleccionado = e.target;
    elementoSeleccionado.classList.add("seleccionado");
  });
}

// ====================
// 📦 Secciones / Bloques
// ====================

function inicializarSecciones() {
  const btnGuardarBloque = document.getElementById("guardarBloqueBtn");
  const listaBloques = document.getElementById("listaBloques");

  renderizarSecciones();

  btnGuardarBloque.addEventListener("click", () => {
    const nombre = document.getElementById("nombreBloque").value.trim();
    const html = document.getElementById("contenidoBloque").value.trim();
    if (!nombre || !html) {
      mostrarMensaje("Completa ambos campos.");
      return;
    }

    const secciones = obtenerSecciones();
    const existente = secciones.findIndex(s => s.nombre === nombre);
    if (existente >= 0) {
      secciones[existente].html = html;
    } else {
      secciones.push({ nombre, html });
    }

    localStorage.setItem("secciones", JSON.stringify(secciones));
    limpiarBloqueForm();
    renderizarSecciones();
  });

  function renderizarSecciones() {
    listaBloques.innerHTML = "";
    const secciones = obtenerSecciones();

    secciones.forEach((bloque, i) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <span>${bloque.nombre}</span>
        <div>
          <button class="btn btn-sm btn-warning" onclick="editarBloque(${i})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarBloque(${i})">🗑️</button>
        </div>
      `;
      listaBloques.appendChild(li);
    });
  }
}

function obtenerSecciones() {
  return JSON.parse(localStorage.getItem("secciones") || "[]");
}

function limpiarBloqueForm() {
  document.getElementById("nombreBloque").value = "";
  document.getElementById("contenidoBloque").value = "";
}

function editarBloque(index) {
  const secciones = obtenerSecciones();
  document.getElementById("nombreBloque").value = secciones[index].nombre;
  document.getElementById("contenidoBloque").value = secciones[index].html;
}

function eliminarBloque(index) {
  const secciones = obtenerSecciones();
  secciones.splice(index, 1);
  localStorage.setItem("secciones", JSON.stringify(secciones));
  inicializarSecciones();
}

// ====================
// 🧩 Helpers
// ====================

// Devuelve el primer tag del bloque
function obtenerTagPrincipal(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();
  const el = temp.firstElementChild;
  return el ? el.tagName.toLowerCase() : "";
}

// Valida si el elemento puede insertarse en el destino
function puedeInsertarse(parent, tag) {
  if (parent.id === "vistaPrevia") return true; // el canvas permite todo

  const prohibidosComoPadres = ["div", "article", "figure", "figcaption"];
  const prohibidosComoHijos = ["section", "div", "article", "figure", "figcaption"];

  if (tag === "section" && prohibidosComoPadres.includes(parent.tagName.toLowerCase())) {
    return false;
  }

  if (prohibidosComoHijos.includes(tag) &&
      !["section"].includes(parent.tagName.toLowerCase())) {
    return false;
  }

  return true;
}

// Crea la caja visual con borde y etiqueta
function crearCajaSeccion(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();
  const elemento = temp.firstElementChild;

  if (!elemento) {
    mostrarMensaje("Error: HTML inválido.");
    return document.createTextNode("❌ Error");
  }

  elemento.classList.add("borde-visual");

  return elemento;
}

// Muestra un mensaje visual
function mostrarMensaje(msg) {
  alert(msg); // para ahora usamos alert. opcionalmente podemos hacer un toast.
}


//upd v3.6.5