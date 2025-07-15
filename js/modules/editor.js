// ===============================================
// 📄 editor.js: Constructor Visual Interactivo con inserciones
// ===============================================

let elementoSeleccionado = null;

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

  const html = e.dataTransfer.getData("text/html").trim();
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const bloqueNuevo = temp.firstElementChild;

  if (!bloqueNuevo) {
    console.error("Bloque inválido.");
    return;
  }

  const destino = elementoSeleccionado || vistaPrevia; // por defecto en vista previa si nada está seleccionado

  const destinoTag = destino.tagName.toLowerCase();
  const bloqueTag = bloqueNuevo.tagName.toLowerCase();

  // Reglas:
  const contenedoresProhibenSection = ["div", "article", "figure", "figcaption"];
  const noAceptanContenedores = [
    "h1","h2","h3","h4","h5","h6","p","button","a","img","video","audio","blockquote","span","label","input","textarea","select","option"
  ];

  // Regla 1: Si destino es contenedor principal y bloque nuevo es section
  if (contenedoresProhibenSection.includes(destinoTag) && bloqueTag === "section") {
    alert(`🚫 No puedes insertar un <section> dentro de un <${destinoTag}>`);
    return;
  }

  // Regla 2: Si destino no es ni <section> ni un contenedor y se intenta poner un contenedor
  if (!["section", "div", "article", "figure", "figcaption"].includes(destinoTag) &&
      ["section", "div", "article", "figure", "figcaption"].includes(bloqueTag)) {
    alert(`🚫 No puedes insertar un <${bloqueTag}> dentro de un <${destinoTag}>`);
    return;
  }

  // Inserta limpio
  destino.innerHTML = ""; // limpia el contenido
  destino.appendChild(bloqueNuevo);

  // Actualiza el código fuente
  document.getElementById("htmlInput").value = vistaPrevia.innerHTML;
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


function crearCajaSeccion(nombre, html) {
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();

  const elemento = temp.firstElementChild;

  if (!elemento) {
    console.error("El HTML guardado para la sección está vacío o mal formado.");
    return document.createTextNode(`❌ Error: ${nombre}`);
  }

  // detecta el tipo: SECTION / ROW / COL
  const tipo = elemento.tagName.toUpperCase();
  let label = tipo;

  if (elemento.classList.contains("row")) label = "ROW";
  if (elemento.classList.contains("col")) label = "COL";

  // añade el estilo visual solo para la previsualización
  elemento.style.border = "1px dashed #007bff";
  elemento.style.position = "relative";
  elemento.style.padding = "1rem";
  elemento.style.minHeight = "50px";

  // etiqueta flotante
  const etiqueta = document.createElement("span");
  etiqueta.textContent = label;
  etiqueta.style.position = "absolute";
  etiqueta.style.top = "0";
  etiqueta.style.left = "50%";
  etiqueta.style.transform = "translateX(-50%)";
  etiqueta.style.background = "#fff";
  etiqueta.style.fontSize = "12px";
  etiqueta.style.padding = "0 4px";
  etiqueta.style.zIndex = "10";

  elemento.appendChild(etiqueta);

  // permite selección visual
  elemento.addEventListener("click", (e) => {
    e.stopPropagation();
    if (elementoSeleccionado) {
      elementoSeleccionado.style.outline = "";
    }
    elementoSeleccionado = elemento;
    elementoSeleccionado.style.outline = "2px dashed red";
  });

  return elemento;
}



//upd v3.6.4