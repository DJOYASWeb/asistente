// =============================================================
// 📊 DASHBOARD DE CAMPAÑAS — LEE CSV + FILTRA POR FECHAS
// =============================================================
async function cargarDashboardCampanas() {
  try {
    // 1. Obtener URL guardada
    const saved = localStorage.getItem("csv_campanas");

    if (!saved) {
      document.getElementById("campanasKPIs").innerHTML = `
        <div class="ios-card">
          <p class="muted">⚠️ No hay enlace CSV configurado para Campañas.</p>
        </div>`;
      return;
    }

    // 2. Cargar archivo CSV
    const response = await fetch(saved);
    if (!response.ok) throw new Error("No se pudo cargar el CSV de campañas.");

    const text = await response.text();
    let data = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

    // 3. Normalizar claves
    data = data.map(row => {
      const limpio = {};
      for (let k of Object.keys(row)) {
        limpio[k.trim().toLowerCase().replace(/\s+/g, "_")] = row[k];
      }
      return limpio;
    });

    // ---------------------------------
    // 4. Filtrar por rango principal
    // ---------------------------------
    const inicio = rangoPrincipal?.[0] || null;
    const fin = rangoPrincipal?.[1] || null;

    function parseFecha(str) {
      if (!str) return null;
      const [f] = str.split(" ");
      const [y,m,d] = f.split("-").map(Number);
      return new Date(y, m-1, d);
    }

    const filtrados = data.filter(c => {
      if (!c.fecha) return false;
      const f = parseFecha(c.fecha);
      if (!inicio || !fin) return true;
      return f >= inicio && f <= fin;
    });

    console.log("📊 Campañas filtradas:", filtrados.length);

    // ---------------------------------
    // 5. Métricas principales
    // ---------------------------------
    const totalVentas = filtrados.reduce((a,c) => a + (parseFloat(c.revenue)||0), 0);
    const totalSkus = filtrados.length;
    const totalCantidad = filtrados.reduce((a,c) => a + (parseInt(c.cantidad)||0), 0);

    // ---------------------------------
    // 6. Render métricas principales
    // ---------------------------------
    document.getElementById("campanasKPIs").innerHTML = `
      <div class="ios-card">
        <div class="metricas-grid">

          <div class="card-metrica">
            <strong style="font-size:2rem;">${totalSkus}</strong>
            <p>SKUs vendidos</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">${totalCantidad}</strong>
            <p>Cantidad total</p>
          </div>

          <div class="card-metrica">
            <strong style="font-size:2rem;">$${totalVentas.toLocaleString("es-CL")}</strong>
            <p>Revenue total</p>
          </div>

        </div>
      </div>
    `;

    // ---------------------------------
    // 7. Gráficos
    // ---------------------------------
    generarGraficoDias(filtrados);
    generarGraficoHistorico(filtrados);
    generarGraficoSubcategorias(filtrados);
    generarGraficoProductos(filtrados);

    // ---------------------------------
    // 8. Tabla detalle
    // ---------------------------------
    const tbody = document.querySelector("#tablaDetalleCampana tbody");

    tbody.innerHTML = filtrados.map(c => `
      <tr>
        <td>${c.sku}</td>
        <td>${c.producto}</td>
        <td>${c.cantidad}</td>
        <td>$${Number(c.revenue).toLocaleString("es-CL")}</td>
        <td>${c.categoria || "-"}</td>
        <td>${c.subcategoria || "-"}</td>
        <td>${c.etiquetas || "-"}</td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("❌ Error cargando campañas:", err);
    document.getElementById("campanasKPIs").innerHTML = `
      <div class="ios-card">
        <p class="text-danger">❌ Error: ${err.message}</p>
      </div>`;
  }
}

function generarGraficoDias(data) {
  const dias = {};

  data.forEach(c => {
    const d = c.fecha?.split(" ")[0];
    if (!d) return;
    if (!dias[d]) dias[d] = 0;
    dias[d] += parseFloat(c.revenue || 0);
  });

  const fechas = Object.keys(dias).sort();
  const valores = fechas.map(f => dias[f]);

  const chart = new ApexCharts(document.querySelector("#graficoDiasCampana"), {
    chart: { type: "line", height: 300 },
    series: [{ name: "Revenue", data: valores }],
    xaxis: { categories: fechas },
    stroke: { curve: "smooth", width: 3 },
    yaxis: { labels: { formatter: v => "$" + v.toLocaleString("es-CL") } }
  });

  chart.render();
}

function generarGraficoHistorico(data) {
  const dias = {};

  data.forEach(c => {
    const d = c.fecha?.split(" ")[0];
    if (!d) return;
    if (!dias[d]) dias[d] = 0;
    dias[d] += parseFloat(c.revenue || 0);
  });

  const fechas = Object.keys(dias).sort();

  let acumulado = 0;
  const valores = fechas.map(f => {
    acumulado += dias[f];
    return acumulado;
  });

  const chart = new ApexCharts(document.querySelector("#graficoHistoricoCampana"), {
    chart: { type: "area", height: 300 },
    series: [{ name: "Revenue Acumulado", data: valores }],
    xaxis: { categories: fechas },
    stroke: { curve: "smooth" },
    yaxis: { labels: { formatter: v => "$" + v.toLocaleString("es-CL") } },
    fill: { opacity: 0.3 }
  });

  chart.render();
}

function generarGraficoSubcategorias(data) {
  const mapa = {};

  data.forEach(c => {
    const s = c.subcategoria || "Sin Subcategoría";
    const rev = parseFloat(c.revenue || 0);
    if (!mapa[s]) mapa[s] = 0;
    mapa[s] += rev;
  });

  const labels = Object.keys(mapa);
  const valores = labels.map(l => mapa[l]);

  const chart = new ApexCharts(document.querySelector("#graficoSubcategoriasCampana"), {
    chart: { type: "donut", height: 300 },
    labels,
    series: valores,
    legend: { position: "bottom" }
  });

  chart.render();
}


function generarGraficoProductos(data) {
  const mapa = {};

  data.forEach(c => {
    const p = c.producto || "Sin nombre";
    if (!mapa[p]) mapa[p] = 0;
    mapa[p] += parseFloat(c.revenue || 0);
  });

  const top = Object.entries(mapa)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10);

  const labels = top.map(t => t[0]);
  const valores = top.map(t => t[1]);

  const chart = new ApexCharts(document.querySelector("#graficoProductosCampana"), {
    chart: { type: "bar", height: 300 },
    series: [{ name: "Revenue", data: valores }],
    xaxis: { categories: labels },
    plotOptions: {
      bar: { horizontal: true }
    },
    dataLabels: { enabled: false },
    yaxis: { labels: { style: { fontSize: "13px" } } }
  });

  chart.render();
}



window.cargarDashboardCampanas = cargarDashboardCampanas;
