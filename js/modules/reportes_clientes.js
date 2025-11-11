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

aplicarFechas.addEventListener("click", async () => {
  if (rangoPrincipal && rangoPrincipal.length === 2) {
    const [inicio, fin] = rangoPrincipal;
    const opciones = { day: "numeric", month: "short" };
    textoRango.textContent =
      `${inicio.toLocaleDateString("es-ES", opciones)} – ${fin.toLocaleDateString("es-ES", opciones)}`;

    // 🔁 Recargar dashboard clientes con el nuevo rango
    console.log("📅 Nuevo rango aplicado:", inicio, "→", fin);
    await cargarDashboardClientes();
  } else {
    textoRango.textContent = "Selecciona un rango";
    console.warn("⚠️ Intento de aplicar rango sin fechas seleccionadas.");
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



// ⚙️ Detectar rango activo seleccionado en el calendario
let inicioRango = null;
let finRango = null;

if (Array.isArray(rangoPrincipal) && rangoPrincipal.length === 2) {
  inicioRango = rangoPrincipal[0];
  finRango = rangoPrincipal[1];
  console.log("✅ Filtro activo:", inicioRango, "→", finRango);
} else {
  console.log("⚠️ Sin rango seleccionado, mostrando todos los registros.");
}

// 🧩 Convertir string "YYYY-MM-DD HH:mm:ss" a objeto Date
function parseFecha(str) {
  if (!str || typeof str !== "string") return null;
  const [fechaPart, horaPart] = str.trim().split(" ");
  if (!fechaPart) return null;
  const [y, m, d] = fechaPart.split("-").map(Number);
  let h = 0, min = 0, s = 0;
  if (horaPart) [h, min, s] = horaPart.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, s);
}

// 🕓 Filtrar registros dentro del rango seleccionado
const filtrados = normalizado.filter(c => {
  const fecha = parseFecha(c.fecha_registro || c.primera_compra || "");
  if (!fecha) return false;

  // Si hay rango seleccionado, aplicar filtro
  if (inicioRango && finRango) {
    return fecha >= inicioRango && fecha <= finRango;
  }

  // Si no hay rango, incluir todos
  return true;
});

console.log(`📊 Filtrados ${filtrados.length} de ${normalizado.length} registros dentro del rango.`);




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
          <div style="background:#ededed;border-radius: 15px;padding: 1rem;"><strong style="font-size: 2rem;">${clientesNuevos}</strong><p>Nuevos clientes</p></div>
          <div style="background:#ededed;border-radius: 15px;padding: 1rem;"><strong style="font-size: 2rem;">${recurrentes}</strong><p>Recurrentes</p></div>
          <div style="background:#ededed;border-radius: 15px;padding: 1rem;"><strong style="font-size: 2rem;">${tasaRepeticion}%</strong><p>Tasa de repetición</p></div>
          <div style="background:#ededed;border-radius: 15px;padding: 1rem;"><strong style="font-size: 2rem;">$${Number(ticketPromedio).toLocaleString('es-CL')}</strong><p>Ticket promedio</p></div>
          <div style="background:#ededed;border-radius: 15px;padding: 1rem;"><strong style="font-size: 2rem;">${tiempoProm}</strong><p>Días hasta primera compra</p></div>
        </div>

        <h4 style="margin-top:1rem;">Top 10 clientes</h4>
        <table class="tabla-ios">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Pedidos</th>
              <th>Total gastado</th>
            </tr>
          </thead>
          <tbody id="tablaTopClientes"></tbody>
        </table>
      </div>
    `;
// === Tabla top 10 (filtrada por rango de fechas) ===

// ✅ Paso 1: tomar los datos filtrados según rango activo
let dataFiltrada = filtrados;

// ✅ Paso 2: agrupar por cliente y sumar total gastado dentro del rango
const clientesMap = {};

dataFiltrada.forEach(c => {
  const nombre = c.nombre_cliente || "Sin nombre";
  if (!clientesMap[nombre]) {
    clientesMap[nombre] = {
      nombre,
      email: c.email || "-",
      ciudad: c.ciudad || "-",
      pedidos: 0,
      total: 0
    };
  }

  clientesMap[nombre].pedidos += parseInt(c.cantidad_pedidos || 0);
  clientesMap[nombre].total += parseFloat(c.total_gastado || 0);
});

// ✅ Paso 3: convertir a array y ordenar por total gastado
const top = Object.values(clientesMap)
  .filter(c => c.total > 0)
  .sort((a, b) => b.total - a.total)
  .slice(0, 10);

// ✅ Paso 4: renderizar tabla
document.getElementById("tablaTopClientes").innerHTML =
  top.length > 0
    ? top
        .map(
          (c, i) => `
          <tr>
            <td><strong>${i + 1}.</strong> ${c.nombre}</td>
            <td>${c.email}</td>
            <td>${c.pedidos}</td>
<td>$${c.total.toLocaleString('es-CL')}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="text-center text-muted">⚠️ No se encontraron clientas con compras en el rango seleccionado.</td></tr>`;

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

// === Interacción JS (activar al hacer clic) ===
document.querySelectorAll(".card-metrica").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".card-metrica").forEach(c => c.classList.remove("active"));
    card.classList.add("active");
  });
});