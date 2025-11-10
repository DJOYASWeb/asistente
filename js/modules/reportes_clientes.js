// === SELECTOR DE FECHAS iOS ===
const btnRangoFechas = document.getElementById("btnRangoFechas");
const dropdownFechas = document.getElementById("dropdownFechas");
const textoRango = document.getElementById("textoRango");
const aplicarFechas = document.getElementById("aplicarFechas");

// ✅ Evita que el dropdown se cierre al hacer clic dentro
dropdownFechas.addEventListener("click", e => e.stopPropagation());

// Abre/cierra el popover
btnRangoFechas.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownFechas.classList.toggle("show");
  btnRangoFechas.classList.toggle("open");
});

// Cierra al hacer clic fuera
document.addEventListener("click", () => {
  dropdownFechas.classList.remove("show");
  btnRangoFechas.classList.remove("open");
});

// === Calendarios ===
let rangoPrincipal = null;
let rangoComparar = null;

// Flatpickr principal
const calendarioPrincipal = flatpickr("#calendarioPrincipal", {
  mode: "range",
  inline: true,
  dateFormat: "d 'de' F",
  locale: flatpickr.l10ns.es,
  onChange: function(selectedDates) {
    rangoPrincipal = selectedDates;
  }
});

// Flatpickr comparativo
const calendarioComparar = flatpickr("#calendarioComparar", {
  mode: "range",
  inline: true,
  dateFormat: "d 'de' F",
  locale: flatpickr.l10ns.es,
  onChange: function(selectedDates) {
    rangoComparar = selectedDates;
  }
});

// === Opciones predefinidas ===
document.querySelectorAll(".opcion-fecha").forEach(btn => {
  btn.addEventListener("click", () => {
    const rango = btn.textContent.trim();
    textoRango.textContent = rango;
  });
});

// === Aplicar selección ===
aplicarFechas.addEventListener("click", () => {
  if (rangoPrincipal && rangoPrincipal.length === 2) {
    const [inicio, fin] = rangoPrincipal;
    const opciones = { day: 'numeric', month: 'short' };
    const inicioTxt = inicio.toLocaleDateString('es-ES', opciones);
    const finTxt = fin.toLocaleDateString('es-ES', opciones);
    textoRango.textContent = `${inicioTxt} – ${finTxt}`;
  } else {
    textoRango.textContent = "Selecciona un rango";
  }

  // Cerrar el popover
  dropdownFechas.classList.remove("show");
  btnRangoFechas.classList.remove("open");
});
