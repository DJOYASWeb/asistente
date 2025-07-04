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
   cargarBloquesEnBarra(); 
});

// Permitir soltar en el área de construcción
function permitirSoltar(event) {
  event.preventDefault();
}

function soltarBloque(event) {
  event.preventDefault();

  const html = event.dataTransfer.getData("text/html");
  const tipo = event.dataTransfer.getData("text/plain");

  let target = event.target.closest("#canvas, .row, .col-12, .col-lg-4, section, div");

  if (!target) return;

  // Si es una sección, insertamos una estructura real
  if (tipo === "seccion") {
    const section = document.createElement("section");
    section.className = "row g-4 mb-3"; // margen y separación
    section.innerHTML = `
      <div class="col-12 col-lg-6 border p-3">Columna 1</div>
      <div class="col-12 col-lg-6 border p-3">Columna 2</div>
    `;
    target.appendChild(section);
    return;
  }

  // Si es una columna vacía
  if (tipo === "col") {
    const columna = document.createElement("div");
    columna.className = "col-12 col-lg-6 border p-3";
    columna.textContent = "Nueva columna";
    target.appendChild(columna);
    return;
  }

  // Si es contenido HTML o texto
  if (tipo === "texto" || html) {
    insertarBloqueDesdeHtml(html || "<p class='mb-0'>📝 Texto editable</p>", target);
    return;
  }
}




function cargarBloquesGuardados() {
  const contenedor = document.getElementById("bloquesGuardados");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  db.collection("bloquesPersonalizados")
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const bloque = doc.data();
        const docId = doc.id;

        const col = document.createElement("div");
        col.className = "col";

        col.innerHTML = `
          <div class="card h-100 d-flex flex-row align-items-center p-2">
            <img src="https://via.placeholder.com/60x60.png?text=📦" class="img-thumbnail me-3" style="width:60px; height:60px;" alt="Bloque">
            <div class="d-flex flex-column justify-content-center flex-grow-1">
              <div class="d-flex align-items-center justify-content-between">
                <h6 class="mb-0">${bloque.nombre}</h6>
                <i class="fas fa-pen text-secondary cursor-pointer" onclick='abrirEditorBloque(${JSON.stringify(docId)}, ${JSON.stringify(bloque.nombre)}, ${JSON.stringify(bloque.contenido)})'></i>
              </div>
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
function cargarBloquesEnBarra() {
  const barra = document.querySelector(".bloques-barra");
  barra.innerHTML = ""; // limpiar la barra primero

db.collection("bloquesPersonalizados")
  .get()
  .then((querySnapshot) => {


    if (querySnapshot.empty) {
      console.log("⚠️ No hay bloques guardados en Firebase.");
      return;
    }

    querySnapshot.forEach((doc) => {
      const bloque = doc.data();
      const html = bloque.contenido;
      const nombre = bloque.nombre;
      const nuevo = document.createElement("div");
      nuevo.className = "bloque-draggable";
      nuevo.setAttribute("draggable", "true");
      nuevo.dataset.html = html;
      nuevo.title = nombre;
      nuevo.textContent = `🧩 ${nombre}`;

      nuevo.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/html", html);
      });

      const barra = document.querySelector(".bloques-barra");
      barra.appendChild(nuevo);
    });
  })
  .catch((error) => {
    console.error("❌ Error al cargar bloques desde Firebase:", error);
  });
}



function abrirEditorBloque(id, nombre, contenido) {
  document.getElementById("editarBloqueId").value = id;
  document.getElementById("editarNombreBloque").value = nombre;
  document.getElementById("editarContenidoBloque").value = contenido;

  const modal = new bootstrap.Modal(document.getElementById("modalEditarBloque"));
  modal.show();
}

function guardarCambiosBloque(event) {
  event.preventDefault();

  const id = document.getElementById("editarBloqueId").value;
  const nuevoNombre = document.getElementById("editarNombreBloque").value.trim();
  const nuevoContenido = document.getElementById("editarContenidoBloque").value.trim();

  if (!id || !nuevoNombre || !nuevoContenido) return;

  db.collection("bloquesPersonalizados")
    .doc(id)
    .update({
      nombre: nuevoNombre,
      contenido: nuevoContenido,
    })
    .then(() => {
      const modal = bootstrap.Modal.getInstance(document.getElementById("modalEditarBloque"));
      modal.hide();
      cargarBloquesGuardados();
      alert("Bloque actualizado correctamente.");
    })
    .catch((error) => {
      console.error("Error al actualizar bloque:", error);
      alert("No se pudo actualizar el bloque.");
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

// Insertar bloque HTML personalizado en el canvas o columna
function insertarBloqueDesdeHtml(html, target) {
  const bloque = document.createElement("div");
  bloque.innerHTML = html;
  bloque.classList.add("mb-3");
  target.appendChild(bloque);
}