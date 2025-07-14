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



//upd v1.5