function agruparVentasPorPedido(data) {
  const mapa = {};

  data.forEach(v => {
    const id = v["ID del pedido"];
    if (!id) return;

    if (!mapa[id]) {
      mapa[id] = {
        total: parseFloat(v["Total"] || 0),
        fecha: v.fecha,
        productos: []
      };
    }

    mapa[id].productos.push({
      sku: v.sku,
      producto: v.producto,
      cantidad: v.cantidad,
      categorias: v.categorias
    });
  });

  return Object.values(mapa);
}


// ===============================================================
// 📌 DASHBOARD DE CAMPAÑAS — versión completa y funcional
// ===============================================================

// Utilidad para limpiar gráficos anteriores
function limpiarDiv(id) {
  const el = document.querySelector(id);
  if (el) el.innerHTML = "";
}

// ===============================================================
// 📌 1. SELECTOR DE CAMPAÑAS
// ===============================================================
async function cargarSelectorCampanas() {
  try {
    const urlCampanas = localStorage.getItem("csv_campanas");
    if (!urlCampanas) return;

    const txt = await fetch(urlCampanas).then(r => r.text());
    const raw = Papa.parse(txt, { header: true, skipEmptyLines: true }).data;

    const select = document.getElementById("selectCampanas");
    select.innerHTML = `<option value="">Todas las campañas</option>`;

    raw.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.nombre} (${c.fecha_inicio} → ${c.fecha_fin})`;
      select.appendChild(opt);
    });

    // Restaurar selección
    const last = localStorage.getItem("campana_activa");
    if (last) select.value = last;

    select.addEventListener("change", () => {
      const val = select.value;
      localStorage.setItem("campana_activa", val);
      cargarDashboardCampanas();
    });

  } catch (err) {
    console.error("❌ Error cargando selector campañas:", err);
  }
}

window.cargarSelectorCampanas = cargarSelectorCampanas;



// ===============================================================
// 📌 2. DASHBOARD PRINCIPAL DE CAMPAÑAS
// ===============================================================
async function cargarDashboardCampanas() {
  try {
    const url = localStorage.getItem("csv_campanas");
    const urlVentas = localStorage.getItem("csv_ventas");

    if (!url || !urlVentas) {
      document.getElementById("bloqueCampanasActivas").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ Faltan enlaces CSV para cargar campañas o ventas.</p>
        </div>`;
      return;
    }

    // ==== Cargar campañas ====
    const respCamp = await fetch(url);
    const textCamp = await respCamp.text();
    const campanas = Papa.parse(textCamp, { header: true, skipEmptyLines: true }).data;

    // ==== Cargar ventas ====
    const respVen = await fetch(urlVentas);
    const textVen = await respVen.text();
    const ventas = Papa.parse(textVen, { header: true, skipEmptyLines: true }).data;

    // Detectar rango padre
    const inicio = rangoPrincipal?.[0];
    const fin = rangoPrincipal?.[1];

    // ==== Filtrar campañas activas ====
    function parseFecha(str) {
      if (!str) return null;
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    }

    const activas = campanas.filter(c => {
      const fi = parseFecha(c.fecha_inicio);
      const ff = parseFecha(c.fecha_fin);
      if (!fi || !ff) return false;

      // Si hay selección global → filtrar
      if (inicio && fin) {
        return ff >= inicio && fi <= fin;
      }

      return true;
    });

    // ==== Renderizar lista de campañas ====
    const cont = document.getElementById("bloqueCampanasActivas");

    if (activas.length === 0) {
      cont.innerHTML = `
        <div class="ios-card" style="grid-column: 1 / -1;">
          <h4>Campañas activas en este período</h4>
          <p class="muted">No hay campañas en el rango seleccionado.</p>
        </div>`;
      return;
    }

    const items = activas
      .map(c => {
        return `<li>${c.nombre} (${c.fecha_inicio} → ${c.fecha_fin})</li>`;
      })
      .join("");

    cont.innerHTML = `
      <div class="ios-card" style="grid-column: 1 / -1;">
        <h4>Campañas activas en este período</h4>
        <ul>${items}</ul>
      </div>
    `;

  } catch (err) {
    console.error("❌ Error campañas:", err);
    document.getElementById("bloqueCampanasActivas").innerHTML = `
      <div class="ios-card">
        <p class="text-danger">Error cargando campañas: ${err.message}</p>
      </div>`;
  }
}


window.cargarDashboardCampanas = cargarDashboardCampanas;



// ===============================================================
// 📌 3. GRÁFICOS (ApexCharts)
// ===============================================================

function formatoCL(valor) {
  return Number(valor).toLocaleString("es-CL");
}


function generarGraficoDias(data) {
  limpiarDiv("#graficoDiasCampana");

  // ✔ AGRUPAR POR PEDIDO REAL
  const pedidos = agruparVentasPorPedido(data);

  const porDia = {};
  pedidos.forEach(p => {
    if (!p.fecha) return;
    if (!porDia[p.fecha]) porDia[p.fecha] = 0;
    porDia[p.fecha] += p.total;
  });

  const fechas = Object.keys(porDia).sort();
  const valores = fechas.map(f => porDia[f]);

  new ApexCharts(document.querySelector("#graficoDiasCampana"), {
    chart: { type: "line", height: 300 },
    series: [{ name: "Revenue", data: valores }],
    xaxis: { categories: fechas },
    yaxis: {
      labels: { formatter: v => formatoCL(v) }
    },
    tooltip: {
      y: { formatter: v => "$" + formatoCL(v) }
    },
    stroke: { curve: "smooth", width: 3 }
  }).render();
}

function generarGraficoHistorico(data) {
  limpiarDiv("#graficoHistoricoCampana");

  // ✔ AGRUPAR POR PEDIDO REAL
  const pedidos = agruparVentasPorPedido(data);

  const porDia = {};
  pedidos.forEach(p => {
    if (!p.fecha) return;
    if (!porDia[p.fecha]) porDia[p.fecha] = 0;
    porDia[p.fecha] += p.total;
  });

  const fechas = Object.keys(porDia).sort();

  let acumulado = 0;
  const valores = fechas.map(f => (acumulado += porDia[f]));

  new ApexCharts(document.querySelector("#graficoHistoricoCampana"), {
    chart: { type: "area", height: 300 },
    series: [{ name: "Revenue acumulado", data: valores }],
    xaxis: { categories: fechas },
    yaxis: {
      labels: { formatter: v => formatoCL(v) }
    },
    tooltip: {
      y: { formatter: v => "$" + formatoCL(v) }
    },
    stroke: { curve: "smooth" },
    fill: { opacity: 0.3 }
  }).render();
}

function generarGraficoSubcategorias(data) {
  limpiarDiv("#graficoSubcategoriasCampana");

  // ✔ AGRUPAR POR PEDIDO REAL
  const pedidos = agruparVentasPorPedido(data);

  const mapa = {};

  pedidos.forEach(p => {
    const totalCant = p.productos.reduce((a, b) => a + b.cantidad, 0) || 1;

    p.productos.forEach(prod => {
      const cats = prod.categorias.split(" ");

      cats.forEach(c => {
        if (!c) return;
        if (!mapa[c]) mapa[c] = 0;

        const proporcion = prod.cantidad / totalCant;
        mapa[c] += p.total * proporcion;
      });
    });
  });

  const labels = Object.keys(mapa);
  const valores = labels.map(l => mapa[l]);

  new ApexCharts(document.querySelector("#graficoSubcategoriasCampana"), {
    chart: { type: "donut", height: 300 },
    labels,
    series: valores,
    tooltip: {
      y: { formatter: v => "$" + formatoCL(v) }
    },
    dataLabels: {
      formatter: (val, opts) =>
        formatoCL(opts.w.config.series[opts.seriesIndex])
    }
  }).render();
}

function generarGraficoProductos(data) {
  limpiarDiv("#graficoProductosCampana");

  // ✔ AGRUPAR POR PEDIDO REAL
  const pedidos = agruparVentasPorPedido(data);

  const mapa = {};

  pedidos.forEach(p => {
    const totalCant = p.productos.reduce((a, b) => a + b.cantidad, 0) || 1;

    p.productos.forEach(prod => {
      if (!prod.producto) return;

      if (!mapa[prod.producto]) mapa[prod.producto] = 0;

      const proporcion = prod.cantidad / totalCant;
      mapa[prod.producto] += p.total * proporcion;
    });
  });

  const top = Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = top.map(t => t[0]);
  const valores = top.map(t => t[1]);

  new ApexCharts(document.querySelector("#graficoProductosCampana"), {
    chart: { type: "bar", height: 300 },
    series: [{ name: "Revenue", data: valores }],
    xaxis: {
      categories: labels,
      labels: { formatter: v => formatoCL(v) }
    },
    yaxis: {
      labels: { formatter: v => formatoCL(v) }
    },
    tooltip: {
      y: { formatter: v => "$" + formatoCL(v) }
    },
    plotOptions: { bar: { horizontal: true } }
  }).render();
}

