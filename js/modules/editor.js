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
  const nombreBloque = document.getElementById("nombreBloque");
  const contenidoBloque = document.getElementById("contenidoBloque");
  const guardarBloqueBtn = document.getElementById("guardarBloqueBtn");
  const listaBloques = document.getElementById("listaBloques");
  const selectorBloques = document.getElementById("selectorBloques");

  // Inicializar
  renderizarBloques();
  poblarSelectorConstructor();

  guardarBloqueBtn.addEventListener("click", () => {
    const nombre = nombreBloque.value.trim();
    const html = contenidoBloque.value.trim();

    if (!nombre || !html) {
      alert("Por favor completa ambos campos.");
      return;
    }

    const bloques = JSON.parse(localStorage.getItem("bloques")) || [];
    const existenteIndex = bloques.findIndex(b => b.nombre === nombre);

    if (existenteIndex >= 0) {
      bloques[existenteIndex].html = html;
    } else {
      bloques.push({ nombre, html });
    }

    localStorage.setItem("bloques", JSON.stringify(bloques));
    nombreBloque.value = "";
    contenidoBloque.value = "";
    renderizarBloques();
    poblarSelectorConstructor();
  });

  function renderizarBloques() {
    listaBloques.innerHTML = "";
    const bloques = JSON.parse(localStorage.getItem("bloques")) || [];
    bloques.forEach((bloque, i) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <span>${bloque.nombre}</span>
        <div>
          <button class="btn btn-sm btn-warning" onclick="editarBloque(${i})">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarBloque(${i})">🗑️ Eliminar</button>
        </div>
      `;
      listaBloques.appendChild(li);
    });
  }

  window.editarBloque = (index) => {
    const bloques = JSON.parse(localStorage.getItem("bloques")) || [];
    const bloque = bloques[index];
    nombreBloque.value = bloque.nombre;
    contenidoBloque.value = bloque.html;
  };

  window.eliminarBloque = (index) => {
    const bloques = JSON.parse(localStorage.getItem("bloques")) || [];
    if (!confirm(`¿Eliminar el bloque "${bloques[index].nombre}"?`)) return;
    bloques.splice(index, 1);
    localStorage.setItem("bloques", JSON.stringify(bloques));
    renderizarBloques();
    poblarSelectorConstructor();
  };

  function poblarSelectorConstructor() {
    if (!selectorBloques) return;
    selectorBloques.innerHTML = `<option value="">-- Selecciona un bloque --</option>`;
    const bloques = JSON.parse(localStorage.getItem("bloques")) || [];
    bloques.forEach((bloque, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = bloque.nombre;
      selectorBloques.appendChild(opt);
    });
  }

  if (selectorBloques) {
    selectorBloques.addEventListener("change", () => {
      const index = selectorBloques.value;
      if (index === "") return;
      const bloques = JSON.parse(localStorage.getItem("bloques")) || [];
      const bloque = bloques[index];
      const textarea = document.getElementById("htmlInput");
      const vistaPrevia = document.getElementById("vistaPrevia");
      textarea.value += `\n${bloque.html}`;
      vistaPrevia.innerHTML = textarea.value;
    });
  }
});


//upd v1.7