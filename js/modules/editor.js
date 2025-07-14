// ===============================================
// 📄 editor.js: Constructor visual básico + Recursos
// ===============================================

// ====================
// 🖋️ Constructor Visual
// ====================

document.addEventListener("DOMContentLoaded", () => {
  const inputHtml = document.getElementById("inputHtml");
  const btnRenderizar = document.getElementById("btnRenderizar");
  const previsualizacion = document.getElementById("previsualizacion");

  btnRenderizar.addEventListener("click", () => {
    const html = inputHtml.value.trim();
    if (!html) {
      alert("Escribe algún código HTML para renderizar.");
      return;
    }
    previsualizacion.innerHTML = html;
  });

  // Cargar las clases personalizadas al iniciar
  cargarClases();
});

// ====================
// 🎨 Recursos: Clases Personalizadas
// ====================

// Guardar una clase personalizada
document.addEventListener("DOMContentLoaded", () => {
  const btnGuardarClase = document.getElementById("btnGuardarClase");
  if (!btnGuardarClase) return; // si no estamos en la pestaña Recursos

  btnGuardarClase.addEventListener("click", () => {
    const nombre = document.getElementById("nombreClase").value.trim();
    const valores = document.getElementById("valoresCSS").value.trim();

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

    localStorage.setItem("clasesPersonalizadas", JSON.stringify(clases));
    limpiarFormulario();
    renderizarClases();
    inyectarClasesCSS(); // opcional: aplicar en la página
  });
});

// Obtener todas las clases desde localStorage
function obtenerClases() {
  return JSON.parse(localStorage.getItem("clasesPersonalizadas") || "[]");
}

// Renderizar la tabla con las clases
function renderizarClases() {
  const tbody = document.getElementById("tablaClases");
  if (!tbody) return;

  tbody.innerHTML = "";

  const clases = obtenerClases();

  clases.forEach((clase, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${clase.nombre}</td>
      <td>${clase.valores}</td>
      <td>
        <button class="btn btn-sm btn-warning me-1" onclick="editarClase(${index})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarClase(${index})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Cargar y renderizar las clases al iniciar
function cargarClases() {
  renderizarClases();
  inyectarClasesCSS();
}

// Limpiar el formulario de clases
function limpiarFormulario() {
  document.getElementById("nombreClase").value = "";
  document.getElementById("valoresCSS").value = "";
}

// Editar una clase
function editarClase(index) {
  const clases = obtenerClases();
  const clase = clases[index];
  document.getElementById("nombreClase").value = clase.nombre;
  document.getElementById("valoresCSS").value = clase.valores;
}

// Eliminar una clase
function eliminarClase(index) {
  const clases = obtenerClases();
  if (!confirm(`¿Eliminar la clase "${clases[index].nombre}"?`)) return;

  clases.splice(index, 1);
  localStorage.setItem("clasesPersonalizadas", JSON.stringify(clases));
  renderizarClases();
  inyectarClasesCSS();
}

// ====================
// 🧩 Inyectar clases como <style>
// ====================

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

document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("html-editor");
  const btnRenderizar = document.getElementById("btn-renderizar");
  const modal = document.getElementById("modal-preview");
  const modalContenido = document.getElementById("modal-contenido");
  const btnCerrarModal = document.getElementById("btn-cerrar-modal");

  btnRenderizar.addEventListener("click", () => {
    const html = textarea.value.trim();
    if (!html) {
      alert("⚠️ Por favor ingresa contenido HTML.");
      return;
    }

    modalContenido.innerHTML = html;
    modal.style.display = "flex";
  });

  btnCerrarModal.addEventListener("click", () => {
    modal.style.display = "none";
    modalContenido.innerHTML = "";
  });
});



//upd v1.1