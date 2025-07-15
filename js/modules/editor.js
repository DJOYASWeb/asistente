// ===============================================
// 📄 editor.js: Constructor Visual Mejorado
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
  inicializarConstructor();
  inicializarSecciones();
});

let elementoSeleccionado = null;

function inicializarConstructor() {
  const textarea = document.getElementById("htmlInput");
  const vistaPrevia = document.getElementById("vistaPrevia");
  const dragBloques = document.getElementById("dragBloques");

  const secciones = obtenerSecciones();

  // Renderiza en vivo mientras escribes
  textarea.addEventListener("input", () => {
    vistaPrevia.innerHTML = textarea.value;
  });

  // Renderiza drag & drop
  if (dragBloques) {
    dragBloques.innerHTML = "";
    secciones.forEach((seccion, i) => {
      const div = document.createElement("div");
      div.className = "bg-primary text-white p-2 mb-1 rounded";
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
      const bloque = crearBloque(seccion.html);

      if (elementoSeleccionado) {
        elementoSeleccionado.innerHTML = "";
        elementoSeleccionado.appendChild(bloque);
      } else {
        vistaPrevia.appendChild(bloque);
      }

      limpiarSeleccion();
      actualizarTextarea();
    });
  }

  // Seleccionar elemento en vista previa
  vistaPrevia.addEventListener("click", (e) => {
    e.stopPropagation();
    limpiarSeleccion();
    elementoSeleccionado = e.target;
    elementoSeleccionado.classList.add("activo");
  });
}

function crearBloque(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();

  const elemento = temp.firstElementChild;

  elemento.addEventListener("click", (e) => {
    e.stopPropagation();
    limpiarSeleccion();
    elementoSeleccionado = elemento;
    elementoSeleccionado.classList.add("activo");
  });

  return elemento;
}

function limpiarSeleccion() {
  const anteriores = document.querySelectorAll("#vistaPrevia .activo");
  anteriores.forEach(el => el.classList.remove("activo"));
  elementoSeleccionado = null;
}

function actualizarTextarea() {
  const textarea = document.getElementById("htmlInput");
  const vistaPrevia = document.getElementById("vistaPrevia").cloneNode(true);

  // Quitamos clases y outlines temporales antes de exportar
  vistaPrevia.querySelectorAll(".activo").forEach(el => {
    el.classList.remove("activo");
    el.style.outline = "";
  });

  textarea.value = vistaPrevia.innerHTML.trim();
}

// ====================
// 📦 Secciones / Bloques
// ====================

function inicializarSecciones() {
  const btnGuardarBloque = document.getElementById("guardarBloqueBtn");
  const listaBloques = document.getElementById("listaBloques");

  renderizarSecciones();

  btnGuardarBloque?.addEventListener("click", () => {
    const nombre = document.getElementById("nombreBloque").value.trim();
    const html = document.getElementById("contenidoBloque").value.trim();
    if (!nombre || !html) {
      alert("Completa ambos campos.");
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


//upd v3.4