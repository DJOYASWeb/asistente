// INICIO script selector de fechas
const btnRangoFechas = document.getElementById("btnRangoFechas");
const dropdownFechas = document.getElementById("dropdownFechas");
const textoRango = document.getElementById("textoRango");

btnRangoFechas.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownFechas.classList.toggle("show");
});

document.addEventListener("click", () => {
  dropdownFechas.classList.remove("show");
});

document.querySelectorAll(".opcion-fecha").forEach(btn => {
  btn.addEventListener("click", () => {
    const dias = btn.getAttribute("data-range");
    textoRango.textContent = `Últimos ${dias} días`;
    dropdownFechas.classList.remove("show");
    // Aquí puedes lanzar la función que actualiza tus reportes con ese rango
  });
});

document.getElementById("aplicarRangoPersonal").addEventListener("click", () => {
  const ini = document.getElementById("fechaInicioPersonal").value;
  const fin = document.getElementById("fechaFinPersonal").value;
  if (ini && fin) {
    textoRango.textContent = `${ini} → ${fin}`;
    dropdownFechas.classList.remove("show");
    // Ejecutar actualización del dashboard con el rango personalizado
  }
});
// FIN script selector de fechas
