// editor.js

document.addEventListener("DOMContentLoaded", () => {
  // --- Cambiar de tabs ---
  window.showTab = function (tab) {
    const tabs = document.querySelectorAll(".tab-section");
    const buttons = document.querySelectorAll(".tab-btn");

    tabs.forEach((el) => el.classList.add("d-none"));
    buttons.forEach((btn) => btn.classList.remove("active"));

    document.getElementById(tab).classList.remove("d-none");
    document.getElementById("btn" + capitalize(tab)).classList.add("active");
  };

  // --- Configurar bloques arrastrables ---
  const bloques = document.querySelectorAll(".bloque-draggable");
  bloques.forEach((bloque) => {
    bloque.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", bloque.dataset.tipo);
    });
  });
});

// Permitir soltar en el área de construcción
function permitirSoltar(event) {
  event.preventDefault();
}

function soltarBloque(event) {
  event.preventDefault();
  const tipo = event.dataTransfer.getData("text/plain");
  const canvas = document.getElementById("canvas");

  let nuevo = document.createElement("div");

  if (tipo === "texto") {
    nuevo.innerHTML = "<p>Este es un bloque de texto.</p>";
    nuevo.style.padding = "1rem";
    nuevo.style.border = "1px dashed #ccc";
  }

  if (tipo === "seccion") {
    nuevo.innerHTML = "<div style='background: #f4f4f4; padding: 2rem;'>Sección nueva</div>";
    nuevo.style.margin = "1rem 0";
  }

  nuevo.style.marginBottom = "1rem";
  canvas.appendChild(nuevo);
}

// Utilidad para capitalizar primera letra
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
