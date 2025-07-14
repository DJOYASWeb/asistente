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

document.addEventListener("DOMContentLoaded", () => {
  const nombreClase = document.getElementById("nombreClase");
  const valoresClase = document.getElementById("valoresClase");
  const guardarClaseBtn = document.getElementById("guardarClaseBtn");
  const listaClases = document.getElementById("listaClases");

  renderizarClases();
  inyectarClasesCSS();

  guardarClaseBtn.addEventListener("click", () => {
    const nombre = nombreClase.value.trim();
    const valores = valoresClase.value.trim();

    if (!nombre || !valores) {
      alert("Por favor completa ambos campos.");
      return;
    }

    const clases = JSON.parse(localStorage.getItem("clases")) || [];
    const indexExistente = clases.findIndex(c => c.nombre === nombre);

    if (indexExistente >= 0) {
      clases[indexExistente].valores = valores;
    } else {
      clases.push({ nombre, valores });
    }

    localStorage.setItem("clases", JSON.stringify(clases));
    nombreClase.value = "";
    valoresClase.value = "";
    renderizarClases();
    inyectarClasesCSS();
  });

  function renderizarClases() {
    listaClases.innerHTML = "";
    const clases = JSON.parse(localStorage.getItem("clases")) || [];

    clases.forEach((clase, i) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <span>${clase.nombre}: ${clase.valores}</span>
        <div>
          <button class="btn btn-sm btn-warning" onclick="editarClase(${i})">✏️ Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarClase(${i})">🗑️ Eliminar</button>
        </div>
      `;
      listaClases.appendChild(li);
    });
  }

  window.editarClase = (index) => {
    const clases = JSON.parse(localStorage.getItem("clases")) || [];
    const clase = clases[index];
    nombreClase.value = clase.nombre;
    valoresClase.value = clase.valores;
  };

  window.eliminarClase = (index) => {
    const clases = JSON.parse(localStorage.getItem("clases")) || [];
    if (!confirm(`¿Eliminar la clase "${clases[index].nombre}"?`)) return;
    clases.splice(index, 1);
    localStorage.setItem("clases", JSON.stringify(clases));
    renderizarClases();
    inyectarClasesCSS();
  };

  function inyectarClasesCSS() {
    let styleTag = document.getElementById("clasesPersonalizadasStyle");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "clasesPersonalizadasStyle";
      document.head.appendChild(styleTag);
    }

    const clases = JSON.parse(localStorage.getItem("clases")) || [];
    const css = clases.map(c => `.${c.nombre} { ${c.valores} }`).join("\n");
    styleTag.innerHTML = css;
  }
});


const dragBloques = document.getElementById("dragBloques");
dragBloques.innerHTML = "";
seccionesGuardadas.forEach((seccion, i) => {
  const div = document.createElement("div");
  div.className = "badge bg-primary text-white p-2";
  div.draggable = true;
  div.textContent = seccion.nombre;
  div.dataset.index = i;

  div.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", i);
  });

  dragBloques.appendChild(div);
});

vistaPrevia.addEventListener("dragover", (e) => {
  e.preventDefault();
});

vistaPrevia.addEventListener("drop", (e) => {
  e.preventDefault();
  const index = e.dataTransfer.getData("text/plain");
  const seccion = seccionesGuardadas[index];
  vistaPrevia.innerHTML += seccion.html;
});



//upd v1.9