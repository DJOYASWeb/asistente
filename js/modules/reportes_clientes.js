// =========================================
// ✅ LECTURA DE CSV DESDE GOOGLE DRIVE – reportes_clientes.js (versión limpia)
// =========================================

    let rangoPrincipal = null;

document.addEventListener("DOMContentLoaded", () => {
  // === SELECTOR DE FECHAS iOS ===
  const btnRangoFechas = document.getElementById("btnRangoFechas");
  const dropdownFechas = document.getElementById("dropdownFechas");
  const textoRango = document.getElementById("textoRango");
  const aplicarFechas = document.getElementById("aplicarFechas");

  if (btnRangoFechas && dropdownFechas && textoRango && aplicarFechas) {
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



    flatpickr("#calendarioPrincipal", {
      mode: "range",
      inline: true,
      dateFormat: "d 'de' F",
      locale: flatpickr.l10ns.es,
      onChange: d => (rangoPrincipal = d)
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
  }

  // =========================================
  // ⚙️ CONFIGURAR ENLACE DE GOOGLE DRIVE (Guardar y cargar)
  // =========================================
  const inputDrive = document.getElementById("inputDriveCSV");
  const btnGuardarDrive = document.getElementById("btnGuardarDrive");
  const statusDrive = document.getElementById("statusDriveCSV");

  if (inputDrive && btnGuardarDrive) {
    const savedId = localStorage.getItem("drive_csv_clientes");
    if (savedId) {
      inputDrive.value = `https://drive.google.com/file/d/${savedId}/view?usp=sharing`;
      if (statusDrive) statusDrive.textContent = "✅ Enlace guardado correctamente.";
    }

    btnGuardarDrive.addEventListener("click", () => {
      const url = inputDrive.value.trim();
      if (!url) {
        alert("Por favor, pega el enlace de Google Drive del archivo CSV.");
        return;
      }
      const match = url.match(/[-\w]{25,}/);
      if (!match) {
        alert("⚠️ El enlace de Google Drive no es válido.");
        return;
      }
      const fileId = match[0];
      localStorage.setItem("drive_csv_clientes", fileId);
      if (statusDrive) statusDrive.textContent = "✅ Enlace guardado correctamente.";
      alert("✅ Enlace de Google Drive guardado con éxito.");
    });
  }
// =========================================
// 📊 CARGAR DASHBOARD CLIENTES (Lee desde enlace guardado en localStorage)
// =========================================
async function cargarDashboardClientes() {
  try {
    const saved = localStorage.getItem("csv_clientes");

    if (!saved) {
      document.getElementById("contenidoReportesMain").innerHTML = `
        <div class="ios-card"><p class="muted">⚠️ No hay enlace configurado para Clientes.</p></div>`;
      return;
    }

    // Detectar tipo de enlace (Google Sheets o Drive)
    let url;
    if (saved.startsWith("http")) {
      url = saved;
    } else {
      // Por compatibilidad, si solo se guardó el ID
      url = `https://drive.google.com/uc?export=download&id=${saved}`;
    }

    // Cargar CSV
    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo acceder al CSV (verifica permisos públicos).");

    const text = await response.text();
const data = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

// 🧹 Normalizar encabezados
const normalizado = data.map(row => {
  const limpio = {};
  Object.keys(row).forEach(k => {
    const key = k.trim().toLowerCase().replace(/\s+/g, "_");
    limpio[key] = row[k];
  });
  return limpio;
});

// ⚙️ Obtener rango activo desde el selector de fechas
let inicioRango = null;
let finRango = null;
if (typeof rangoPrincipal !== "undefined" && rangoPrincipal && rangoPrincipal.length === 2) {
  inicioRango = rangoPrincipal[0];
  finRango = rangoPrincipal[1];
}

// 🧩 Convertir string "YYYY-MM-DD HH:mm:ss" a objeto Date válido
const parseFecha = (str) => {
  if (!str || typeof str !== "string") return null;
  // Ejemplo: "2025-11-10 17:32:11"
  const [fechaPart, horaPart] = str.trim().split(" ");
  if (!fechaPart) return null;
  const [y, m, d] = fechaPart.split("-").map(Number);
  let h = 0, min = 0, s = 0;
  if (horaPart) {
    [h, min, s] = horaPart.split(":").map(Number);
  }
  return new Date(y, m - 1, d, h, min, s);
};

// 🧠 DEBUG – Verificación de fechas y rango seleccionado
console.log("============== DEBUG RANGO ==============");
console.log("➡️ Rango actual:", rangoPrincipal);
if (rangoPrincipal && rangoPrincipal.length === 2) {
  console.log("   Inicio:", rangoPrincipal[0].toISOString());
  console.log("   Fin:", rangoPrincipal[1].toISOString());
} else {
  console.log("⚠️ No hay rango seleccionado aún.");
}

// Verificar que existan registros y columnas esperadas
console.log("➡️ Total registros cargados:", normalizado.length);
if (normalizado.length > 0) {
  console.log("📋 Primer registro:", normalizado[0]);
  console.log("🗝 Claves detectadas:", Object.keys(normalizado[0]));
}

// Contar cuántos registros tienen fecha válida
const conFecha = normalizado.filter(c => c.fecha_registro || c.primera_compra);
console.log(`📅 Registros con fecha detectada: ${conFecha.length} de ${normalizado.length}`);

// Probar conversión de fechas en los primeros 3 registros
conFecha.slice(0, 3).forEach((c, i) => {
  const raw = c.fecha_registro || c.primera_compra;
  const parsed = parseFecha(raw);
  console.log(`🧩 [${i}] Fecha original: "${raw}" → Objeto:`, parsed);
});
console.log("=========================================");


// 🕓 Filtrar datos según rango si está seleccionado
const filtrados = normalizado.filter(c => {
  const fecha = parseFecha(c.fecha_registro || c.primera_compra || "");
  if (!fecha) return false;
  if (inicioRango && finRango) {
    return fecha >= inicioRango && fecha <= finRango;
  }
  return true;
});



console.log(`📅 Filtrados: ${filtrados.length} de ${filtrados.length} registros`);

// 🔹 Función auxiliar para convertir texto a número seguro
const num = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(v.toString().replace(",", "."));
  return isNaN(n) ? 0 : n;
};



// === Calcular métricas ===
const clientesNuevos = filtrados.length;
const recurrentes = filtrados.filter(c => num(c.cantidad_pedidos) > 1).length;
const tasaRepeticion = clientesNuevos
  ? ((recurrentes / clientesNuevos) * 100).toFixed(1)
  : 0;

const clientesValidos = filtrados.filter(c => num(c.ticket_promedio) > 0);

const ticketPromedio = clientesValidos.length
  ? (
      clientesValidos.reduce((acc, c) => acc + num(c.ticket_promedio), 0) /
      clientesValidos.length
    ).toFixed(0)
  : 0;

const tiempoProm = clientesValidos.length
  ? (
      clientesValidos.reduce((acc, c) => acc + num(c.dias_hasta_primera_compra), 0) /
      clientesValidos.length
    ).toFixed(1)
  : 0;

// === Mostrar resultados en consola también (para revisar) ===
console.log("📊 Métricas calculadas:", {
  clientesNuevos,
  recurrentes,
  tasaRepeticion,
  ticketPromedio,
  tiempoProm
});


    // === Renderizar contenido ===
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

    // === Gráfico 1: Categorías más compradas ===
    const catMap = {};
    data.forEach(c => {
      const cat = c.categoria_principal_mas_comprada || "Sin categoría";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    new ApexCharts(document.querySelector("#graficoCategorias"), {
      chart: { type: "donut" },
      labels: Object.keys(catMap),
      series: Object.values(catMap),
      legend: { position: "bottom" },
      title: { text: "Categorías más compradas" }
    }).render();

    // === Gráfico 2: Nuevos vs recurrentes ===
    new ApexCharts(document.querySelector("#graficoNuevosVsRecurrentes"), {
      chart: { type: "bar" },
      series: [{ name: "Clientes", data: [clientesNuevos - recurrentes, recurrentes] }],
      xaxis: { categories: ["Nuevos", "Recurrentes"] },
      colors: ["#0a84ff", "#5ac8fa"],
      title: { text: "Nuevos vs Recurrentes" }
    }).render();

    // === Tabla top 10 ===
    const top = data
      .filter(c => parseFloat(c.total_gastado || 0) > 0)
      .sort((a, b) => b.total_gastado - a.total_gastado)
      .slice(0, 10);

    document.getElementById("tablaTopClientes").innerHTML = top
      .map(
        c => `
        <tr>
          <td>${c.nombre_cliente}</td>
          <td>${c.email}</td>
          <td>${c.cantidad_pedidos}</td>
          <td>$${parseFloat(c.total_gastado).toLocaleString()}</td>
          <td>${c.categoria_principal_mas_comprada || "-"}</td>
        </tr>`
      )
      .join("");
  } catch (err) {
    console.error("❌ Error cargando dashboard clientes:", err);
    document.getElementById("contenidoReportesMain").innerHTML = `
      <div class="ios-card"><p class="text-danger">Error cargando CSV: ${err.message}</p></div>`;
  }
}


// =========================================
// 🔹 CONTROL DE TABS (cada sección carga solo su propio contenido)
// =========================================
document.querySelectorAll(".tab-reportes").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".tab-reportes").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const section = btn.getAttribute("data-section");
    const main = document.getElementById("contenidoReportesMain");
    const seccionConfig = document.getElementById("seccion-configuracion");

    // Ocultar/mostrar secciones
    if (section === "config") {
      main.style.display = "none";
      seccionConfig.style.display = "block";
      return;
    } else {
      seccionConfig.style.display = "none";
      main.style.display = "block";
    }

    // Limpiar contenido anterior
    main.innerHTML = `<div class="ios-card"><p class="muted">Cargando ${section}...</p></div>`;

    // === Control individual por pestaña ===
    if (section === "clientes") {
      await cargarDashboardClientes();
    } 
    else if (section === "ventas") {
      main.innerHTML = `<div class="ios-card"><p class="muted">📦 Próximamente: Reporte de Ventas.</p></div>`;
    } 
    else if (section === "categorias") {
      main.innerHTML = `<div class="ios-card"><p class="muted">🏷️ Reporte de Categorías aún no disponible.</p></div>`;
    } 
    else if (section === "geografia") {
      main.innerHTML = `<div class="ios-card"><p class="muted">🌎 Reporte geográfico en desarrollo.</p></div>`;
    } 
    else if (section === "tendencias") {
      main.innerHTML = `<div class="ios-card"><p class="muted">📈 Reporte de tendencias en desarrollo.</p></div>`;
    } 
    else if (section === "general") {
      main.innerHTML = `<div class="ios-card"><p class="muted">📊 Resumen general en desarrollo.</p></div>`;
    }
  });
});

  // === Seleccionar pestaña inicial ===
  const tabInicial = document.querySelector('.tab-reportes[data-section="general"]');
  if (tabInicial) tabInicial.click();
});

// === CONFIGURADOR MINIMALISTA DE ENLACES CSV ===
const enlaces = [
  { id: "Clientes", key: "csv_clientes" },
  { id: "Ventas", key: "csv_ventas" },
  { id: "Pedidos", key: "csv_pedidos" }
];

enlaces.forEach(item => {
  const input = document.getElementById(`link${item.id}`);
  const btn = document.getElementById(`btnGuardar${item.id}`);
  if (!input || !btn) return;

  // Mostrar valor guardado
  const saved = localStorage.getItem(item.key);
  if (saved) input.value = saved;

  // Guardar nuevo enlace
  btn.addEventListener("click", () => {
    const url = input.value.trim();
    if (!url) return alert("Pega un enlace válido para " + item.id);
    localStorage.setItem(item.key, url);
    document.getElementById("statusLinks").textContent = `✅ Enlace de ${item.id} guardado.`;
  });
});
