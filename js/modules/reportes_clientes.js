// INICIO script selector de fechas animado
const btnRangoFechas = document.getElementById("btnRangoFechas");
const dropdownFechas = document.getElementById("dropdownFechas");
const textoRango = document.getElementById("textoRango");
const rangoPersonalizado = document.querySelector(".rango-personalizado");

btnRangoFechas.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownFechas.classList.toggle("show");
  btnRangoFechas.classList.toggle("open");
});

document.addEventListener("click", () => {
  dropdownFechas.classList.remove("show");
  btnRangoFechas.classList.remove("open");
});

// Selección rápida
document.querySelectorAll(".opcion-fecha").forEach(btn => {
  btn.addEventListener("click", () => {
    const dias = btn.getAttribute("data-range");
    if (dias) {
      textoRango.textContent = `Últimos ${dias} días`;
      dropdownFechas.classList.remove("show");
      btnRangoFechas.classList.remove("open");
      actualizarDashboard(dias);
    } else {
      rangoPersonalizado.classList.toggle("activo");
    }
  });
});

// Rango personalizado
document.getElementById("aplicarRangoPersonal").addEventListener("click", () => {
  const ini = document.getElementById("fechaInicioPersonal").value;
  const fin = document.getElementById("fechaFinPersonal").value;
  if (ini && fin) {
    textoRango.textContent = `${ini} → ${fin}`;
    dropdownFechas.classList.remove("show");
    btnRangoFechas.classList.remove("open");
    actualizarDashboardPersonalizado(ini, fin);
  }
});

// Funciones de actualización con efecto fade
function actualizarDashboard(dias) {
  const dashboard = document.getElementById("dashboardGeneral");
  if (!dashboard) return;
  dashboard.style.opacity = 0;
  setTimeout(() => {
    // Aquí llamarías a tu función real de carga de datos según "dias"
    console.log(`Actualizando dashboard para últimos ${dias} días...`);
    dashboard.style.opacity = 1;
  }, 400);
}

function actualizarDashboardPersonalizado(inicio, fin) {
  const dashboard = document.getElementById("dashboardGeneral");
  if (!dashboard) return;
  dashboard.style.opacity = 0;
  setTimeout(() => {
    console.log(`Actualizando dashboard del ${inicio} al ${fin}...`);
    dashboard.style.opacity = 1;
  }, 400);
}
// FIN script selector de fechas animado
