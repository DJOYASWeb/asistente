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


document.addEventListener('DOMContentLoaded', () => {
  cargarBloques();

  document.getElementById('guardarBloqueBtn').addEventListener('click', () => {
    const nombre = document.getElementById('nombreBloque').value.trim();
    const contenido = document.getElementById('contenidoBloque').value.trim();
    if (!nombre || !contenido) {
      alert('Por favor completa ambos campos.');
      return;
    }

    const bloques = JSON.parse(localStorage.getItem('bloques')) || [];
    const existenteIndex = bloques.findIndex(b => b.nombre === nombre);

    if (existenteIndex >= 0) {
      bloques[existenteIndex].contenido = contenido;
    } else {
      bloques.push({ nombre, contenido });
    }

    localStorage.setItem('bloques', JSON.stringify(bloques));
    document.getElementById('nombreBloque').value = '';
    document.getElementById('contenidoBloque').value = '';
    cargarBloques();
  });
});

function cargarBloques() {
  const lista = document.getElementById('listaBloques');
  lista.innerHTML = '';
  const bloques = JSON.parse(localStorage.getItem('bloques')) || [];

  bloques.forEach((bloque, i) => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = `
      <span>${bloque.nombre}</span>
      <div class="acciones-bloque">
        <button class="btn btn-sm btn-success" onclick="insertarBloque(${i})">➕ Insertar</button>
        <button class="btn btn-sm btn-warning" onclick="editarBloque(${i})">✏️ Editar</button>
        <button class="btn btn-sm btn-danger" onclick="eliminarBloque(${i})">🗑️ Eliminar</button>
      </div>
    `;
    lista.appendChild(li);
  });
}

function insertarBloque(index) {
  const bloques = JSON.parse(localStorage.getItem('bloques')) || [];
  const bloque = bloques[index];
  document.getElementById('editorHTML').value = bloque.contenido;
}

function editarBloque(index) {
  const bloques = JSON.parse(localStorage.getItem('bloques')) || [];
  const bloque = bloques[index];
  document.getElementById('nombreBloque').value = bloque.nombre;
  document.getElementById('contenidoBloque').value = bloque.contenido;
}

function eliminarBloque(index) {
  const bloques = JSON.parse(localStorage.getItem('bloques')) || [];
  bloques.splice(index, 1);
  localStorage.setItem('bloques', JSON.stringify(bloques));
  cargarBloques();
}


document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("htmlInput");
  const vistaPrevia = document.getElementById("vistaPrevia");
  const selectorBloques = document.getElementById("selectorBloques");

  // Renderizar en vivo
  textarea.addEventListener("input", () => {
    vistaPrevia.innerHTML = textarea.value;
  });

  // Cargar bloques predefinidos
  const bloquesGuardados = JSON.parse(localStorage.getItem("bloquesPredefinidos")) || [];

  function poblarSelector() {
    selectorBloques.innerHTML = `<option value="">-- Selecciona un bloque --</option>`;
    bloquesGuardados.forEach((bloque, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = bloque.nombre;
      selectorBloques.appendChild(opt);
    });
  }

  poblarSelector();

  // Insertar bloque en el textarea
  selectorBloques.addEventListener("change", () => {
    const index = selectorBloques.value;
    if (index === "") return;
    const bloque = bloquesGuardados[index];
    if (bloque && bloque.html) {
      textarea.value += "\n" + bloque.html;
      vistaPrevia.innerHTML = textarea.value;
    }
  });
});



//upd v1.3