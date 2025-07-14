// ===============================================
// 📄 editor.js: Constructor visual básico
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("htmlInput");
  const vistaPrevia = document.getElementById("vistaPrevia");
  const selectorSecciones = document.getElementById("selectorBloques");

  // ====================
  // 🔷 Renderizado en vivo
  // ====================

  textarea.addEventListener("input", () => {
    vistaPrevia.innerHTML = textarea.value;
  });

  // ====================
  // 🔷 Secciones guardadas
  // ====================

  function cargarSecciones() {
    const secciones = JSON.parse(localStorage.getItem("seccionesPersonalizadas")) || [];
    selectorSecciones.innerHTML = `<option value="">-- Selecciona una sección --</option>`;
    secciones.forEach((seccion, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = seccion.nombre;
      selectorSecciones.appendChild(opt);
    });
  }

  selectorSecciones.addEventListener("change", () => {
    const index = selectorSecciones.value;
    if (index === "") return;
    const secciones = JSON.parse(localStorage.getItem("seccionesPersonalizadas")) || [];
    const seccion = secciones[index];
    if (seccion && seccion.html) {
      textarea.value += `\n${seccion.html}`;
      vistaPrevia.innerHTML = textarea.value;
    }
  });

  cargarSecciones();
  inyectarClasesCSS(); // para que las clases personalizadas ya funcionen
});

// ===============================================
// 🎨 Clases personalizadas
// ===============================================

function obtenerClases() {
  return JSON.parse(localStorage.getItem("clasesPersonalizadas") || "[]");
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

document.addEventListener("DOMContentLoaded", () => {
  const btnGuardarSeccion = document.getElementById("guardarSeccionBtn");
  const nombreSeccion = document.getElementById("nombreSeccion");
  const htmlSeccion = document.getElementById("htmlSeccion");
  const listaSecciones = document.getElementById("listaSecciones");

  if (!btnGuardarSeccion) return; // por si no estás en la pestaña

  // Al guardar
  btnGuardarSeccion.addEventListener("click", () => {
    const nombre = nombreSeccion.value.trim();
    const html = htmlSeccion.value.trim();

    if (!nombre || !html) {
      alert("Por favor completa ambos campos.");
      return;
    }

    const secciones = JSON.parse(localStorage.getItem("seccionesPersonalizadas")) || [];
    const existenteIndex = secciones.findIndex(s => s.nombre === nombre);

    if (existenteIndex >= 0) {
      secciones[existenteIndex].html = html;
    } else {
      secciones.push({ nombre, html });
    }

    localStorage.setItem("seccionesPersonalizadas", JSON.stringify(secciones));
    nombreSeccion.value = "";
    htmlSeccion.value = "";
    renderizarSecciones();
  });

  // Renderizar en lista
  function renderizarSecciones() {
    listaSecciones.innerHTML = "";
    const secciones = JSON.parse(localStorage.getItem("seccionesPersonalizadas")) || [];

    secciones.forEach((seccion, i) => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.innerHTML = `
        <span>${seccion.nombre}</span>
        <div class="acciones-seccion">
          <button class="btn btn-sm btn-warning" onclick="editarSeccion(${i})">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarSeccion(${i})">🗑️ Eliminar</button>
        </div>
      `;
      listaSecciones.appendChild(li);
    });
  }

  window.editarSeccion = (index) => {
    const secciones = JSON.parse(localStorage.getItem("seccionesPersonalizadas")) || [];
    const seccion = secciones[index];
    nombreSeccion.value = seccion.nombre;
    htmlSeccion.value = seccion.html;
  };

  window.eliminarSeccion = (index) => {
    const secciones = JSON.parse(localStorage.getItem("seccionesPersonalizadas")) || [];
    if (!confirm(`¿Eliminar la sección "${secciones[index].nombre}"?`)) return;

    secciones.splice(index, 1);
    localStorage.setItem("seccionesPersonalizadas", JSON.stringify(secciones));
    renderizarSecciones();
  };

  renderizarSecciones();
});


//upd v1.6