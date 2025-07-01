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

// Guardar un bloque personalizado en localStorage
function guardarBloquePersonalizado(event) {
  event.preventDefault();

  const nombre = document.getElementById("nombreBloque").value.trim();
  const contenido = document.getElementById("contenidoBloque").value.trim();

  if (!nombre || !contenido) return;

  const bloques = JSON.parse(localStorage.getItem("bloquesPersonalizados") || "[]");

  bloques.push({ nombre, contenido });
  localStorage.setItem("bloquesPersonalizados", JSON.stringify(bloques));

  document.getElementById("bloqueForm").reset();
  cargarBloquesGuardados();
  alert("Bloque guardado exitosamente.");
}

// Mostrar bloques guardados en el tab Recursos
function cargarBloquesGuardados() {
  const contenedor = document.getElementById("bloquesGuardados");
  contenedor.innerHTML = "";

  const bloques = JSON.parse(localStorage.getItem("bloquesPersonalizados") || "[]");

  bloques.forEach((bloque, index) => {
    const card = document.createElement("div");
    card.className = "col-md-6 mb-3";
    card.innerHTML = `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">${bloque.nombre}</h5>
          <pre class="card-text" style="white-space:pre-wrap; background:#f8f9fa; padding:0.5rem;">${bloque.contenido}</pre>
          <button class="btn btn-outline-primary btn-sm" onclick="agregarABarra('${index}')">Usar en constructor</button>
        </div>
      </div>
    `;
    contenedor.appendChild(card);
  });
}

// Agregar bloque personalizado a la barra del constructor
function agregarABarra(index) {
  const bloques = JSON.parse(localStorage.getItem("bloquesPersonalizados") || "[]");
  const bloque = bloques[index];

  const barra = document.querySelector(".bloques-barra");
  const nuevo = document.createElement("div");
  nuevo.className = "bloque-draggable";
  nuevo.setAttribute("draggable", "true");
  nuevo.dataset.tipo = `custom-${index}`;
  nuevo.textContent = `🧩 ${bloque.nombre}`;

  nuevo.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/html", bloque.contenido);
  });

  barra.appendChild(nuevo);
}

// Detectar si se soltó un bloque personalizado
function soltarBloque(event) {
  event.preventDefault();
  const html = event.dataTransfer.getData("text/html");
  const tipo = event.dataTransfer.getData("text/plain");
  const canvas = document.getElementById("canvas");

  const nuevo = document.createElement("div");

  if (html) {
    nuevo.innerHTML = html;
  } else if (tipo === "texto") {
    nuevo.innerHTML = "<p>Este es un bloque de texto.</p>";
    nuevo.style.padding = "1rem";
    nuevo.style.border = "1px dashed #ccc";
  } else if (tipo === "seccion") {
    nuevo.innerHTML = "<div style='background: #f4f4f4; padding: 2rem;'>Sección nueva</div>";
    nuevo.style.margin = "1rem 0";
  }

  nuevo.style.marginBottom = "1rem";
  canvas.appendChild(nuevo);
}

// Cargar bloques guardados al iniciar
document.addEventListener("DOMContentLoaded", () => {
  cargarBloquesGuardados();
});
