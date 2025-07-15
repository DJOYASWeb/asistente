// ===============================================
// 📄 editor.js: Constructor Visual Interactivo con inserciones
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
  inicializarConstructor();
  inicializarSecciones();
});

function inicializarConstructor() {
  const vistaPrevia = document.getElementById("vistaPrevia");
  const dragBloques = document.getElementById("dragBloques");

  const secciones = obtenerSecciones();

  // Renderiza bloques arrastrables
  dragBloques.innerHTML = "";
  secciones.forEach((seccion, i) => {
    const div = document.createElement("div");
    div.className = "bg-primary text-white p-2 rounded mb-1";
    div.draggable = true;
    div.textContent = seccion.nombre;
    div.dataset.index = i;

    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/html", seccion.html);
    });

    dragBloques.appendChild(div);
  });

  // Vista previa acepta drop
  vistaPrevia.addEventListener("dragover", (e) => {
    e.preventDefault();
    const target = getBlockTarget(e.target);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    target.classList.remove("insercion-arriba", "insercion-dentro", "insercion-abajo");

    if (offsetY < rect.height / 3) {
      target.classList.add("insercion-arriba");
    } else if (offsetY > (2 * rect.height) / 3) {
      target.classList.add("insercion-abajo");
    } else {
      target.classList.add("insercion-dentro");
    }
  });

  vistaPrevia.addEventListener("dragleave", (e) => {
    const target = getBlockTarget(e.target);
    if (target) {
      target.classList.remove("insercion-arriba", "insercion-dentro", "insercion-abajo");
    }
  });

  vistaPrevia.addEventListener("drop", (e) => {
    e.preventDefault();
    const html = e.dataTransfer.getData("text/html");
    const newElement = crearElementoDesdeHTML(html);

    const target = getBlockTarget(e.target);
    if (!target) {
      vistaPrevia.appendChild(newElement);
      limpiarIndicadores();
      return;
    }

    if (target.classList.contains("insercion-arriba")) {
      target.before(newElement);
    } else if (target.classList.contains("insercion-abajo")) {
      target.after(newElement);
    } else {
      target.appendChild(newElement);
    }

    limpiarIndicadores();
  });
}

function getBlockTarget(element) {
  while (element && element !== document && element !== document.body) {
    if (element.parentElement?.id === "vistaPrevia") return element;
    element = element.parentElement;
  }
  return null;
}

function crearElementoDesdeHTML(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();
  return temp.firstElementChild;
}

function limpiarIndicadores() {
  document.querySelectorAll("#vistaPrevia > *").forEach(el => {
    el.classList.remove("insercion-arriba", "insercion-dentro", "insercion-abajo");
  });
}

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
    document.getElementById("nombreBloque").value = "";
    document.getElementById("contenidoBloque").value = "";
    renderizarSecciones();
  });

  function renderizarSecciones() {
    listaBloques.innerHTML = "";
    const secciones = obtenerSecciones();

    secciones.forEach((bloque, i) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.draggable = true;

      li.innerHTML = `
        <span>${bloque.nombre}</span>
        <div>
          <button class="btn btn-sm btn-warning" onclick="editarBloque(${i})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarBloque(${i})">🗑️</button>
        </div>
      `;

      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/html", bloque.html);
      });

      listaBloques.appendChild(li);
    });
  }
}

function obtenerSecciones() {
  return JSON.parse(localStorage.getItem("secciones") || "[]");
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


//upd v3.5