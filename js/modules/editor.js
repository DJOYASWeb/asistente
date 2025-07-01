// editor.js

document.addEventListener("DOMContentLoaded", () => {
  // --- Tabs (constructor / recursos) ---
  window.showTab = function (tab) {
    const tabs = document.querySelectorAll(".tab-section");
    const buttons = document.querySelectorAll(".tab-btn");

    tabs.forEach((el) => el.classList.add("d-none"));
    buttons.forEach((btn) => btn.classList.remove("active"));

    document.getElementById(tab).classList.remove("d-none");
    document.getElementById("btn" + capitalize(tab)).classList.add("active");
  };

  // --- Drag para bloques básicos ---
  const bloques = document.querySelectorAll(".bloque-draggable");
  bloques.forEach((bloque) => {
    bloque.addEventListener("dragstart", (e) => {
      const tipo = bloque.dataset.tipo;
      const html = bloque.dataset.html;
      if (html) {
        e.dataTransfer.setData("text/html", html);
      } else {
        e.dataTransfer.setData("text/plain", tipo);
      }
    });
  });

  // --- Cargar bloques personalizados desde Firebase ---
  cargarBloquesGuardados();
});

// Permitir soltar en el área de construcción
function permitirSoltar(event) {
  event.preventDefault();
}

function soltarBloque(event) {
  event.preventDefault();
  const canvas = document.getElementById("canvas");

  const html = event.dataTransfer.getData("text/html");
  const tipo = event.dataTransfer.getData("text/plain");

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

// Guardar bloque en Firebase
function guardarBloquePersonalizado(event) {
  event.preventDefault();

  const nombre = document.getElementById("nombreBloque").value.trim();
  const contenido = document.getElementById("contenidoBloque").value.trim();

  if (!nombre || !contenido) return;

  db.collection("bloquesPersonalizados")
    .add({ nombre, contenido })
    .then(() => {
      document.getElementById("bloqueForm").reset();
      cargarBloquesGuardados();
      alert("Bloque guardado en Firebase.");
    })
    .catch((error) => {
      console.error("Error al guardar el bloque:", error);
      alert("Ocurrió un error al guardar.");
    });
}

// Cargar bloques desde Firebase
function cargarBloquesGuardados() {
  const contenedor = document.getElementById("bloquesGuardados");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  db.collection("bloquesPersonalizados")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const bloque = doc.data();

        const col = document.createElement("div");
        col.className = "col";

        col.innerHTML = `
          <div class="card h-100 d-flex flex-row align-items-center p-2">
            <img src="https://via.placeholder.com/60x60.png?text=📦" class="img-thumbnail me-3" style="width:60px; height:60px; object-fit:cover;" alt="Bloque">
            <div class="d-flex flex-column justify-content-center">
              <h6 class="mb-0">${bloque.nombre}</h6>
            </div>
          </div>
        `;

        contenedor.appendChild(col);
      });
    })
    .catch((error) => {
      console.error("Error al cargar bloques:", error);
    });
}


// Agregar bloque a la barra superior del constructor
function agregarABarraDesdeFirebase(html, nombre) {
  const barra = document.querySelector(".bloques-barra");
  const nuevo = document.createElement("div");

  nuevo.className = "bloque-draggable";
  nuevo.setAttribute("draggable", "true");
  nuevo.textContent = `🧩 ${nombre}`;
  nuevo.dataset.html = html;

  nuevo.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/html", html);
  });

  barra.appendChild(nuevo);
}

// Capitalizar
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
