// =========================================
// reportes_clientes.js (versión optimizada sin CORS)
// =========================================

// === SELECTOR DE FECHAS iOS ===
const btnRangoFechas = document.getElementById("btnRangoFechas");
const dropdownFechas = document.getElementById("dropdownFechas");
const textoRango = document.getElementById("textoRango");
const aplicarFechas = document.getElementById("aplicarFechas");

dropdownFechas.addEventListener("click", e => e.stopPropagation());
btnRangoFechas.addEventListener("click", e => {
  e.stopPropagation();
  dropdownFechas.classList.toggle("show");
  btnRangoFechas.classList.toggle("open");
});
document.addEventListener("click", () => {
  dropdownFechas.classList.remove("show");
  btnRangoFechas.classList.remove("open");
});

// === Calendarios ===
let rangoPrincipal = null;
let rangoComparar = null;

const calendarioPrincipal = flatpickr("#calendarioPrincipal", {
  mode: "range",
  inline: true,
  dateFormat: "d 'de' F",
  locale: flatpickr.l10ns.es,
  onChange: d => (rangoPrincipal = d)
});

const calendarioComparar = flatpickr("#calendarioComparar", {
  mode: "range",
  inline: true,
  dateFormat: "d 'de' F",
  locale: flatpickr.l10ns.es,
  onChange: d => (rangoComparar = d)
});

document.querySelectorAll(".opcion-fecha").forEach(btn => {
  btn.addEventListener("click", () => {
    textoRango.textContent = btn.textContent.trim();
  });
});

aplicarFechas.addEventListener("click", () => {
  if (rangoPrincipal && rangoPrincipal.length === 2) {
    const [inicio, fin] = rangoPrincipal;
    const opciones = { day: "numeric", month: "short" };
    textoRango.textContent =
      `${inicio.toLocaleDateString("es-ES", opciones)} – ${fin.toLocaleDateString("es-ES", opciones)}`;
  } else {
    textoRango.textContent = "Selecciona un rango";
  }
  dropdownFechas.classList.remove("show");
  btnRangoFechas.classList.remove("open");
});

// =========================================
// 🔁 CARGA DE ARCHIVOS CSV (SIN STORAGE, SIN CORS)
// =========================================
function inicializarInputsCSV() {
  const db = firebase.firestore();
  const tipos = ["Ventas", "Clientes", "Pedidos"];

  tipos.forEach(tipo => {
    const input = document.getElementById(`input${tipo}`);
    const info = document.getElementById(`info${tipo}`);
    if (!input || !info) return;

    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const contenido = e.target.result;

          const registro = {
            nombreArchivo: file.name,
            tipo: tipo.toLowerCase(),
            tamanoKB: (file.size / 1024).toFixed(1),
            fechaSubida: firebase.firestore.Timestamp.fromDate(new Date()),
            data: contenido
          };

          await db.collection("reportes_datos").doc(tipo.toLowerCase()).set(registro);

          info.textContent = `✅ ${file.name} cargado correctamente (${(file.size / 1024).toFixed(1)} KB).`;
          mostrarToast(`Archivo ${tipo} cargado con éxito ✅`, "exito");
        } catch (err) {
          console.error("Error al guardar CSV:", err);
          info.textContent = `❌ Error al cargar ${file.name}`;
          mostrarToast(`Error al cargar ${tipo}: ${err.message}`, "error");
        }
      };

      reader.readAsText(file);
    });
  });
}

// =========================================
// 🔁 PROCESAMIENTO DE ARCHIVOS DESDE FIRESTORE
// =========================================
async function procesarArchivos() {
  const db = firebase.firestore();
  mostrarToast("Procesando archivos disponibles...", "alerta");

  try {
    const coleccion = await db.collection("reportes_datos").get();
    if (coleccion.empty) {
      mostrarToast("⚠️ No hay archivos cargados aún en Firestore.", "alerta");
      return;
    }

    const archivos = [];
    coleccion.forEach(doc => archivos.push(doc.data()));

    console.log("📦 Archivos disponibles:", archivos);
    mostrarToast(`✅ ${archivos.length} archivo(s) disponibles para generar reportes.`, "exito");
  } catch (error) {
    console.error("Error procesando archivos:", error);
    mostrarToast(`Error procesando archivos: ${error.message}`, "error");
  }
}

// =========================================
// 🔁 DASHBOARD DE CLIENTES
// =========================================
async function cargarDashboardClientes() {
  try {
    const db = firebase.firestore();
    const snapshot = await db.collection("reportes_datos").doc("clientes").get();
    if (!snapshot.exists) {
      document.getElementById("contenidoReportesMain").innerHTML =
        `<div class="ios-card"><p class="muted">⚠️ No hay datos de clientes cargados.</p></div>`;
      return;
    }

    const dataFile = snapshot.data();
    const data = Papa.parse(dataFile.data, { header: true, skipEmptyLines: true }).data;

    const clientesNuevos = data.length;
    const recurrentes = data.filter(c => parseInt(c.cantidad_pedidos || 0) > 1).length;
    const tasaRepeticion = ((recurrentes / clientesNuevos) * 100).toFixed(1);
    const ticketPromedio = (
      data.reduce((acc, c) => acc + parseFloat(c.ticket_promedio || 0), 0) / data.length
    ).toFixed(0);
    const tiempoProm = (
      data.reduce((acc, c) => acc + parseFloat(c.dias_hasta_primera_compra || 0), 0) / data.length
    ).toFixed(1);

    const main = document.getElementById("contenidoReportesMain");
    main.innerHTML = `
      <div class="ios-card">
        <h2><i class="fa-solid fa-user-group"></i> Reporte de Clientes</h2>

        <div class="metricas-grid">
          <div><strong>${clientesNuevos}</strong><p>Nuevos clientes</p></div>
          <div><strong>${recurrentes}</strong><p>Recurrentes</p></div>
          <div><strong>${tasaRepeticion}%</strong><p>Tasa de repetición</p></div>
          <div><strong>$${ticketPromedio}</strong><p>Ticket promedio</p></div>
          <div><strong>${tiempoProm}</strong><p>Días hasta primera compra</p></div>
        </div>

        <div class="grafico-contenedor">
          <div id="graficoCategorias"></div>
          <div id="graficoNuevosVsRecurrentes"></div>
        </div>

        <h4 style="margin-top:1rem;">Top 10 clientes</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Pedidos</th>
              <th>Total gastado</th>
              <th>Categoría</th>
            </tr>
          </thead>
          <tbody id="tablaTopClientes"></tbody>
        </table>
      </div>
    `;

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

    new ApexCharts(document.querySelector("#graficoNuevosVsRecurrentes"), {
      chart: { type: "bar" },
      series: [{ name: "Clientes", data: [clientesNuevos - recurrentes, recurrentes] }],
      xaxis: { categories: ["Nuevos", "Recurrentes"] },
      colors: ["#0a84ff", "#5ac8fa"],
      title: { text: "Nuevos vs Recurrentes" }
    }).render();

    const top = data
      .filter(c => parseFloat(c.total_gastado || 0) > 0)
      .sort((a, b) => b.total_gastado - a.total_gastado)
      .slice(0, 10);

    document.getElementById("tablaTopClientes").innerHTML = top
      .map(c => `
        <tr>
          <td>${c.nombre_cliente}</td>
          <td>${c.email}</td>
          <td>${c.cantidad_pedidos}</td>
          <td>$${parseFloat(c.total_gastado).toLocaleString()}</td>
          <td>${c.categoria_principal_mas_comprada || "-"}</td>
        </tr>`)
      .join("");
  } catch (err) {
    console.error("Error cargando dashboard clientes:", err);
  }
}

// =========================================
// 🔁 CONTROL DE TABS
// =========================================
document.querySelectorAll(".tab-reportes").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".tab-reportes").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const section = btn.getAttribute("data-section");
    const main = document.getElementById("contenidoReportesMain");
    const seccionConfig = document.getElementById("seccion-configuracion");

    if (section === "config") {
      main.style.display = "none";
      seccionConfig.style.display = "block";
    } else {
      seccionConfig.style.display = "none";
      main.style.display = "block";
    }

    if (section === "general" || section === "clientes") {
      await cargarDashboardClientes();
    }
  });
});

document.querySelector('.tab-reportes[data-section="general"]').click();

// =========================================
// 🔁 TOAST DE NOTIFICACIÓN
// =========================================
function mostrarToast(mensaje, tipo = "exito") {
  const toast = document.createElement("div");
  toast.className = `toast-notif toast-${tipo}`;
  toast.innerHTML = `<span class="toast-icon">${
    tipo === "error" ? "❌" : tipo === "alerta" ? "⚠️" : "✅"
  }</span> ${mensaje}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
