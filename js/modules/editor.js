// 📄 Lógica para gestionar las clases personalizadas
document.addEventListener("DOMContentLoaded", () => {
  cargarClases();

  document.getElementById("btnGuardarClase").addEventListener("click", () => {
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
  });
});

function obtenerClases() {
  return JSON.parse(localStorage.getItem("clasesPersonalizadas") || "[]");
}

function cargarClases() {
  renderizarClases();
}

function renderizarClases() {
  const tbody = document.getElementById("tablaClases");
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

function limpiarFormulario() {
  document.getElementById("nombreClase").value = "";
  document.getElementById("valoresCSS").value = "";
}

function editarClase(index) {
  const clases = obtenerClases();
  const clase = clases[index];
  document.getElementById("nombreClase").value = clase.nombre;
  document.getElementById("valoresCSS").value = clase.valores;
}

function eliminarClase(index) {
  const clases = obtenerClases();
  if (!confirm(`¿Eliminar la clase "${clases[index].nombre}"?`)) return;

  clases.splice(index, 1);
  localStorage.setItem("clasesPersonalizadas", JSON.stringify(clases));
  renderizarClases();
}
