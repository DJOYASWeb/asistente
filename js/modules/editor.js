document.addEventListener("DOMContentLoaded", () => {
  inicializarConstructor();
  inicializarClases();
  inicializarSecciones();
});

let contenedorActivo = null;

// ====================
// 🖋️ Constructor Visual
// ====================

function inicializarConstructor() {
  const textarea = document.getElementById("htmlInput");
  const vistaPrevia = document.getElementById("vistaPrevia");
  const selectorBloques = document.getElementById("selectorBloques");
  const selectorClases = document.getElementById("selectorClases");
  const dragBloques = document.getElementById("dragBloques");

  const secciones = obtenerSecciones();

  // Render en vivo
  textarea.addEventListener("input", () => {
    vistaPrevia.innerHTML = textarea.value;
  });

  selectorBloques.addEventListener("change", () => {
    const index = selectorBloques.value;
    if (index === "") return;
    const seccion = secciones[index];
    const elemento = crearElementoDesdeHTML(seccion.html);
    vistaPrevia.appendChild(elemento);
    actualizarTextarea();
  });

  // Renderiza bloques en #dragBloques
  dragBloques.innerHTML = "";
  secciones.forEach((seccion, i) => {
    const div = document.createElement("div");
    div.className = "bg-primary text-white p-2 rounded mb-2";
    div.textContent = seccion.nombre;
    div.draggable = true;

    div.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/html", seccion.html);
    });

    dragBloques.appendChild(div);
  });

  vistaPrevia.addEventListener("dragover", (e) => e.preventDefault());

  vistaPrevia.addEventListener("drop", (e) => {
    e.preventDefault();
    const html = e.dataTransfer.getData("text/html");
    const elemento = crearElementoDesdeHTML(html);

    if (contenedorActivo && contenedorActivo.tagName.toLowerCase() === "section") {
      contenedorActivo.appendChild(elemento);
    } else {
      vistaPrevia.appendChild(elemento);
    }

    actualizarTextarea();
  });

  // Selección visual
  vistaPrevia.addEventListener("click", (e) => {
    e.preventDefault();
    if (contenedorActivo) contenedorActivo.style.outline = "";

    const target = e.target.closest("section");
    if (target) {
      contenedorActivo = target;
      contenedorActivo.style.outline = "2px dashed blue";
    } else {
      contenedorActivo = null;
    }

    actualizarSelectorClases();
  });

}

function crearElementoDesdeHTML(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();

  const elemento = temp.firstElementChild;

  elemento?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (contenedorActivo) contenedorActivo.style.outline = "";
    contenedorActivo = elemento;
    contenedorActivo.style.outline = "2px dashed blue";
    actualizarSelectorClases();
  });

  return elemento;
}

function actualizarTextarea() {
  document.getElementById("htmlInput").value =
    document.getElementById("vistaPrevia").innerHTML;
}

// ====================
// 🎨 Clases Personalizadas
// ====================

function inicializarClases() {
  const btnGuardarClase = document.getElementById("guardarClaseBtn");
  const listaClases = document.getElementById("listaClases");

  renderizarClases();
  inyectarClasesCSS();

  btnGuardarClase?.addEventListener("click", () => {
    const nombre = document.getElementById("nombreClase").value.trim();
    const valores = document.getElementById("valoresClase").value.trim();
    if (!nombre || !valores) {
      alert("Completa ambos campos.");
      return;
    }

    const clases = obtenerClases();
    const existente = clases.find(c => c.nombre === nombre);
    if (existente) {
      existente.valores = valores;
    } else {
      clases.push({ nombre, valores });
    }

    localStorage.setItem("clases", JSON.stringify(clases));
    limpiarClaseForm();
    renderizarClases();
    inyectarClasesCSS();
  });

  function renderizarClases() {
    listaClases.innerHTML = "";
    const clases = obtenerClases();

    clases.forEach((clase, i) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <span>${clase.nombre}: ${clase.valores}</span>
        <div>
          <button class="btn btn-sm btn-warning" onclick="editarClase(${i})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarClase(${i})">🗑️</button>
        </div>
      `;
      listaClases.appendChild(li);
    });
  }
}

function obtenerClases() {
  return JSON.parse(localStorage.getItem("clases") || "[]");
}

function limpiarClaseForm() {
  document.getElementById("nombreClase").value = "";
  document.getElementById("valoresClase").value = "";
}

function editarClase(index) {
  const clases = obtenerClases();
  document.getElementById("nombreClase").value = clases[index].nombre;
  document.getElementById("valoresClase").value = clases[index].valores;
}

function eliminarClase(index) {
  const clases = obtenerClases();
  clases.splice(index, 1);
  localStorage.setItem("clases", JSON.stringify(clases));
  inicializarClases();
}

function inyectarClasesCSS() {
  let styleTag = document.getElementById("clasesPersonalizadasStyle");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "clasesPersonalizadasStyle";
    document.head.appendChild(styleTag);
  }

  const clases = obtenerClases();
  const css = clases.map(c => `.${c.nombre} { ${c.valores} }`).join("\n");
  styleTag.innerHTML = css;
}

function actualizarSelectorClases() {
  const selectorClases = document.getElementById("selectorClases");
  selectorClases.innerHTML = `<option value="">-- Selecciona una clase --</option>`;
  obtenerClases().forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    selectorClases.appendChild(opt);
  });
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
    inicializarConstructor(); // para refrescar los drag
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


//upd v3.2