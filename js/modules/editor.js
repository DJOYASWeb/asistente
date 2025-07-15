// ====================
// 🖋️ Constructor Visual
// ====================

let contenedorActivo = null;

function inicializarConstructor() {
  const textarea = document.getElementById("htmlInput");
  const vistaPrevia = document.getElementById("vistaPrevia");
  const selectorBloques = document.getElementById("selectorBloques");
  const selectorClases = document.getElementById("selectorClases");

  const secciones = obtenerSecciones();

  // Renderiza en vivo mientras escribes
  textarea.addEventListener("input", () => {
    vistaPrevia.innerHTML = textarea.value;
  });

  // Poblar selector de secciones
  selectorBloques.innerHTML = `<option value="">-- Selecciona una sección --</option>`;
  secciones.forEach((seccion, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = seccion.nombre;
    selectorBloques.appendChild(opt);
  });

  selectorBloques.addEventListener("change", () => {
    const index = selectorBloques.value;
    if (index === "") return;
    const seccion = secciones[index];
    const elemento = crearElementoDesdeHTML(seccion.html);
    vistaPrevia.appendChild(elemento);
    actualizarTextarea();
  });

  // Renderiza lista draggable en Secciones
  const listaBloques = document.getElementById("listaBloques");
  listaBloques.querySelectorAll("li").forEach(li => {
    li.draggable = true;
    li.addEventListener("dragstart", (e) => {
      const index = [...listaBloques.children].indexOf(li);
      const seccion = obtenerSecciones()[index];
      e.dataTransfer.setData("text/html", seccion.html);
    });
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

  // Selección de contenedor al hacer click
  vistaPrevia.addEventListener("click", (e) => {
    e.preventDefault();
    if (contenedorActivo) {
      contenedorActivo.style.outline = "";
    }

    const target = e.target.closest("section");
    if (target) {
      contenedorActivo = target;
      contenedorActivo.style.outline = "2px dashed blue";
    } else {
      contenedorActivo = null;
    }

    actualizarSelectorClases();
  });

  selectorClases.addEventListener("change", (e) => {
    if (!contenedorActivo) {
      alert("Selecciona un elemento en la vista previa.");
      return;
    }
    const clase = e.target.value;
    if (clase) {
      contenedorActivo.classList.add(clase);
    }
    actualizarTextarea();
  });
}

function crearElementoDesdeHTML(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();

  const elemento = temp.firstElementChild;

  if (!elemento) {
    console.error("El HTML guardado para la sección está vacío o mal formado.");
    return document.createTextNode("❌ Error: bloque vacío");
  }

  // le añadimos la lógica para selección visual
  elemento.addEventListener("click", (e) => {
    e.stopPropagation();
    if (contenedorActivo) {
      contenedorActivo.style.outline = "";
    }
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



//upd v2.9