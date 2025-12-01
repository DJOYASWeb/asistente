// ==============================
// 1. Determinar campaña seleccionada
// ==============================
const idCampana = document.getElementById("selectCampanas").value;
const campanaSeleccionada = campanas.find(c => c.id == idCampana);

// ==============================
// 2. Decidir modo:
//    A) Campaña seleccionada (modo estricto)
//    B) Sin campaña seleccionada (usar rango padre)
// ==============================

let filtradas = [];

if (campanaSeleccionada) {
  console.log("📌 Modo campaña estricta:", campanaSeleccionada.nombre);

  // Aplicar filtro SOLO por campaña
  filtradas = ventas.filter(v => {
    const cats = v.categorias;

    return (
      (campanaSeleccionada.cat && cats.includes(campanaSeleccionada.cat)) ||
      (campanaSeleccionada.subcat && cats.includes(campanaSeleccionada.subcat)) ||
      campanaSeleccionada.etiquetas.some(e => e && cats.includes(e))
    );
  });

  // Filtrar por fecha propia de campaña
  filtradas = filtradas.filter(v => {
    if (!v.fecha) return false;

    const f = new Date(v.fecha);
    const ini = new Date(campanaSeleccionada.inicio);
    const fin = new Date(campanaSeleccionada.fin);

    return f >= ini && f <= fin;
  });

} else {
  console.log("📌 Modo rango padre / sin campaña seleccionada");

  // 1) Obtener campañas activas en el rango padre
  if (Array.isArray(rangoPrincipal) && rangoPrincipal.length === 2) {
    const [ini, fin] = rangoPrincipal;
    const campañasActivas = campanas.filter(c => {
      const cIni = new Date(c.inicio);
      const cFin = new Date(c.fin);
      return cFin >= ini && cIni <= fin;
    });

    console.log("📌 Campañas activas:", campañasActivas);

    // 2) Mostrar solo campañas activas
    document.getElementById("campanasKPIs").innerHTML = `
      <div class="ios-card">
        <h3>Campañas activas en el período</h3>
        <ul>
          ${campañasActivas.map(c => `<li>${c.nombre}</li>`).join("")}
        </ul>
      </div>
    `;

    // 3) No cruzar ventas todavía si no hay campaña seleccionada
    return;
  }
}


// ===========================================================
// 📌 CARGAR SELECTOR DE CAMPAÑAS DESDE CSV
// ===========================================================
async function cargarSelectorCampanas() {
  try {
    const urlCampanas = localStorage.getItem("csv_campanas");
    if (!urlCampanas) {
      console.warn("⚠️ No hay CSV de campañas configurado.");
      return;
    }

    const txt = await fetch(urlCampanas).then(r => r.text());
    const raw = Papa.parse(txt, { header: true, skipEmptyLines: true }).data;

    const select = document.getElementById("selectCampanas");
    select.innerHTML = ""; // limpiar options

    // Crear opciones
    raw.forEach(c => {
      const opcion = document.createElement("option");
      opcion.value = c.id;

      const inicio = c.fecha_inicio || "-";
      const fin = c.fecha_fin || "-";

      opcion.textContent = `${c.nombre} (${inicio} → ${fin})`;

      select.appendChild(opcion);
    });

    // Restaurar última campaña seleccionada
    const last = localStorage.getItem("campana_activa");
    if (last) select.value = last;

    // Cuando cambia, actualizar dashboard
    select.addEventListener("change", () => {
      const id = select.value;
      localStorage.setItem("campana_activa", id);
      cargarDashboardCampanas();
    });

  } catch (err) {
    console.error("❌ Error cargando selector de campañas:", err);
  }
}

// Exponer global
window.cargarSelectorCampanas = cargarSelectorCampanas;


async function cargarDashboardCampanas() {
  try {

    // ===========================
    // 1) Cargar CSV campañas
    // ===========================
    const urlCampanas = localStorage.getItem("csv_campanas");
    const txtCampanas = await fetch(urlCampanas).then(r => r.text());
    const campanasRaw = Papa.parse(txtCampanas, { header: true, skipEmptyLines: true }).data;

    const campanas = campanasRaw.map(c => ({
      id: c.id,
      nombre: c.nombre,
      cat: (c.categoria_principal || "").toLowerCase(),
      subcat: (c.subcategoria || "").toLowerCase(),
      etiquetas: (c.etiquetas || "").toLowerCase().split(",").map(e => e.trim()),
      inicio: c.fecha_inicio,
      fin: c.fecha_fin,
      notas: c.notas
    }));


    // ===========================
    // 2) Cargar CSV ventas OG
    // ===========================
    const urlVentas = localStorage.getItem("csv_ventas");
    const txtVentas = await fetch(urlVentas).then(r => r.text());
    const ventasRaw = Papa.parse(txtVentas, { header: true, skipEmptyLines: true }).data;

    // Normalizar ventas
    const ventas = ventasRaw.map(v => ({
      fecha: v["Fecha y hora"]?.split(" ")[0],  // "2024-01-01"
      total: parseFloat(v["Total"] || 0),
      cantidad: parseInt(v["Cantidad de productos"] || 0),
      sku: v["SKU"] || "",
      producto: v["Nombre del producto"] || "",
      categorias: (v["Categorías."] || "").toLowerCase()
    }));


    // ===========================
    // 3) Detectar campaña seleccionada
    // ===========================
    const idSeleccionado = document.getElementById("selectCampanas").value;
    const campana = campanas.find(c => c.id == idSeleccionado);

    if (!campana) {
      document.getElementById("campanasKPIs").innerHTML = `
        <div class="ios-card"><p class="muted">Selecciona una campaña.</p></div>`;
      return;
    }


    // ===========================
    // 4) Filtrar ventas por campaña
    // ===========================
    const matchCampana = venta => {
      const cat = venta.categorias;

      return (
        (campana.cat && cat.includes(campana.cat)) ||
        (campana.subcat && cat.includes(campana.subcat)) ||
        campana.etiquetas.some(e => e && cat.includes(e))
      );
    };

    let filtradas = ventas.filter(matchCampana);


    // ===========================
    // 5) Filtrar por rango de fechas (global)
    // ===========================
    if (Array.isArray(rangoPrincipal) && rangoPrincipal.length === 2) {
      const [ini, fin] = rangoPrincipal.map(d =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate())
      );

      filtradas = filtradas.filter(v => {
        if (!v.fecha) return false;
        const f = new Date(v.fecha);
        return f >= ini && f <= fin;
      });
    }


    // ===========================
    // 6) MÉTRICAS
    // ===========================
    const totalRevenue = filtradas.reduce((s, v) => s + v.total, 0);
    const totalCantidad = filtradas.reduce((s, v) => s + v.cantidad, 0);
    const totalProductos = new Set(filtradas.map(v => v.sku)).size;


    document.getElementById("campanasKPIs").innerHTML = `
      <div class="metricas-grid">
        <div class="card-metrica">
          <strong style="font-size:2rem;">${totalProductos}</strong>
          <p>SKUs vendidos</p>
        </div>
        <div class="card-metrica">
          <strong style="font-size:2rem;">${totalCantidad}</strong>
          <p>Unidades</p>
        </div>
        <div class="card-metrica">
          <strong style="font-size:2rem;">$${totalRevenue.toLocaleString("es-CL")}</strong>
          <p>Revenue total</p>
        </div>
      </div>
    `;


    // ===========================
    // 7) Gráficos
    // ===========================
    generarGraficoDias(filtradas);
    generarGraficoHistorico(filtradas);
    generarGraficoSubcategorias(filtradas);
    generarGraficoProductos(filtradas);


    // ===========================
    // 8) Tabla detalle
    // ===========================
    const tbody = document.querySelector("#tablaDetalleCampana tbody");
    tbody.innerHTML = filtradas.map(v => `
      <tr>
        <td>${v.sku}</td>
        <td>${v.producto}</td>
        <td>${v.cantidad}</td>
        <td>$${v.total.toLocaleString("es-CL")}</td>
        <td>${campana.cat}</td>
        <td>${campana.subcat}</td>
        <td>${campana.etiquetas.join(", ")}</td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("❌ Error campañas:", err);
  }
}

// Exponer función global
window.cargarDashboardCampanas = cargarDashboardCampanas;

function limpiarDiv(id) {
  const el = document.querySelector(id);
  if (el) el.innerHTML = "";
}


function generarGraficoDias(data) {
  const porDia = {};

  data.forEach(v => {
    if (!v.fecha) return;
    if (!porDia[v.fecha]) porDia[v.fecha] = 0;
    porDia[v.fecha] += v.total;
  });

  const fechas = Object.keys(porDia).sort();
  const valores = fechas.map(f => porDia[f]);

  new ApexCharts(
    document.querySelector("#graficoDiasCampana"),
    {
      chart: { type: "line", height: 300 },
      series: [{ name: "Revenue", data: valores }],
      xaxis: { categories: fechas },
      stroke: { curve: "smooth", width: 3 },
      yaxis: { labels: { formatter: v => "$" + v.toLocaleString("es-CL") } }
    }
  ).render();
}

function generarGraficoHistorico(data) {
  const porDia = {};

  data.forEach(v => {
    if (!v.fecha) return;
    if (!porDia[v.fecha]) porDia[v.fecha] = 0;
    porDia[v.fecha] += v.total;
  });

  const fechas = Object.keys(porDia).sort();

  let acumulado = 0;
  const valores = fechas.map(f => {
    acumulado += porDia[f];
    return acumulado;
  });

  new ApexCharts(
    document.querySelector("#graficoHistoricoCampana"),
    {
      chart: { type: "area", height: 300 },
      series: [{ name: "Revenue acumulado", data: valores }],
      xaxis: { categories: fechas },
      stroke: { curve: "smooth" },
      fill: { opacity: 0.3 },
      yaxis: { labels: { formatter: v => "$" + v.toLocaleString("es-CL") } }
    }
  ).render();
}


function generarGraficoSubcategorias(data) {
  const mapa = {};

  data.forEach(v => {
    const cats = v.categorias.split(" ");
    cats.forEach(c => {
      if (!c) return;
      if (!mapa[c]) mapa[c] = 0;
      mapa[c] += v.total;
    });
  });

  const labels = Object.keys(mapa);
  const valores = labels.map(l => mapa[l]);

  new ApexCharts(
    document.querySelector("#graficoSubcategoriasCampana"),
    {
      chart: { type: "donut", height: 300 },
      labels,
      series: valores,
      legend: { position: "bottom" }
    }
  ).render();
}


function generarGraficoProductos(data) {
  const mapa = {};

  data.forEach(v => {
    if (!v.producto) return;
    if (!mapa[v.producto]) mapa[v.producto] = 0;
    mapa[v.producto] += v.total;
  });

  const top = Object.entries(mapa)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10);

  const labels = top.map(t => t[0]);
  const valores = top.map(t => t[1]);

  new ApexCharts(
    document.querySelector("#graficoProductosCampana"),
    {
      chart: { type: "bar", height: 300 },
      series: [{ name: "Revenue", data: valores }],
      xaxis: { categories: labels },
      plotOptions: {
        bar: { horizontal: true }
      },
      dataLabels: { enabled: false }
    }
  ).render();
}


