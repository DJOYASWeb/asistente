// --- Selector de Fechas con desplegable iOS ---
const btnRangoFechas = document.getElementById("btnRangoFechas");
const dropdownFechas = document.getElementById("dropdownFechas");
const textoRango = document.getElementById("textoRango");

btnRangoFechas.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownFechas.classList.toggle("show");
  btnRangoFechas.classList.toggle("open");
});

document.addEventListener("click", () => {
  dropdownFechas.classList.remove("show");
  btnRangoFechas.classList.remove("open");
});

document.querySelectorAll(".opcion-fecha").forEach(btn => {
  btn.addEventListener("click", () => {
    const rango = btn.textContent.trim();
    textoRango.textContent = rango;
    dropdownFechas.classList.remove("show");
    btnRangoFechas.classList.remove("open");
  });
});

// Botón aplicar (puedes conectar lógica real aquí)
document.getElementById("aplicarFechas").addEventListener("click", () => {
  dropdownFechas.classList.remove("show");
  btnRangoFechas.classList.remove("open");
});
