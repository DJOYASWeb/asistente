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

async function cargarDashboardClientes() {
  // === Paso 1: Cargar CSV ===
  const response = await fetch("tu_archivo_clientes.csv");
  const text = await response.text();
  const data = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

  // === Paso 2: Calcular métricas ===
  const clientesNuevos = data.length;
  const recurrentes = data.filter(c => parseInt(c.cantidad_pedidos || 0) > 1).length;
  const tasaRepeticion = ((recurrentes / clientesNuevos) * 100).toFixed(1);
  const ticketPromedio = (
    data.reduce((acc, c) => acc + (parseFloat(c.ticket_promedio || 0)), 0) / data.length
  ).toFixed(0);
  const tiempoProm = (
    data.reduce((acc, c) => acc + (parseFloat(c.dias_hasta_primera_compra || 0)), 0) / data.length
  ).toFixed(1);

  // === Paso 3: Actualizar métricas ===
  document.getElementById("mClientesNuevos").textContent = clientesNuevos;
  document.getElementById("mClientesRecurrentes").textContent = recurrentes;
  document.getElementById("mTasaRepeticion").textContent = tasaRepeticion + "%";
  document.getElementById("mTicketPromedio").textContent = "$" + ticketPromedio;
  document.getElementById("mTiempoPrimera").textContent = tiempoProm + " días";

  // === Paso 4: Gráfico categorías ===
  const catMap = {};
  data.forEach(c => {
    const cat = c.categoria_principal_mas_comprada || "Sin categoría";
    catMap[cat] = (catMap[cat] || 0) + 1;
  });

  const categorias = Object.keys(catMap);
  const valores = Object.values(catMap);

  new ApexCharts(document.querySelector("#graficoCategorias"), {
    chart: { type: "donut" },
    labels: categorias,
    series: valores,
    legend: { position: "bottom" },
    title: { text: "Categorías más compradas" }
  }).render();

  // === Paso 5: Gráfico nuevos vs recurrentes ===
  new ApexCharts(document.querySelector("#graficoNuevosVsRecurrentes"), {
    chart: { type: "bar" },
    series: [{
      name: "Clientes",
      data: [clientesNuevos - recurrentes, recurrentes]
    }],
    xaxis: { categories: ["Nuevos", "Recurrentes"] },
    colors: ["#0a84ff", "#5ac8fa"],
    title: { text: "Nuevos vs Recurrentes" }
  }).render();

  // === Paso 6: Tabla top 10 ===
  const top = data
    .filter(c => parseFloat(c.total_gastado || 0) > 0)
    .sort((a,b) => b.total_gastado - a.total_gastado)
    .slice(0, 10);

  document.getElementById("tablaTopClientes").innerHTML = top.map(c => `
    <tr>
      <td>${c.nombre_cliente}</td>
      <td>${c.email}</td>
      <td>${c.cantidad_pedidos}</td>
      <td>$${parseFloat(c.total_gastado).toLocaleString()}</td>
      <td>${c.categoria_principal_mas_comprada || "-"}</td>
    </tr>
  `).join("");
}

cargarDashboardClientes();