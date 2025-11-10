// --- Selector de Fechas con desplegable iOS ---
const btnRangoFechas = document.getElementById("btnRangoFechas");
const dropdownFechas = document.getElementById("dropdownFechas");
const textoRango = document.getElementById("textoRango");

// 👉 Previene que se cierre al hacer clic dentro
dropdownFechas.addEventListener("click", e => e.stopPropagation());

btnRangoFechas.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownFechas.classList.toggle("show");
  btnRangoFechas.classList.toggle("open");
});

document.addEventListener("click", () => {
  dropdownFechas.classList.remove("show");
  btnRangoFechas.classList.remove("open");
});

// Actualizar texto al elegir rango predefinido
document.querySelectorAll(".opcion-fecha").forEach(btn => {
  btn.addEventListener("click", () => {
    const rango = btn.textContent.trim();
    textoRango.textContent = rango;
  });
});

// --- Flatpickr: inicializa calendarios inline ---
flatpickr("#calendarioPrincipal", {
  mode: "range",
  inline: true,
  dateFormat: "d/m/Y",
  locale: flatpickr.l10ns.es
});

flatpickr("#calendarioComparar", {
  mode: "range",
  inline: true,
  dateFormat: "d/m/Y",
  locale: flatpickr.l10ns.es
});


// Cerrar al aplicar
document.getElementById("aplicarFechas").addEventListener("click", () => {
  dropdownFechas.classList.remove("show");
  btnRangoFechas.classList.remove("open");
});
