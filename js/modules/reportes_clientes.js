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
  btn.addEventListener("click", async () => {

    const dias = parseInt(btn.dataset.range);
    const tipo = btn.dataset.type;
    const hoy = new Date();

    let inicio = null;
    let fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()); // sin hora

    // ✔ 1) Rangos por días (7, 30, 365)
    if (!isNaN(dias)) {
      inicio = new Date();
      inicio.setDate(fin.getDate() - dias);
      inicio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    }

    // ✔ 2) Esta semana
    else if (tipo === "semana") {
      const diaSemana = hoy.getDay(); // 1=Lunes, 0=Domingo
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
      inicio = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate());
    }

    // ✔ 3) Mes actual
    else if (tipo === "mes") {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    }

    // ✔ 4) Mismo mes del año pasado
    else if (tipo === "mes_pasado") {
      const fy = hoy.getFullYear() - 1;
      const fm = hoy.getMonth();
      inicio = new Date(fy, fm, 1);
      fin = new Date(fy, fm + 1, 0);
    }

    if (!inicio) return;

    // Establecer rango global sin hora
    rangoPrincipal = [
      new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()),
      new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
    ];

    // Mostrar texto limpio
    const iniTxt = rangoPrincipal[0].toISOString().slice(0, 10);
    const finTxt = rangoPrincipal[1].toISOString().slice(0, 10);
    textoRango.textContent = `${iniTxt} – ${finTxt}`;

// Aplicar filtro al dashboard activo
const activo = localStorage.getItem("tab_activo_reportes");

if (activo === "clientes") {
  await cargarDashboardClientes();
}
else if (activo === "geografia") {
  await cargarDashboardGeografia();
}
else if (activo === "ventas") {
  await cargarDashboardVentas();
}
else if (activo === "categorias") {
  await cargarDashboardCategorias?.();
}
else if (activo === "tendencias") {
  await cargarDashboardTendencias?.();
}
else if (activo === "general") {
  await cargarDashboardGeneral?.();
}


    // Cerrar menú
    dropdownFechas.classList.remove("show");
    btnRangoFechas.classList.remove("open");
  });
});


aplicarFechas.addEventListener("click", async () => {
  if (rangoPrincipal && rangoPrincipal.length === 2) {
    const [inicio, fin] = rangoPrincipal;
    const opciones = { day: "numeric", month: "short" };
    textoRango.textContent =
      `${inicio.toLocaleDateString("es-ES", opciones)} – ${fin.toLocaleDateString("es-ES", opciones)}`;

// 🔁 Recargar dashboard según el tab activo
console.log("📅 Nuevo rango aplicado:", inicio, "→", fin);

const activo = localStorage.getItem("tab_activo_reportes");

if (activo === "clientes") {
  await cargarDashboardClientes();
}
else if (activo === "geografia") {
  await cargarDashboardGeografia();
}
else if (activo === "ventas") {
  await cargarDashboardVentas();
}
else if (activo === "categorias") {
  await cargarDashboardCategorias?.();
}
else if (activo === "tendencias") {
  await cargarDashboardTendencias?.();
}
else if (activo === "general") {
  await cargarDashboardGeneral?.();
}


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
    alert("Por favor, pega un enlace válido.");
    return;
  }

  // Detectar ID del archivo
  const match = url.match(/[-\w]{25,}/);
  if (!match) {
    alert("⚠️ No se pudo detectar el ID del archivo.");
    return;
  }

  const fileId = match[0];
  let finalURL = "";

  // === Caso Google Sheets (edit/view → export CSV)
  if (url.includes("docs.google.com/spreadsheets")) {
    finalURL = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
  }

  // === Caso Google Drive directo
  else if (url.includes("drive.google.com")) {
    finalURL = `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  // === Otros casos
  else {
    finalURL = url;
  }

  // Guardar la URL final ya lista para fetch()
  localStorage.setItem("csv_ventas", finalURL);

  if (statusDrive) statusDrive.textContent = "✅ Enlace convertido y guardado.";
  alert("✅ Enlace convertido exitosamente a formato CSV.");
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
  inicioRango = new Date(
    rangoPrincipal[0].getFullYear(),
    rangoPrincipal[0].getMonth(),
    rangoPrincipal[0].getDate()
  );

  finRango = new Date(
    rangoPrincipal[1].getFullYear(),
    rangoPrincipal[1].getMonth(),
    rangoPrincipal[1].getDate()
  );
}


// 🧩 Convertir string "YYYY-MM-DD HH:mm:ss" a Date sin hora
function parseFecha(str) {
  if (!str || typeof str !== "string") return null;

  const [fechaPart] = str.trim().split(" ");
  const [y, m, d] = fechaPart.split("-").map(Number);
  if (!y || !m || !d) return null;

  return new Date(y, m - 1, d);
}

// 🔍 Detectar fecha válida usando las 3 columnas
function obtenerFechaCampo(c) {
  const campos = ["fecha_registro", "primera_compra", "ultima_compra"];
  for (let campo of campos) {
    if (c[campo]) return c[campo];
  }
  return null;
}

// 🕓 Filtrar registros dentro del rango seleccionado
const filtrados = normalizado.filter(c => {
  const rawFecha = obtenerFechaCampo(c);
  const fecha = parseFecha(rawFecha);

  if (!fecha) return false;

  if (inicioRango && finRango) {
    return fecha >= inicioRango && fecha <= finRango;
  }

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
      <div class="card-metrica" data-tipo="nuevos">
        <strong style="font-size:2rem;">${clientesNuevos}</strong>
        <p>Nuevos clientes</p>
      </div>
      <div class="card-metrica" data-tipo="recurrentes">
        <strong style="font-size:2rem;">${recurrentes}</strong>
        <p>Recurrentes</p>
      </div>
      <div class="card-metrica" data-tipo="repeticion">
        <strong style="font-size:2rem;">${tasaRepeticion}%</strong>
        <p>Tasa de repetición</p>
      </div>
      <div class="card-metrica" data-tipo="ticket">
        <strong style="font-size:2rem;">$${Number(ticketPromedio).toLocaleString('es-CL')}</strong>
        <p>Ticket promedio</p>
      </div>
      <div class="card-metrica" data-tipo="tiempo">
        <strong style="font-size:2rem;">${tiempoProm}</strong>
        <p>Días hasta primera compra</p>
      </div>
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

// === Inyectar estilos dinámicamente ===
const estilo = document.createElement("style");
estilo.textContent = `
  .metricas-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  .card-metrica {
    background: #ededed;
    border-radius: 15px;
    padding: 1rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  .card-metrica.active {
    background: #000;
    color: #fff;
    transform: scale(1.03);
  }
`;
document.head.appendChild(estilo);

// === Interacción (clic para activar/desactivar) ===
document.querySelectorAll(".card-metrica").forEach(card => {
  card.addEventListener("click", () => {
    card.classList.toggle("active"); // ✅ activa o desactiva individualmente
  });
});

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

    const section = btn.getAttribute("data-section");
    localStorage.setItem("tab_activo_reportes", section);

    // Activar tab seleccionado
    document.querySelectorAll(".tab-reportes").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const main = document.getElementById("contenidoReportesMain");
    const seccionConfig = document.getElementById("seccion-configuracion");
    const campanasPanel = document.getElementById("tab-campanas");

    // 🔥 SIEMPRE ocultar campañas al cambiar de tab
    campanasPanel.style.display = "none";

    // ================================
    // 🔧 TAB CONFIGURACIÓN
    // ================================
    if (section === "config") {
      main.style.display = "none";
      seccionConfig.style.display = "block";
      return; // ⛔ detener ejecución
    }

    // ================================
    // 🔧 Cualquier otro tab (NO config)
    // ================================
    seccionConfig.style.display = "none";
    main.style.display = "block";

    // Mensaje de carga
    main.innerHTML = `<div class="ios-card"><p class="muted">Cargando ${section}...</p></div>`;

    // ================================
    // 🔥 CONTROL DE TABS INDIVIDUALES
    // ================================
    if (section === "clientes") {
      await cargarDashboardClientes();
    }
    else if (section === "ventas") {
      await cargarDashboardVentas();
    }
    else if (section === "categorias") {
      main.innerHTML = `<div class="ios-card"><p class="muted">🏷️ Reporte de Categorías aún no disponible.</p></div>`;
    }
    else if (section === "geografia") {
      await cargarDashboardGeografia();
    }
    else if (section === "tendencias") {
      main.innerHTML = `<div class="ios-card"><p class="muted">📈 Reporte de tendencias en desarrollo.</p></div>`;
    }

    // ================================
    // 🎯 TAB CAMPAÑAS
    // ================================
else if (section === "campanas") {

  // Ocultar contenido principal
  main.style.display = "none";

  // Mostrar el contenedor de campañas
  campanasPanel.style.display = "block";

  // 1️⃣ Cargar select de campañas
  if (typeof cargarSelectorCampanas === "function") {
    await cargarSelectorCampanas();
  } else {
    console.warn("⚠️ Falta cargar función cargarSelectorCampanas");
  }

  // 2️⃣ Cargar dashboard (revenue, kpIs, gráficos, tabla…)
  if (typeof cargarDashboardCampanas === "function") {
    await cargarDashboardCampanas();
  } else {
    console.warn("⚠️ Falta cargar función cargarDashboardCampanas");
  }
}


    // ================================
    // 📊 GENERAL
    // ================================
    else if (section === "general") {
      main.innerHTML = `<div class="ios-card"><p class="muted">📊 Resumen general en desarrollo.</p></div>`;
    }

  });
});


  // === Seleccionar pestaña inicial ===
// === Restaurar último tab activo ===
const lastTab = localStorage.getItem("tab_activo_reportes");
const tabToOpen = document.querySelector(`.tab-reportes[data-section="${lastTab}"]`)
  || document.querySelector('.tab-reportes[data-section="general"]');

if (tabToOpen) tabToOpen.click();

});

// === CONFIGURADOR MINIMALISTA DE ENLACES CSV ===
const enlaces = [
  { id: "Clientes", key: "csv_clientes" },
  { id: "Ventas", key: "csv_ventas" },
  { id: "Pedidos", key: "csv_pedidos" },
    { id: "Campanas", key: "csv_campanas" }
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

